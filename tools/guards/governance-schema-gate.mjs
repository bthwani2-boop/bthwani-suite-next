#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "governance-schema-gate";
const violations = [];
const authorityRoot = "governance/authority";
const registryPath = `${authorityRoot}/authority-precedence.json`;
const registrySchemaPath = `${authorityRoot}/authority-precedence.schema.json`;
const allowedClassifications = new Set([
  "ROOT_AUTHORITY",
  "ACTIVE_CANONICAL",
  "CONDITIONAL_CANONICAL",
  "OWNER_CONTRACT",
  "ADAPTER",
  "DERIVED_SUPPORT",
  "HISTORICAL_REFERENCE",
]);

function issue(file, message) {
  violations.push({ file, line: 0, message });
}

function readJson(relativePath) {
  const full = path.join(repoRoot, relativePath);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
    issue(relativePath, "MISSING_REQUIRED_GOVERNANCE_FILE");
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    issue(relativePath, `INVALID_JSON ${error.message}`);
    return null;
  }
}

function walkJson(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJson(full, files);
    else if (entry.name.endsWith(".json")) files.push(toPosix(path.relative(repoRoot, full)));
  }
  return files;
}

// This guard validates live repository governance contracts only.
// It intentionally does not read or validate tools/prompting/bthwani-orchestrator/**.
for (const relative of walkJson(path.join(repoRoot, "governance"))) readJson(relative);

const registry = readJson(registryPath);
const schema = readJson(registrySchemaPath);

if (schema) {
  if (schema.type !== "object") issue(registrySchemaPath, "AUTHORITY_SCHEMA_ROOT_TYPE_MUST_BE_OBJECT");
  const required = new Set(schema.required ?? []);
  for (const key of ["schemaVersion", "rootAuthority", "precedence", "documents"]) {
    if (!required.has(key)) issue(registrySchemaPath, `AUTHORITY_SCHEMA_REQUIRED_KEY_MISSING ${key}`);
  }
}

if (registry) {
  if (registry.schemaVersion !== 1) issue(registryPath, "AUTHORITY_SCHEMA_VERSION_MUST_BE_1");
  if (registry.rootAuthority !== registryPath) issue(registryPath, `ROOT_AUTHORITY_MUST_SELF_IDENTIFY ${registryPath}`);

  if (!Array.isArray(registry.precedence) || registry.precedence.length === 0) issue(registryPath, "PRECEDENCE_MUST_BE_NON_EMPTY_ARRAY");
  if (!Array.isArray(registry.documents) || registry.documents.length === 0) issue(registryPath, "DOCUMENTS_MUST_BE_NON_EMPTY_ARRAY");

  const precedenceIds = new Set();
  const ranks = new Set();
  for (const entry of registry.precedence ?? []) {
    if (!Number.isInteger(entry.rank) || entry.rank < 1) issue(registryPath, `INVALID_PRECEDENCE_RANK ${entry.rank}`);
    if (ranks.has(entry.rank)) issue(registryPath, `DUPLICATE_PRECEDENCE_RANK ${entry.rank}`);
    ranks.add(entry.rank);
    if (typeof entry.id !== "string" || !/^[A-Z0-9_]+$/.test(entry.id)) issue(registryPath, `INVALID_PRECEDENCE_ID ${entry.id}`);
    if (precedenceIds.has(entry.id)) issue(registryPath, `DUPLICATE_PRECEDENCE_ID ${entry.id}`);
    precedenceIds.add(entry.id);
    if (typeof entry.description !== "string" || entry.description.trim() === "") issue(registryPath, `EMPTY_PRECEDENCE_DESCRIPTION ${entry.id}`);
  }

  const orderedRanks = [...ranks].sort((a, b) => a - b);
  for (let i = 0; i < orderedRanks.length; i += 1) {
    if (orderedRanks[i] !== i + 1) issue(registryPath, `PRECEDENCE_RANKS_MUST_BE_CONTIGUOUS actual=${orderedRanks.join(",")}`);
  }

  const documentPaths = new Set();
  for (const entry of registry.documents ?? []) {
    const relative = toPosix(String(entry.path ?? "").trim());
    if (!relative) {
      issue(registryPath, "DOCUMENT_PATH_MISSING");
      continue;
    }
    if (documentPaths.has(relative)) issue(registryPath, `DUPLICATE_DOCUMENT_PATH ${relative}`);
    documentPaths.add(relative);

    if (!allowedClassifications.has(entry.classification)) issue(registryPath, `INVALID_DOCUMENT_CLASSIFICATION ${relative}:${entry.classification}`);
    if (!precedenceIds.has(entry.precedenceId)) issue(registryPath, `UNKNOWN_DOCUMENT_PRECEDENCE ${relative}:${entry.precedenceId}`);
    if (!Array.isArray(entry.authorityDomains) || entry.authorityDomains.length === 0) issue(registryPath, `EMPTY_AUTHORITY_DOMAINS ${relative}`);
    else if (new Set(entry.authorityDomains).size !== entry.authorityDomains.length) issue(registryPath, `DUPLICATE_AUTHORITY_DOMAIN ${relative}`);
    if (entry.classification === "CONDITIONAL_CANONICAL" && (typeof entry.appliesWhen !== "string" || entry.appliesWhen.trim() === "")) {
      issue(registryPath, `CONDITIONAL_AUTHORITY_REQUIRES_APPLIES_WHEN ${relative}`);
    }

    const target = path.join(repoRoot, relative);
    if (!fs.existsSync(target)) issue(registryPath, `REGISTERED_AUTHORITY_PATH_MISSING ${relative}`);

    if ((relative.startsWith("plans/") || relative.startsWith("tools/prompting/")) && !["DERIVED_SUPPORT", "HISTORICAL_REFERENCE"].includes(entry.classification)) {
      issue(registryPath, `DERIVED_PROMPT_OR_PLAN_CANNOT_BE_CANONICAL_AUTHORITY ${relative}:${entry.classification}`);
    }
  }

  const rootEntry = (registry.documents ?? []).find((entry) => entry.path === registryPath);
  if (!rootEntry || rootEntry.classification !== "ROOT_AUTHORITY") issue(registryPath, "ROOT_AUTHORITY_REGISTRY_ENTRY_MISSING_OR_MISCLASSIFIED");

  const currentUser = (registry.precedence ?? []).find((entry) => entry.id === "CURRENT_USER_INSTRUCTION");
  if (!currentUser) issue(registryPath, "CURRENT_USER_INSTRUCTION_PRECEDENCE_MISSING");
  else if (!/safety/i.test(currentUser.description) || !/permission/i.test(currentUser.description)) {
    issue(registryPath, "CURRENT_USER_INSTRUCTION_MUST_EXPLICITLY_REMAIN_SUBJECT_TO_SAFETY_AND_PERMISSIONS");
  }
}

fail(guardId, violations);
