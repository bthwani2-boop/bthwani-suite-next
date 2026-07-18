import fs from "node:fs";
import path from "node:path";
import { fail, read, repoRoot, toPosix } from "./_guard-utils.mjs";
import { parseOpenApiContract } from "./_openapi-utils.mjs";

const guardId = "service-manifest-drift-gate";
const violations = [];
const serviceRoot = "services/dsh";
const manifestFile = `${serviceRoot}/service.manifest.ts`;
const registryFile = `${serviceRoot}/contracts/contract-registry.ts`;
const capabilityFiles = [`${serviceRoot}/capability-map.ts`, `${serviceRoot}/capability-map.extensions.ts`];
const manifest = read(manifestFile);
const registrySource = read(registryFile);

for (const [marker, message] of [
  ["capabilities: DSH_CAPABILITIES", "MANIFEST_CAPABILITY_DRIFT"],
  ["contracts: DSH_CONTRACT_REGISTRY.map", "MANIFEST_CONTRACT_DRIFT"],
  ["contractOperations: DSH_CONTRACT_OPERATIONS", "MANIFEST_OPERATION_DRIFT"],
]) {
  if (!manifest.includes(marker)) violations.push({ file: manifestFile, message });
}

function registrations(source) {
  return (source.match(/\{\s*id:\s*"[^"]+"[\s\S]*?\n\s*\}/g) ?? []).map((block) => ({
    id: block.match(/id:\s*"([^"]+)"/)?.[1] ?? "",
    path: block.match(/path:\s*"([^"]+)"/)?.[1] ?? "",
    state: block.match(/state:\s*"([^"]+)"/)?.[1] ?? "",
    strategy: block.match(/clientStrategy:\s*"([^"]+)"/)?.[1] ?? "",
    generatedClient: block.match(/generatedClient:\s*"([^"]+)"/)?.[1] ?? "",
    adapterOwner: block.match(/adapterOwner:\s*"([^"]+)"/)?.[1] ?? "",
  }));
}

const registry = registrations(registrySource);
const ids = new Set();
const paths = new Set();
for (const item of registry) {
  if (!item.id || !item.path || !item.strategy) {
    violations.push({ file: registryFile, message: "MALFORMED_CONTRACT_REGISTRATION" });
    continue;
  }
  if (ids.has(item.id)) violations.push({ file: registryFile, message: `DUPLICATE_CONTRACT_ID:${item.id}` });
  ids.add(item.id);
  const relative = toPosix(path.join(serviceRoot, item.path));
  if (paths.has(relative)) violations.push({ file: registryFile, message: `DUPLICATE_CONTRACT_PATH:${relative}` });
  paths.add(relative);
  if (!fs.existsSync(path.join(repoRoot, relative))) violations.push({ file: registryFile, message: `REGISTERED_CONTRACT_MISSING:${relative}` });
  if (item.state !== "CONTRACT_ACTIVE") violations.push({ file: registryFile, message: `NON_CANONICAL_CONTRACT_STATE:${item.state}` });
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
const primaryPath = primaryItems[0] ? toPosix(path.join(serviceRoot, primaryItems[0].path)) : "";
const primaryOps = primaryPath && fs.existsSync(path.join(repoRoot, primaryPath))
  ? parseOpenApiContract(primaryPath).map((operation) => operation.operationId).filter(Boolean)
  : [];
const primarySet = new Set(primaryOps);
const canonicalOps = new Set(primaryOps);
const subsetStrategies = new Set(["SECONDARY_GENERATED_SUBSET", "PARENT_GENERATED_SUBSET", "MANUAL_TYPED_ADAPTER"]);
const generatedStrategies = new Set(["PRIMARY_GENERATED", "SECONDARY_GENERATED_SUBSET", "PARENT_GENERATED_SUBSET"]);
const manualStrategies = new Set(["MANUAL_TYPED_ADAPTER", "STANDALONE_MANUAL_TYPED_ADAPTER"]);

for (const item of registry) {
  const relative = toPosix(path.join(serviceRoot, item.path));
  if (!fs.existsSync(path.join(repoRoot, relative))) continue;
  const source = read(relative);
  const operations = parseOpenApiContract(relative).map((operation) => operation.operationId).filter(Boolean);
  if (!/x-bthwani-contract-state:\s*CONTRACT_ACTIVE\b/.test(source)) violations.push({ file: relative, message: "REGISTERED_ACTIVE_CONTRACT_METADATA_MISMATCH" });

  if (subsetStrategies.has(item.strategy)) {
    for (const operationId of operations) if (!primarySet.has(operationId)) violations.push({ file: relative, message: `CONTRACT_SHARD_OPERATION_NOT_IN_PRIMARY:${operationId}` });
  }
  if (item.strategy === "STANDALONE_MANUAL_TYPED_ADAPTER") {
    for (const operationId of operations) {
      if (primarySet.has(operationId)) violations.push({ file: relative, message: `STANDALONE_OPERATION_DUPLICATES_PRIMARY:${operationId}` });
      canonicalOps.add(operationId);
    }
  }
  if (generatedStrategies.has(item.strategy)) {
    if (!item.generatedClient) {
      violations.push({ file: registryFile, message: `GENERATED_CLIENT_PATH_REQUIRED:${item.id}` });
    } else {
      const clientPath = toPosix(path.join(serviceRoot, item.generatedClient));
      if (!fs.existsSync(path.join(repoRoot, clientPath))) {
        violations.push({ file: registryFile, message: `GENERATED_CLIENT_MISSING:${clientPath}` });
      } else {
        const client = read(clientPath);
        for (const operationId of operations) if (!client.includes(operationId)) violations.push({ file: clientPath, message: `GENERATED_CLIENT_OPERATION_MISSING:${operationId}` });
      }
    }
  }
  if (manualStrategies.has(item.strategy)) {
    if (!item.adapterOwner) violations.push({ file: registryFile, message: `MANUAL_ADAPTER_OWNER_REQUIRED:${item.id}` });
    else if (!fs.existsSync(path.join(repoRoot, serviceRoot, item.adapterOwner))) violations.push({ file: registryFile, message: `MANUAL_ADAPTER_OWNER_MISSING:${item.adapterOwner}` });
    if (!/x-bthwani-client-generation:\s*DISABLED\b/.test(source)) violations.push({ file: relative, message: "MANUAL_ADAPTER_REQUIRES_DISABLED_GENERATION_METADATA" });
    if (!/x-bthwani-client-binding:\s*MANUAL_TYPED_ADAPTER\b/.test(source)) violations.push({ file: relative, message: "MANUAL_ADAPTER_BINDING_METADATA_MISSING" });
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
const extensions = capabilities(capabilityFiles[1]);
const baseIds = new Set(base.map((item) => item.id));
const extensionIds = new Set();
for (const item of extensions) {
  if (!baseIds.has(item.id)) violations.push({ file: item.file, message: `ORPHAN_CAPABILITY_EXTENSION:${item.id}` });
  if (extensionIds.has(item.id)) violations.push({ file: item.file, message: `DUPLICATE_CAPABILITY_EXTENSION:${item.id}` });
  extensionIds.add(item.id);
}

const owners = new Map();
for (const item of [...base, ...extensions]) {
  const local = new Set();
  for (const operationId of item.operations) {
    if (local.has(operationId)) violations.push({ file: item.file, message: `DUPLICATE_CAPABILITY_OPERATION:${operationId}` });
    local.add(operationId);
    if (!canonicalOps.has(operationId)) violations.push({ file: item.file, message: `STALE_CAPABILITY_OPERATION:${operationId}` });
    if (!owners.has(operationId)) owners.set(operationId, new Set());
    owners.get(operationId).add(item.id);
  }
}
for (const [operationId, operationOwners] of owners) if (operationOwners.size > 1) violations.push({ file: capabilityFiles.join(","), message: `DUPLICATE_OPERATION_OWNERSHIP:${operationId}` });
for (const operationId of canonicalOps) if (!owners.has(operationId)) violations.push({ file: capabilityFiles.join(","), message: `UNOWNED_OPERATION:${operationId}` });

fail(guardId, violations);
