import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fail, listFiles, read, repoRoot, toPosix } from "../guards/_guard-utils.mjs";
import { parseIndexedContractModules, parseOpenApiContract } from "../guards/_openapi-utils.mjs";

const guardId = "contracts-foundation";
const violations = [];
const canonicalIndex = "contracts/openapi/index.yaml";
const forbiddenIndexes = ["openapi.yaml", "contracts/master.openapi.yaml", "auth.openapi.yaml"];
const allowedStates = new Set(["CONTRACT_DRAFT", "CONTRACT_ACTIVE", "RESERVED"]);

function exists(file) {
  return fs.existsSync(path.join(repoRoot, file));
}

function scalar(content, key) {
  const match = content.match(new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*(.+?)\\s*$`, "m"));
  if (!match) return undefined;
  return match[1].replace(/\s+#.*$/, "").replace(/^['"]|['"]$/g, "");
}

function indexedEntries() {
  if (!exists(canonicalIndex)) return [];
  const lines = read(canonicalIndex).split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === "x-bthwani-contracts:");
  if (start < 0) {
    violations.push({ file: canonicalIndex, message: "missing x-bthwani-contracts index" });
    return [];
  }

  const entries = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.match(/^ */)?.[0].length ?? 0;
    if (indent === 0) break;
    const match = line.trim().match(/^([A-Za-z0-9_-]+):\s*(\.\.\/\.\.\/[^\s]+\.openapi\.ya?ml)$/);
    if (!match) continue;
    const file = toPosix(path.relative(repoRoot, path.resolve(path.dirname(path.join(repoRoot, canonicalIndex)), match[2])));
    entries.push({ name: match[1], file });
  }
  return entries;
}

for (const file of forbiddenIndexes) {
  if (exists(file)) {
    violations.push({ file, message: `parallel or retired central contract source is forbidden; use ${canonicalIndex}` });
  }
}

if (!exists(canonicalIndex)) {
  violations.push({ file: canonicalIndex, message: "canonical OpenAPI index is missing" });
} else {
  const content = read(canonicalIndex);
  if (!/^paths:\s*\{\}\s*$/m.test(content)) {
    violations.push({ file: canonicalIndex, message: "canonical index must own no operations and declare paths: {}" });
  }
  if (scalar(content, "x-bthwani-contract-role") !== "MASTER_INDEX_ONLY") {
    violations.push({ file: canonicalIndex, message: "canonical index must declare x-bthwani-contract-role: MASTER_INDEX_ONLY" });
  }
  if (scalar(content, "x-bthwani-manual-paths-forbidden") !== "true") {
    violations.push({ file: canonicalIndex, message: "canonical index must forbid manually owned paths" });
  }
}

const entries = indexedEntries();
const entryFiles = new Set();
const ownedFiles = new Map();
const operationOwners = new Map();
const operationIdOwners = new Map();

for (const entry of entries) {
  if (entryFiles.has(entry.file)) {
    violations.push({ file: canonicalIndex, message: `entry contract is indexed more than once: ${entry.file}` });
    continue;
  }
  entryFiles.add(entry.file);

  if (!exists(entry.file)) {
    violations.push({ file: canonicalIndex, message: `indexed entry does not exist: ${entry.file}` });
    continue;
  }

  const manifest = toPosix(path.join(path.dirname(entry.file), "contract.manifest.yaml"));
  if (!exists(manifest)) {
    violations.push({ file: manifest, message: `indexed context '${entry.name}' has no ownership manifest` });
  }

  const modules = parseIndexedContractModules(entry.file);
  for (const candidate of [{ file: entry.file, exists: true }, ...modules]) {
    if (!candidate.exists) {
      violations.push({ file: entry.file, message: `indexed module does not exist: ${candidate.file}` });
      continue;
    }
    const priorOwner = ownedFiles.get(candidate.file);
    if (priorOwner && priorOwner !== entry.file) {
      violations.push({ file: candidate.file, message: `contract file has multiple owners: ${priorOwner}, ${entry.file}` });
    } else {
      ownedFiles.set(candidate.file, entry.file);
    }

    for (const operation of parseOpenApiContract(candidate.file)) {
      const operationKey = `${operation.method.toUpperCase()} ${operation.path}`;
      const priorOperation = operationOwners.get(operationKey);
      if (priorOperation && priorOperation.owner === entry.file) {
        violations.push({
          file: candidate.file,
          line: operation.line,
          message: `duplicate operation '${operationKey}' also defined in ${priorOperation.file}`,
        });
      } else if (!priorOperation) {
        operationOwners.set(operationKey, { owner: entry.file, file: candidate.file });
      }

      if (operation.operationId) {
        const priorId = operationIdOwners.get(operation.operationId);
        if (priorId) {
          violations.push({
            file: candidate.file,
            line: operation.line,
            message: `duplicate operationId '${operation.operationId}' also defined in ${priorId}`,
          });
        } else {
          operationIdOwners.set(operation.operationId, candidate.file);
        }
      }
    }
  }
}

const contractFiles = listFiles().filter((file) => file.endsWith(".openapi.yaml") || file.endsWith(".openapi.yml"));
for (const file of contractFiles) {
  const content = read(file);
  const role = scalar(content, "x-bthwani-contract-role");
  if (role === "MASTER_INDEX_ONLY" && file !== canonicalIndex) {
    violations.push({ file, message: `MASTER_INDEX_ONLY is reserved for ${canonicalIndex}` });
  }
  const state = scalar(content, "x-bthwani-contract-state");
  if (!state) {
    violations.push({ file, message: "missing x-bthwani-contract-state" });
  } else if (!allowedStates.has(state)) {
    violations.push({ file, message: `invalid x-bthwani-contract-state '${state}'` });
  }
}

if (entries.length > 0) {
  const digest = crypto.createHash("sha256");
  for (const file of [canonicalIndex, ...[...ownedFiles.keys()].sort()]) {
    digest.update(`${file}\n${read(file)}\n`);
  }
  console.log(`canonical_openapi_source: ${canonicalIndex}`);
  console.log(`openapi_source_digest: ${digest.digest("hex")}`);
  console.log(`indexed_contexts: ${entries.length}`);
  console.log(`owned_contract_files: ${ownedFiles.size}`);
}

fail(guardId, violations);
