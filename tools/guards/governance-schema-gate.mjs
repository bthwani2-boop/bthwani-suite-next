#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PROMPT_ROOT = path.join(ROOT, "tools", "prompting", "bthwani-orchestrator");
const CONTRACT = path.join(PROMPT_ROOT, "00-ORCHESTRATOR.md");
const PACKAGE_JSON = path.join(ROOT, "package.json");
const REQUIRED_COMMAND_GATE = path.join(ROOT, "tools", "guards", "required-command-integrity-gate.mjs");
const EXPECTED_PACKAGE_FILES = [
  "00-ORCHESTRATOR.md",
  "01-SCOPE-AUTHORITY-RULES.md",
  "02-DIAGNOSE-ROOT-CAUSE.md",
  "03-LIVE-EXECUTION-RESTRUCTURE-CLEANUP.md",
  "04-VERIFY-REDIAGNOSE-CLOSE.md",
  "99-SOURCE-MAP.md",
  "focus/code-architecture-organization.md",
  "focus/data-contracts-runtime-security-quality.md",
  "focus/governance-product-design.md",
].sort();

let failed = false;

function fail(message) {
  console.error(`governance-schema-gate: FAIL: ${message}`);
  failed = true;
}

function readFile(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    fail(`missing ${path.relative(ROOT, file)}`);
    return "";
  }
  return fs.readFileSync(file, "utf8");
}

function requireMarkers(label, text, markers) {
  for (const marker of markers) if (!text.includes(marker)) fail(`${label} missing ${marker}`);
}

function listFiles(root, prefix = "") {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(prefix, entry.name);
    return entry.isDirectory() ? listFiles(path.join(root, entry.name), relative) : [relative.replaceAll("\\", "/")];
  });
}

function rejectLegacyMarkers(label, text, patterns) {
  for (const [name, pattern] of patterns) if (pattern.test(text)) fail(`${label}: ${name}`);
}

const actualPackageFiles = listFiles(PROMPT_ROOT).sort();
if (actualPackageFiles.join("\n") !== EXPECTED_PACKAGE_FILES.join("\n")) {
  fail(`orchestrator package surface drift expected=${EXPECTED_PACKAGE_FILES.join(",")} actual=${actualPackageFiles.join(",")}`);
}

const contract = readFile(CONTRACT);
const packageText = readFile(PACKAGE_JSON);
const requiredCommandGate = readFile(REQUIRED_COMMAND_GATE);

if (packageText) {
  try {
    const packageJson = JSON.parse(packageText);
    if (packageJson.scripts?.["guard:governance-schema"] !== "node tools/guards/governance-schema-gate.mjs") {
      fail("package.json guard:governance-schema command drift");
    }
  } catch (error) {
    fail(`package.json invalid JSON: ${error.message}`);
  }
}
if (requiredCommandGate && !requiredCommandGate.includes("governance-schema-gate.mjs")) {
  fail("required-command-integrity-gate.mjs does not execute governance-schema-gate.mjs");
}

requireMarkers("00-ORCHESTRATOR.md", contract, [
  "PACKAGE_CLASS: PROTECTED_ENGINEERING_CONTROL_PLANE",
  "DEFAULT_EXECUTION: LIVE_END_TO_END",
  "DEFAULT_PLAN_ARTIFACTS: FORBIDDEN",
  "DEFAULT_ORCHESTRATOR_MUTABILITY: READ_ONLY",
  "resolve exact repository + branch/ref",
  "SELECT HIGHEST PROVEN SYSTEMIC ROOT",
  "RE-DIAGNOSE AFFECTED SYSTEM",
  "DECISION_REQUIRED",
  "CLOSED",
]);
rejectLegacyMarkers("00-ORCHESTRATOR.md", contract, [
  ["V5_SCHEMA_FORBIDDEN", /BTHWANI_ORCHESTRATOR_SCHEMA:\s*5/],
  ["PLAN_PACKAGE_AUTHORITY_FORBIDDEN", /ONE_TASK_ONE_PACKAGE|BTHWANI_PACKAGE_V5/],
]);

requireMarkers("01-SCOPE-AUTHORITY-RULES.md", readFile(path.join(PROMPT_ROOT, "01-SCOPE-AUTHORITY-RULES.md")), [
  "GOVERNANCE ≠ AUTOMATIC TRUTH",
  "REQUESTED_SCOPE ≠ MAXIMUM_ALLOWED_SCOPE",
  "NOT_INSPECTED ≠ CLEAN",
  "Default execution writes nothing to `plans/**`",
  "Orchestrator protection",
]);
requireMarkers("02-DIAGNOSE-ROOT-CAUSE.md", readFile(path.join(PROMPT_ROOT, "02-DIAGNOSE-ROOT-CAUSE.md")), [
  "DISCOVER → MODEL → HYPOTHESIZE",
  "operational parent",
  "DEEPENED_ENOUGH_TO_RANK",
  "JIT execution frontier",
  "Re-diagnosis after every material root",
]);
requireMarkers("03-LIVE-EXECUTION-RESTRUCTURE-CLEANUP.md", readFile(path.join(PROMPT_ROOT, "03-LIVE-EXECUTION-RESTRUCTURE-CLEANUP.md")), [
  "IDENTIFY CANONICAL OWNER / WRITE PATH",
  "MIGRATE ALL MATERIAL WRITERS",
  "Canonical cutover",
  "zero-reference/reachability proof",
  "runtime/readback proof",
  "Orchestrator package exclusion",
]);
requireMarkers("04-VERIFY-REDIAGNOSE-CLOSE.md", readFile(path.join(PROMPT_ROOT, "04-VERIFY-REDIAGNOSE-CLOSE.md")), [
  "Verification proves claims, not activity",
  "Exact candidate evidence",
  "Final negative-space pass",
  "Final adversarial re-diagnosis",
  "LATEST_EXACT_HEAD_RECONCILED",
]);
requireMarkers("99-SOURCE-MAP.md", readFile(path.join(PROMPT_ROOT, "99-SOURCE-MAP.md")), [
  "STATUS: MIGRATION_RECORD_ONLY",
  "RUNTIME_AUTHORITY: NO",
  "protected 9-file orchestrator",
  "UNACCOUNTED_REVIEWED_MATERIAL_CONCEPTS = 0",
]);

for (const relative of EXPECTED_PACKAGE_FILES.slice(6)) {
  const text = readFile(path.join(PROMPT_ROOT, relative));
  if (!text.trim()) fail(`${relative} is empty`);
}

for (const dir of [
  path.join(ROOT, "tools", "guards", "orchestrator"),
  path.join(ROOT, "tools", "orchestrator"),
]) {
  if (fs.existsSync(dir)) fail(`obsolete orchestrator implementation remains: ${path.relative(ROOT, dir)}`);
}

if (failed) process.exit(1);
console.log("governance-schema-gate: PASS");
