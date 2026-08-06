/**
 * Builds a deterministic, derived diagnostic view of the canonical OpenAPI tree.
 * The output is diagnostic only and must not become a tracked source of truth.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { read, repoRoot, toPosix } from "../guards/_guard-utils.mjs";
import { parseIndexedContractModules, parseOpenApiContract } from "../guards/_openapi-utils.mjs";

const canonicalIndex = "contracts/openapi/index.yaml";
const clientRegistryPath = "governance/contracts/generated-client-registry.json";
const outputFlagIndex = process.argv.indexOf("--output");
if (outputFlagIndex >= 0 && !process.argv[outputFlagIndex + 1]) {
  throw new Error("--output requires a path");
}
const configuredOutput = outputFlagIndex >= 0
  ? process.argv[outputFlagIndex + 1]
  : process.env.BTHWANI_CONTRACT_REGISTRY_OUTPUT;
const registryPath = configuredOutput || ".diagnostics/contracts/contract-registry.json";
const absoluteRegistryPath = path.isAbsolute(registryPath) ? registryPath : path.join(repoRoot, registryPath);

function indexEntries() {
  const lines = read(canonicalIndex).split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === "x-bthwani-contracts:");
  if (start < 0) throw new Error(`${canonicalIndex} is missing x-bthwani-contracts.`);

  const entries = [];
  let group = "";
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const indent = line.match(/^ */)?.[0].length ?? 0;
    if (indent === 0) break;
    const groupMatch = trimmed.match(/^([A-Za-z0-9_-]+):$/);
    if (groupMatch) {
      group = groupMatch[1];
      continue;
    }
    const match = trimmed.match(/^([A-Za-z0-9_-]+):\s*(\.\.\/\.\.\/[^\s]+\.openapi\.ya?ml)$/);
    if (!match) continue;
    entries.push({
      group,
      name: match[1],
      file: toPosix(path.relative(repoRoot, path.resolve(path.dirname(path.join(repoRoot, canonicalIndex)), match[2]))),
    });
  }
  return entries;
}

function manifestFor(entryFile) {
  const manifest = toPosix(path.join(path.dirname(entryFile), "contract.manifest.yaml"));
  if (!fs.existsSync(path.join(repoRoot, manifest))) return null;
  const values = {};
  for (const line of read(manifest).split(/\r?\n/)) {
    const match = line.match(/^([a-zA-Z]+):\s*(.+?)\s*$/);
    if (match) values[match[1]] = match[2];
  }
  return { file: manifest, values };
}

function clientsFor(contractFiles) {
  if (!fs.existsSync(path.join(repoRoot, clientRegistryPath))) return [];
  const registry = JSON.parse(read(clientRegistryPath));
  return (registry.entries ?? [])
    .filter((entry) => contractFiles.includes(entry.contract))
    .map((entry) => ({
      client: entry.client,
      mode: entry.mode,
      contract: entry.contract,
      regenerateScript: entry.regenerateScript ?? null,
    }));
}

const contexts = indexEntries().map((entry) => {
  const modules = parseIndexedContractModules(entry.file).map((module) => module.file);
  const overlays = parseIndexedContractModules(entry.file, "x-bthwani-overlays").map((module) => module.file);
  const manifest = manifestFor(entry.file);
  const bundle = manifest?.values.bundle
    ? toPosix(path.normalize(path.join(path.dirname(entry.file), manifest.values.bundle)))
    : null;
  const reachableFiles = [entry.file, ...modules];

  return {
    context: manifest?.values.context ?? path.dirname(path.dirname(entry.file)),
    group: entry.group,
    name: entry.name,
    entry: entry.file,
    manifest: manifest?.file ?? null,
    owner: manifest?.values.owner ?? null,
    contractState: manifest?.values.contractState ?? null,
    layout: manifest?.values.layout ?? null,
    bundle,
    modules,
    overlays,
    entryPathCount: new Set(parseOpenApiContract(entry.file).map((operation) => operation.path)).size,
    reachablePathCount: new Set(reachableFiles.flatMap((file) => parseOpenApiContract(file).map((operation) => operation.path))).size,
    clients: clientsFor([entry.file, bundle, ...modules, ...overlays].filter(Boolean)),
  };
});

const sourceFiles = [
  canonicalIndex,
  ...(fs.existsSync(path.join(repoRoot, clientRegistryPath)) ? [clientRegistryPath] : []),
  ...contexts.flatMap((context) => [
    context.entry,
    context.manifest,
    ...context.modules,
    ...context.overlays,
  ].filter(Boolean)),
].sort();

const digest = crypto.createHash("sha256");
for (const file of sourceFiles) digest.update(`${file}\n${read(file)}\n`);

const registry = {
  $generated: "DERIVED DIAGNOSTIC ONLY. DO NOT COMMIT OR EDIT.",
  schemaVersion: 2,
  reportRole: "DERIVED_DIAGNOSTIC_ONLY",
  canonicalIndex,
  sourceDigest: digest.digest("hex"),
  totals: {
    contexts: contexts.length,
    modules: contexts.reduce((sum, context) => sum + context.modules.length, 0),
    overlays: contexts.reduce((sum, context) => sum + context.overlays.length, 0),
    reachablePaths: contexts.reduce((sum, context) => sum + context.reachablePathCount, 0),
  },
  contexts,
};

fs.mkdirSync(path.dirname(absoluteRegistryPath), { recursive: true });
fs.writeFileSync(absoluteRegistryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
console.log(
  `contract-registry diagnostic: ${registry.totals.contexts} contexts, ` +
  `${registry.totals.modules} modules, ${registry.totals.reachablePaths} reachable paths -> ${registryPath}`,
);
