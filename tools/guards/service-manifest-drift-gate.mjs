import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fail, read, repoRoot, toPosix } from "./_guard-utils.mjs";
import { parseOpenApiContract } from "./_openapi-utils.mjs";
import { dshContractRegistrations } from "../scripts/contract-client-metadata.mjs";

const guardId = "service-manifest-drift-gate";
const violations = [];
const serviceRoot = "services/dsh";
const manifestFile = `${serviceRoot}/service.manifest.ts`;
const runtimeMapFile = `${serviceRoot}/runtime-map.ts`;
const registryFile = `${serviceRoot}/contracts/contract.manifest.yaml`;
const capabilityFiles = [`${serviceRoot}/capability-map.ts`];
const extensionFile = `${serviceRoot}/${["capability-map", "extensions.ts"].join(".")}`;
const manifest = read(manifestFile);
let registry = [];
try {
  registry = dshContractRegistrations();
} catch (error) {
  violations.push({ file: registryFile, message: `INVALID_DSH_CONTRACT_MANIFEST: ${error.message}` });
}

for (const [marker, message] of [
  ["capabilities: DSH_CAPABILITIES", "MANIFEST_CAPABILITY_DRIFT"],
  ["surfaces: DSH_SURFACE_MAP", "MANIFEST_SURFACE_DRIFT"],
]) {
  if (!manifest.includes(marker)) violations.push({ file: manifestFile, message });
}

for (const [pattern, message] of [
  [/currentTruth:\s*\{/, "MANIFEST_CURRENT_TRUTH_AUTHORITY_FORBIDDEN"],
  [/runtimeState:\s*["']/, "MANIFEST_TRANSIENT_EXECUTION_STATE_FORBIDDEN"],
  [/closureState:\s*["']/, "MANIFEST_TRANSIENT_CLOSURE_STATE_FORBIDDEN"],
  [/backendRuntimeReady:\s*true\b/, "MANIFEST_HARDCODED_BACKEND_RUNTIME_READY_FORBIDDEN"],
  [/databaseReady:\s*true\b/, "MANIFEST_HARDCODED_DATABASE_READY_FORBIDDEN"],
  [/generatedClientReady:\s*true\b/, "MANIFEST_HARDCODED_GENERATED_CLIENT_READY_FORBIDDEN"],
  [/screensReady:\s*true\b/, "MANIFEST_HARDCODED_SCREENS_READY_FORBIDDEN"],
]) {
  if (pattern.test(manifest)) violations.push({ file: manifestFile, message });
}

if (fs.existsSync(path.join(repoRoot, runtimeMapFile))) {
  violations.push({ file: runtimeMapFile, message: "SOURCE_CONTROLLED_RUNTIME_MAP_FORBIDDEN" });
}

const ids = new Set();
const paths = new Set();
for (const item of registry) {
  if (!item.id || !item.file || !item.strategy) {
    violations.push({ file: registryFile, message: "MALFORMED_CONTRACT_REGISTRATION" });
    continue;
  }
  if (ids.has(item.id)) violations.push({ file: registryFile, message: `DUPLICATE_CONTRACT_ID:${item.id}` });
  ids.add(item.id);
  const relative = item.file;
  if (paths.has(relative)) violations.push({ file: registryFile, message: `DUPLICATE_CONTRACT_PATH:${relative}` });
  paths.add(relative);
  if (!fs.existsSync(path.join(repoRoot, relative))) violations.push({ file: registryFile, message: `REGISTERED_CONTRACT_MISSING:${relative}` });
}

const contractsDir = path.join(repoRoot, serviceRoot, "contracts");
for (const name of fs.readdirSync(contractsDir).filter((entry) => entry.endsWith(".openapi.yaml"))) {
  const relative = toPosix(path.join(serviceRoot, "contracts", name));
  if (/x-bthwani-contract-state:\s*CONTRACT_ACTIVE\b/.test(read(relative)) && !paths.has(relative)) {
    violations.push({ file: relative, message: "ACTIVE_CONTRACT_NOT_REGISTERED" });
  }
}

const primaryItems = registry.filter((item) => item.strategy === "PRIMARY_GENERATED");
if (primaryItems.length !== 1) violations.push({ file: registryFile, message: `PRIMARY_CONTRACT_COUNT_INVALID:${primaryItems.length}` });
const primaryPath = primaryItems[0]?.file ?? "";
const primaryOps = primaryPath && fs.existsSync(path.join(repoRoot, primaryPath))
  ? parseOpenApiContract(primaryPath).map((operation) => operation.operationId).filter(Boolean)
  : [];
const primarySet = new Set(primaryOps);
const canonicalOps = new Set(primaryOps);
const generatedSubsetStrategies = new Set(["SECONDARY_GENERATED_SUBSET", "PARENT_GENERATED_SUBSET"]);
const generatedStrategies = new Set(["PRIMARY_GENERATED", "SECONDARY_GENERATED_SUBSET", "PARENT_GENERATED_SUBSET", "STANDALONE_GENERATED"]);
const manualStrategies = new Set(["MANUAL_TYPED_ADAPTER", "STANDALONE_MANUAL_TYPED_ADAPTER"]);

for (const item of registry) {
  const relative = item.file;
  if (!fs.existsSync(path.join(repoRoot, relative))) continue;
  const source = read(relative);
  const operations = parseOpenApiContract(relative).map((operation) => operation.operationId).filter(Boolean);
  if (!/x-bthwani-contract-state:\s*CONTRACT_ACTIVE\b/.test(source)) violations.push({ file: relative, message: "REGISTERED_ACTIVE_CONTRACT_METADATA_MISMATCH" });

  for (const operationId of operations) canonicalOps.add(operationId);

  if (generatedSubsetStrategies.has(item.strategy)) {
    for (const operationId of operations) {
      if (!primarySet.has(operationId)) violations.push({ file: relative, message: `GENERATED_CONTRACT_SHARD_OPERATION_NOT_IN_PRIMARY:${operationId}` });
    }
  }

  if (generatedStrategies.has(item.strategy)) {
    if (!item.generatedClient) {
      violations.push({ file: registryFile, message: `GENERATED_CLIENT_PATH_REQUIRED:${item.id}` });
    } else {
      const clientPath = item.generatedClient;
      if (!fs.existsSync(path.join(repoRoot, clientPath))) {
        violations.push({ file: registryFile, message: `GENERATED_CLIENT_MISSING:${clientPath}` });
      } else {
        const client = read(clientPath);
        for (const operationId of operations) {
          if (!client.includes(operationId)) violations.push({ file: clientPath, message: `GENERATED_CLIENT_OPERATION_MISSING:${operationId}` });
        }
      }
    }
  }

  if (manualStrategies.has(item.strategy)) {
    if (!item.adapterOwner) {
      violations.push({ file: registryFile, message: `MANUAL_ADAPTER_OWNER_REQUIRED:${item.id}` });
    } else if (!fs.existsSync(path.join(repoRoot, item.adapterOwner))) {
      violations.push({ file: registryFile, message: `MANUAL_ADAPTER_OWNER_MISSING:${item.adapterOwner}` });
    }
  }
}

function capabilities(file) {
  return (read(file).match(/\{\s*id:\s*"([^"]+)"[\s\S]*?contractOperations:\s*\[([\s\S]*?)\]/g) ?? []).map((block) => ({
    id: block.match(/id:\s*"([^"]+)"/)?.[1] ?? "",
    operations: [...(block.match(/contractOperations:\s*\[([\s\S]*?)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((match) => match[1]),
    file,
  }));
}

const base = capabilities(capabilityFiles[0]);

const owners = new Map();
for (const item of base) {
  if (!item.id) violations.push({ file: item.file, message: "CAPABILITY_ID_MISSING" });
  if (item.operations.length === 0) violations.push({ file: item.file, message: `EMPTY_CAPABILITY_OPERATION_SET:${item.id}` });
  const local = new Set();
  for (const operationId of item.operations) {
    if (local.has(operationId)) violations.push({ file: item.file, message: `DUPLICATE_CAPABILITY_OPERATION:${operationId}` });
    local.add(operationId);
    if (!canonicalOps.has(operationId)) violations.push({ file: item.file, message: `STALE_CAPABILITY_OPERATION:${operationId}` });
    if (!owners.has(operationId)) owners.set(operationId, new Set());
    owners.get(operationId).add(item.id);
  }
}
for (const [operationId, operationOwners] of owners) {
  if (operationOwners.size > 1) violations.push({ file: capabilityFiles.join(","), message: `DUPLICATE_OPERATION_OWNERSHIP:${operationId}` });
}

if (fs.existsSync(path.join(repoRoot, extensionFile))) {
  violations.push({ file: extensionFile, message: "DSH_CAPABILITY_EXTENSION_FILE_FORBIDDEN" });
}

const trackedFiles = execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => fs.existsSync(path.join(repoRoot, file)))
  .filter((file) => file !== "tools/guards/service-manifest-drift-gate.mjs");
for (const [marker, message] of [
  [["DSH_CAPABILITY_MAP_", "EXTENSIONS"].join(""), ["DSH_CAPABILITY_MAP_", "EXTENSIONS_FORBIDDEN"].join("")],
  [["DshCapability", "Extension"].join(""), "DSH_CAPABILITY_EXTENSION_TYPE_FORBIDDEN"],
]) {
  const matches = trackedFiles.filter((file) => read(file).includes(marker));
  if (matches.length) violations.push({ file: matches.join(","), message });
}

// The canonical DSH manifest is the contract inventory. The capability map is
// a curated business taxonomy and is therefore validated for non-empty,
// canonical, non-duplicated ownership without pretending to enumerate every
// endpoint in the primary generated contract. Runtime/evidence readiness is
// separately fail-closed above: historical reports cannot grant current PASS.
fail(guardId, violations);
