/**
 * generate-contract-registry.mjs
 *
 * Emits contracts/generated/contract-registry.json: the derived, machine-readable
 * view of the platform contract tree.
 *
 * Truth flows one way. The master indexes one entry contract per bounded context;
 * each entry indexes its own modules and overlays; each context declares a
 * contract.manifest.yaml. This script only reports what those files already say,
 * so a disagreement shows up as registry drift rather than as a silent second
 * opinion. Run `pnpm run contracts:registry` after any contract change.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { read, repoRoot, toPosix } from "../guards/_guard-utils.mjs";
import { parseIndexedContractModules, parseOpenApiContract } from "../guards/_openapi-utils.mjs";

const masterPath = "contracts/master.openapi.yaml";
const registryPath = "contracts/generated/contract-registry.json";
const clientRegistryPath = "governance/contracts/generated-client-registry.json";

function masterEntries() {
  const lines = read(masterPath).split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === "x-bthwani-contracts:");
  if (start === -1) throw new Error(`${masterPath} is missing x-bthwani-contracts.`);

  const entries = [];
  let group = "";
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (line.match(/^ */)[0].length === 0) break;

    const groupMatch = trimmed.match(/^([A-Za-z0-9_-]+):$/);
    if (groupMatch) {
      group = groupMatch[1];
      continue;
    }
    const match = trimmed.match(/^([A-Za-z0-9_-]+):\s*(\.\.\/[^\s]+\.openapi\.yaml)$/);
    if (!match) continue;
    entries.push({
      group,
      name: match[1],
      file: toPosix(path.relative(repoRoot, path.resolve(repoRoot, "contracts", match[2]))),
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
  const registry = JSON.parse(read(clientRegistryPath));
  return registry.entries
    .filter((entry) => contractFiles.includes(entry.contract))
    .map((entry) => ({
      client: entry.client,
      mode: entry.mode,
      contract: entry.contract,
      regenerateScript: entry.regenerateScript ?? null,
      reconstructionOwner: entry.reconstructionOwner ?? null,
    }));
}

const contexts = masterEntries().map((entry) => {
  const modules = parseIndexedContractModules(entry.file).map((module) => module.file);
  const overlays = parseIndexedContractModules(entry.file, "x-bthwani-overlays").map((m) => m.file);
  const manifest = manifestFor(entry.file);
  const bundle = manifest?.values.bundle
    ? toPosix(path.join(path.dirname(entry.file), manifest.values.bundle))
    : null;

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
    entryPathCount: new Set(parseOpenApiContract(entry.file).map((o) => o.path)).size,
    reachablePathCount: new Set(
      [entry.file, ...modules].flatMap((file) => parseOpenApiContract(file).map((o) => o.path)),
    ).size,
    clients: clientsFor([entry.file, bundle, ...modules, ...overlays].filter(Boolean)),
  };
});

const sourceFiles = [
  masterPath,
  clientRegistryPath,
  ...contexts.flatMap((c) => [c.entry, c.manifest, ...c.modules, ...c.overlays].filter(Boolean)),
].sort();

const digest = crypto.createHash("sha256");
for (const file of sourceFiles) digest.update(`${file}\n${read(file)}`);

const registry = {
  $generated: "DO NOT EDIT. Regenerate with `pnpm run contracts:registry`.",
  schemaVersion: 1,
  owningSlice: "VC-155",
  master: masterPath,
  masterRole: "MASTER_INDEX_ONLY",
  sourceDigest: digest.digest("hex"),
  totals: {
    contexts: contexts.length,
    modules: contexts.reduce((sum, c) => sum + c.modules.length, 0),
    overlays: contexts.reduce((sum, c) => sum + c.overlays.length, 0),
    reachablePaths: contexts.reduce((sum, c) => sum + c.reachablePathCount, 0),
  },
  contexts,
};

fs.mkdirSync(path.join(repoRoot, "contracts/generated"), { recursive: true });
fs.writeFileSync(path.join(repoRoot, registryPath), `${JSON.stringify(registry, null, 2)}\n`, "utf8");

console.log(
  `contract-registry: ${registry.totals.contexts} contexts, ${registry.totals.modules} modules, ` +
    `${registry.totals.reachablePaths} reachable paths -> ${registryPath}`,
);
