import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "authority-precedence-gate";
const violations = [];
const registryPath = path.join(repoRoot, "governance/authority/authority-precedence.json");
const schemaPath = path.join(repoRoot, "governance/authority/authority-precedence.schema.json");
const indexPath = path.join(repoRoot, "governance/00_DECISION_INDEX.md");

for (const requiredPath of [registryPath, schemaPath, indexPath]) {
  if (!fs.existsSync(requiredPath)) {
    violations.push({ file: path.relative(repoRoot, requiredPath), line: 0, message: "MISSING_AUTHORITY_FILE" });
  }
}

if (violations.length === 0) {
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  if (!validate(registry)) {
    for (const error of validate.errors ?? []) {
      violations.push({
        file: "governance/authority/authority-precedence.json",
        line: 0,
        message: `SCHEMA_VIOLATION ${error.instancePath} ${error.message}`,
      });
    }
  }

  const ranks = new Set();
  const precedenceIds = new Set();
  for (const entry of registry.precedence) {
    if (ranks.has(entry.rank)) {
      violations.push({ file: "governance/authority/authority-precedence.json", line: 0, message: `DUPLICATE_RANK ${entry.rank}` });
    }
    if (precedenceIds.has(entry.id)) {
      violations.push({ file: "governance/authority/authority-precedence.json", line: 0, message: `DUPLICATE_PRECEDENCE_ID ${entry.id}` });
    }
    ranks.add(entry.rank);
    precedenceIds.add(entry.id);
  }

  const documentPaths = new Set();
  const rootDocuments = [];
  for (const document of registry.documents) {
    if (documentPaths.has(document.path)) {
      violations.push({ file: "governance/authority/authority-precedence.json", line: 0, message: `DUPLICATE_DOCUMENT ${document.path}` });
    }
    documentPaths.add(document.path);
    if (!precedenceIds.has(document.precedenceId)) {
      violations.push({ file: "governance/authority/authority-precedence.json", line: 0, message: `UNKNOWN_PRECEDENCE ${document.path} -> ${document.precedenceId}` });
    }
    if (document.classification === "ROOT_AUTHORITY") rootDocuments.push(document.path);

    const concreteFile = path.join(repoRoot, document.path);
    const mustExist = ["ROOT_AUTHORITY", "ACTIVE_CANONICAL", "CONDITIONAL_CANONICAL", "ADAPTER"].includes(document.classification);
    if (mustExist && !fs.existsSync(concreteFile)) {
      violations.push({ file: document.path, line: 0, message: "REGISTERED_AUTHORITY_PATH_MISSING" });
    }
  }

  if (rootDocuments.length !== 1 || rootDocuments[0] !== registry.rootAuthority) {
    violations.push({
      file: "governance/authority/authority-precedence.json",
      line: 0,
      message: `ROOT_AUTHORITY_MISMATCH expected exactly '${registry.rootAuthority}', found ${JSON.stringify(rootDocuments)}`,
    });
  }

  const rankById = new Map(registry.precedence.map((entry) => [entry.id, entry.rank]));
  const activeRanks = registry.documents
    .filter((document) => ["ROOT_AUTHORITY", "ACTIVE_CANONICAL", "CONDITIONAL_CANONICAL"].includes(document.classification))
    .map((document) => rankById.get(document.precedenceId));
  const historicalRanks = registry.documents
    .filter((document) => ["DERIVED_SUPPORT", "HISTORICAL_REFERENCE"].includes(document.classification))
    .map((document) => rankById.get(document.precedenceId));
  if (activeRanks.length && historicalRanks.length && Math.min(...historicalRanks) <= Math.max(...activeRanks)) {
    violations.push({
      file: "governance/authority/authority-precedence.json",
      line: 0,
      message: "DERIVED_OR_HISTORICAL_AUTHORITY_OUTRANKS_ACTIVE_AUTHORITY",
    });
  }

  const index = fs.readFileSync(indexPath, "utf8");
  for (const marker of [
    "governance/authority/authority-precedence.json",
    "ACTIVE_CANONICAL",
    "DERIVED_SUPPORT",
    "HISTORICAL_REFERENCE",
  ]) {
    if (!index.includes(marker)) {
      violations.push({ file: "governance/00_DECISION_INDEX.md", line: 0, message: `INDEX_MISSING_AUTHORITY_MARKER ${marker}` });
    }
  }
}

fail(guardId, violations);
