#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(HERE, "PACKAGE.template.md");
const SCHEMA = "BTHWANI_PACKAGE_V4";
const MODES = new Set(["PREPARE_ONLY", "EXECUTE_END_TO_END"]);
const PHASES = new Set(["diagnose", "prepare", "execute", "close"]);
const STATUSES = new Set(["DIAGNOSING", "READY", "PREPARED", "EXECUTING", "BLOCKED", "VERIFYING", "CLOSED"]);
const SHA = /^[0-9a-f]{40}$/i;
const NAME = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

const READINESS_KEYS = [
  "ROOT",
  "LANDSCAPE",
  "PRIORITY",
  "FRONTIER",
  "NEGATIVE_SPACE",
  "ADVERSARIAL",
  "VERIFICATION_DEFINED",
];
const ACCOUNTING_KEYS = ["FINDINGS", "DECISIONS", "CONSUMERS", "DEPENDENCIES", "SCOPE_DELTAS"];
const COMPLETION_KEYS = [
  "IMPLEMENTATION",
  "CONSUMERS",
  "CLEANUP",
  "VERIFICATION",
  "EVIDENCE",
  "GOVERNANCE",
  "FRESH_HEAD",
  "FINAL_ADVERSARIAL",
];

function fail(message) {
  console.error(`orchestrator: FAIL: ${message}`);
  process.exit(1);
}

function parseArgs(tokens, allowed) {
  const out = {};
  for (let i = 0; i < tokens.length; i += 2) {
    const key = tokens[i];
    const value = tokens[i + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) {
      fail("arguments must be --key value pairs");
    }
    const name = key.slice(2);
    if (!allowed.has(name)) fail(`unknown argument --${name}`);
    if (Object.hasOwn(out, name)) fail(`duplicate argument --${name}`);
    out[name] = value;
  }
  for (const name of allowed) {
    if (!Object.hasOwn(out, name)) fail(`missing --${name}`);
  }
  return out;
}

function oneLine(value, label) {
  const clean = value.trim();
  if (!clean || /[\r\n]/.test(clean)) fail(`${label} must be one non-empty line`);
  return clean;
}

function branch(value, label) {
  const clean = oneLine(value, label);
  if (
    !BRANCH.test(clean) ||
    clean.includes("..") ||
    clean.includes("//") ||
    clean.includes("@{") ||
    clean.endsWith("/") ||
    clean.endsWith(".")
  ) {
    fail(`${label} is not a safe branch name`);
  }
  return clean;
}

function lineValue(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  return match ? match[1].trim() : null;
}

function requireLine(text, key) {
  const value = lineValue(text, key);
  if (value === null) fail(`missing field ${key}`);
  return value;
}

function parseAssignments(text, key, expectedKeys) {
  const raw = requireLine(text, key);
  const values = {};
  for (const token of raw.split(/\s+/).filter(Boolean)) {
    const split = token.indexOf("=");
    if (split <= 0 || split === token.length - 1) fail(`${key} has invalid token ${token}`);
    const name = token.slice(0, split);
    const value = token.slice(split + 1);
    if (!expectedKeys.includes(name)) fail(`${key} has unknown key ${name}`);
    if (Object.hasOwn(values, name)) fail(`${key} duplicates ${name}`);
    values[name] = value;
  }
  for (const name of expectedKeys) {
    if (!Object.hasOwn(values, name)) fail(`${key} missing ${name}`);
  }
  if (Object.keys(values).length !== expectedKeys.length) fail(`${key} has unexpected assignments`);
  return values;
}

function bullet(text, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^- ${escaped}:\\s*(.*)$`, "m"));
  return match ? match[1].trim() : null;
}

function replaceToken(text, token, value) {
  if (!text.includes(token)) fail(`template missing ${token}`);
  return text.split(token).join(value);
}

function resolvePackage(input) {
  const resolved = path.resolve(input);
  if (!fs.existsSync(resolved)) fail(`package path does not exist: ${input}`);
  const stat = fs.statSync(resolved);
  return stat.isDirectory() ? path.join(resolved, "PACKAGE.md") : resolved;
}

function requireYes(values, label) {
  for (const [key, value] of Object.entries(values)) {
    if (value !== "YES") fail(`${label}.${key} must be YES`);
  }
}

function requireZero(values, label) {
  for (const [key, value] of Object.entries(values)) {
    if (value !== "0") fail(`${label}.${key} must be 0`);
  }
}

function validateShape(text, liveHead) {
  if (/__[A-Z0-9_]+__/.test(text)) fail("unresolved template placeholder");
  for (const heading of ["## Root-Cause Graph", "## Ledger", "## Frontier", "## Closure"]) {
    if (!text.includes(heading)) fail(`missing section ${heading}`);
  }

  const keys = [
    "SCHEMA",
    "TASK_ID",
    "TARGET",
    "MODE",
    "INTEGRATION_BRANCH",
    "TASK_BRANCH",
    "BASE_SHA",
    "LATEST_RECONCILED_SHA",
    "ROOT",
    "STATUS",
    "ISOLATION_READY",
    "INTEGRATION_OWNER",
    "RUNTIME_REQUIRED",
    "PRODUCT_EVIDENCE",
    "CLOSURE",
  ];
  const values = Object.fromEntries(keys.map((key) => [key, requireLine(text, key)]));
  const readiness = parseAssignments(text, "READINESS", READINESS_KEYS);
  const accounting = parseAssignments(text, "UNACCOUNTED", ACCOUNTING_KEYS);
  const completion = parseAssignments(text, "COMPLETION", COMPLETION_KEYS);

  if (values.SCHEMA !== SCHEMA) fail(`SCHEMA must be ${SCHEMA}`);
  if (!MODES.has(values.MODE)) fail("invalid MODE");
  if (!SHA.test(values.BASE_SHA)) fail("invalid BASE_SHA");
  if (!SHA.test(values.LATEST_RECONCILED_SHA)) fail("invalid LATEST_RECONCILED_SHA");
  if (values.LATEST_RECONCILED_SHA.toLowerCase() !== liveHead.toLowerCase()) {
    fail("package is stale: LATEST_RECONCILED_SHA differs from --head");
  }
  if (values.ROOT !== values.TARGET) fail("ROOT must equal TARGET");
  if (branch(values.INTEGRATION_BRANCH, "INTEGRATION_BRANCH") === branch(values.TASK_BRANCH, "TASK_BRANCH")) {
    fail("TASK_BRANCH must differ from INTEGRATION_BRANCH");
  }
  if (!STATUSES.has(values.STATUS)) fail("invalid STATUS");
  if (!new Set(["YES", "NO"]).has(values.ISOLATION_READY)) fail("ISOLATION_READY must be YES or NO");
  for (const [key, value] of Object.entries(readiness)) {
    if (!new Set(["YES", "NO"]).has(value)) fail(`READINESS.${key} must be YES or NO`);
  }
  for (const [key, value] of Object.entries(accounting)) {
    if (value !== "UNSET" && !/^\d+$/.test(value)) fail(`UNACCOUNTED.${key} must be UNSET or an integer`);
  }
  for (const [key, value] of Object.entries(completion)) {
    if (!new Set(["YES", "NO"]).has(value)) fail(`COMPLETION.${key} must be YES or NO`);
  }
  return { values, readiness, accounting, completion };
}

function requireReady(state) {
  if (state.values.ISOLATION_READY !== "YES") fail("ISOLATION_READY must be YES");
  requireYes(state.readiness, "READINESS");
  requireZero(state.accounting, "UNACCOUNTED");
}

function commandNew(tokens) {
  const args = parseArgs(
    tokens,
    new Set(["name", "target", "mode", "integration-branch", "task-branch", "base-sha"]),
  );
  const name = oneLine(args.name, "name");
  if (!NAME.test(name)) fail("name must be 1-80 lowercase safe characters");
  const target = oneLine(args.target, "target");
  const mode = oneLine(args.mode, "mode");
  if (!MODES.has(mode)) fail(`mode must be ${[...MODES].join(" or ")}`);
  const integration = branch(args["integration-branch"], "integration branch");
  const task = branch(args["task-branch"], "task branch");
  if (integration === task) fail("task branch must differ from integration branch");
  const baseSha = oneLine(args["base-sha"], "base SHA");
  if (!SHA.test(baseSha)) fail("base SHA must be a 40-character commit SHA");
  if (!fs.existsSync(TEMPLATE)) fail("PACKAGE.template.md is missing");

  const taskDir = path.join(HERE, name);
  if (fs.existsSync(taskDir)) fail(`task package already exists: ${name}`);

  let text = fs.readFileSync(TEMPLATE, "utf8");
  text = replaceToken(text, "__TASK_ID__", name);
  text = replaceToken(text, "__TARGET__", target);
  text = replaceToken(text, "__MODE__", mode);
  text = replaceToken(text, "__INTEGRATION_BRANCH__", integration);
  text = replaceToken(text, "__TASK_BRANCH__", task);
  text = replaceToken(text, "__BASE_SHA__", baseSha);

  fs.mkdirSync(taskDir);
  const output = path.join(taskDir, "PACKAGE.md");
  fs.writeFileSync(output, text, { encoding: "utf8", flag: "wx" });
  console.log(path.relative(process.cwd(), output) || output);
}

function commandCheck(tokens) {
  const args = parseArgs(tokens, new Set(["package", "head", "phase"]));
  const liveHead = oneLine(args.head, "head");
  if (!SHA.test(liveHead)) fail("head must be a 40-character commit SHA");
  const phase = oneLine(args.phase, "phase");
  if (!PHASES.has(phase)) fail("phase must be diagnose, prepare, execute, or close");

  const packagePath = resolvePackage(args.package);
  if (!fs.existsSync(packagePath)) fail(`PACKAGE.md is missing: ${packagePath}`);
  const text = fs.readFileSync(packagePath, "utf8");
  const state = validateShape(text, liveHead);

  if (phase === "diagnose") {
    console.log("orchestrator: PASS (diagnose)");
    return;
  }

  requireReady(state);

  if (phase === "prepare") {
    if (state.values.MODE !== "PREPARE_ONLY") fail("prepare requires MODE=PREPARE_ONLY");
    if (state.values.STATUS !== "PREPARED") fail("prepare requires STATUS=PREPARED");
    if (state.values.CLOSURE !== "OPEN") fail("PREPARE_ONLY must not claim execution closure");
    console.log("orchestrator: PASS (prepare)");
    return;
  }

  if (state.values.MODE !== "EXECUTE_END_TO_END") fail(`${phase} requires MODE=EXECUTE_END_TO_END`);
  if (!new Set(["READY", "EXECUTING", "BLOCKED", "VERIFYING", "CLOSED"]).has(state.values.STATUS)) {
    fail("STATUS is not execution-ready");
  }

  if (phase === "execute") {
    console.log("orchestrator: PASS (execute)");
    return;
  }

  if (state.values.STATUS !== "CLOSED") fail("STATUS must be CLOSED");
  if (state.values.INTEGRATION_OWNER === "UNASSIGNED") fail("INTEGRATION_OWNER must be assigned");
  requireYes(state.completion, "COMPLETION");
  if (state.values.CLOSURE !== "CLOSED") fail("CLOSURE must be CLOSED");
  if (!new Set(["YES", "NO"]).has(state.values.RUNTIME_REQUIRED)) {
    fail("RUNTIME_REQUIRED must be YES or NO");
  }
  if (state.values.RUNTIME_REQUIRED === "YES" && state.values.PRODUCT_EVIDENCE !== "PASS") {
    fail("runtime-required closure needs PRODUCT_EVIDENCE=PASS");
  }
  if (state.values.RUNTIME_REQUIRED === "NO" && state.values.PRODUCT_EVIDENCE !== "N/A") {
    fail("non-runtime closure needs PRODUCT_EVIDENCE=N/A");
  }

  const integrationHead = bullet(text, "Integration head");
  if (!integrationHead || !SHA.test(integrationHead)) fail("Closure Integration head must be a commit SHA");
  if (integrationHead.toLowerCase() !== liveHead.toLowerCase()) {
    fail("Closure Integration head differs from --head");
  }
  for (const key of ["Verification", "Runtime/product evidence", "Cleanup"]) {
    const value = bullet(text, key);
    if (!value || /^(?:UNSET|MISSING)$/i.test(value)) fail(`Closure ${key} evidence is missing`);
  }

  console.log("orchestrator: PASS (close)");
}

const [command, ...tokens] = process.argv.slice(2);
if (command === "new") commandNew(tokens);
else if (command === "check") commandCheck(tokens);
else fail("command must be new or check");
