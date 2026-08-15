#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PROMPT_ROOT = path.join(ROOT, "tools", "prompting", "bthwani-orchestrator");
const PLAN_ROOT = path.join(ROOT, "plans", "diagnose-implementing");
const CLI = path.join(PLAN_ROOT, "orchestrator.mjs");

function fail(message) {
  console.error(`governance-schema-gate: FAIL: ${message}`);
  process.exitCode = 1;
}

function requireFile(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    fail(`missing ${path.relative(ROOT, file)}`);
    return "";
  }
  return fs.readFileSync(file, "utf8");
}

const promptEntries = fs.existsSync(PROMPT_ROOT) ? fs.readdirSync(PROMPT_ROOT).sort() : [];
if (promptEntries.join("\n") !== "00-ORCHESTRATOR.md") {
  fail("orchestrator prompt surface must contain only 00-ORCHESTRATOR.md");
}

const contract = requireFile(path.join(PROMPT_ROOT, "00-ORCHESTRATOR.md"));
const template = requireFile(path.join(PLAN_ROOT, "PACKAGE.template.md"));
const cli = requireFile(CLI);
const readme = requireFile(path.join(PLAN_ROOT, "README.md"));

for (const marker of [
  "BTHWANI_ORCHESTRATOR_SCHEMA: 4",
  "PUBLIC_SURFACE: 4_FILES",
  "PACKAGE_MODEL: ONE_TASK_ONE_PACKAGE",
  "CLI_MODEL: ONE_TOOL_TWO_COMMANDS",
  "PRIORITY_POLICY: SYSTEMIC_LEVERAGE",
  "CLOSURE_POLICY: EVIDENCE_ONLY",
]) {
  if (!contract.includes(marker)) fail(`00-ORCHESTRATOR.md missing ${marker}`);
}
if (!template.includes("SCHEMA: BTHWANI_PACKAGE_V4")) {
  fail("PACKAGE.template.md must use BTHWANI_PACKAGE_V4");
}
for (const marker of ['const SCHEMA = "BTHWANI_PACKAGE_V4"', 'command === "new"', 'command === "check"']) {
  if (!cli.includes(marker)) fail(`orchestrator.mjs missing ${marker}`);
}
if (!readme.includes("One public tool = `orchestrator.mjs`.")) {
  fail("README.md does not declare the single public tool");
}

const forbiddenRootPlan = /^(?:_template|frontier-derivation-gate\.mjs|migrate-package-v3(?:-core)?\.mjs|new-package(?:-core)?\.mjs|new-sequence(?:-core)?\.mjs|operational-root-gate(?:-core)?\.mjs|root-anchor-gate(?:-core)?\.mjs|root-cause-priority-gate(?:-core)?\.mjs|task-isolation-gate(?:-core)?\.mjs|validate-package(?:-core)?\.mjs|expand-v3-.+)$/i;
for (const entry of fs.readdirSync(PLAN_ROOT)) {
  if (forbiddenRootPlan.test(entry)) fail(`obsolete V3 public artifact remains: ${entry}`);
}

for (const dir of [
  path.join(ROOT, "tools", "guards", "orchestrator"),
  path.join(ROOT, "tools", "orchestrator"),
]) {
  if (fs.existsSync(dir)) fail(`obsolete orchestrator implementation remains: ${path.relative(ROOT, dir)}`);
}

const oldNames = /\b(?:new-package|new-sequence|validate-package|root-anchor-gate|operational-root-gate|root-cause-priority-gate|task-isolation-gate|frontier-derivation-gate|migrate-package-v3|expand-v3-)\b/i;
for (const [label, text] of [
  ["00-ORCHESTRATOR.md", contract],
  ["PACKAGE.template.md", template],
  ["README.md", readme],
]) {
  if (oldNames.test(text)) fail(`${label} references obsolete V3 machinery`);
}

if (fs.existsSync(CLI)) {
  const syntax = spawnSync(process.execPath, ["--check", CLI], { encoding: "utf8" });
  if (syntax.status !== 0) fail(`orchestrator.mjs syntax check failed: ${syntax.stderr.trim()}`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log("governance-schema-gate: PASS");
