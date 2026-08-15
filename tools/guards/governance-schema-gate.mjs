#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PROMPT_ROOT = path.join(ROOT, "tools", "prompting", "bthwani-orchestrator");
const PLAN_ROOT = path.join(ROOT, "plans", "diagnose-implementing");
const CONTRACT = path.join(PROMPT_ROOT, "00-ORCHESTRATOR.md");
const TEMPLATE = path.join(PLAN_ROOT, "PACKAGE.template.md");
const CLI = path.join(PLAN_ROOT, "orchestrator.mjs");
const README = path.join(PLAN_ROOT, "README.md");
const PACKAGE_JSON = path.join(ROOT, "package.json");
const REQUIRED_COMMAND_GATE = path.join(ROOT, "tools", "guards", "required-command-integrity-gate.mjs");
let failed = false;

function fail(message) {
  console.error(`governance-schema-gate: FAIL: ${message}`);
  failed = true;
}

function requireFile(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    fail(`missing ${path.relative(ROOT, file)}`);
    return "";
  }
  return fs.readFileSync(file, "utf8");
}

function requireMarkers(label, text, markers) {
  for (const marker of markers) if (!text.includes(marker)) fail(`${label} missing ${marker}`);
}

function rejectMarkers(label, text, patterns) {
  for (const [name, pattern] of patterns) if (pattern.test(text)) fail(`${label}: ${name}`);
}

function rowAfter(text, heading, row) {
  const marker = `## ${heading}`;
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`fixture heading missing: ${heading}`);
  const separatorStart = text.indexOf("|---", start);
  const separatorEnd = text.indexOf("\n", separatorStart);
  if (separatorStart < 0 || separatorEnd < 0) throw new Error(`fixture separator missing: ${heading}`);
  return `${text.slice(0, separatorEnd + 1)}${row}\n${text.slice(separatorEnd + 1)}`;
}

const promptEntries = fs.existsSync(PROMPT_ROOT) ? fs.readdirSync(PROMPT_ROOT).sort() : [];
if (promptEntries.join("\n") !== "00-ORCHESTRATOR.md") {
  fail("orchestrator prompt surface must contain only 00-ORCHESTRATOR.md");
}

const contract = requireFile(CONTRACT);
const template = requireFile(TEMPLATE);
const cli = requireFile(CLI);
const readme = requireFile(README);
const packageText = requireFile(PACKAGE_JSON);
const requiredCommandGate = requireFile(REQUIRED_COMMAND_GATE);

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
  "BTHWANI_ORCHESTRATOR_SCHEMA: 5",
  "CANONICAL_SURFACE: 4_FILES",
  "CLI_MODEL: ONE_TOOL_THREE_COMMANDS",
  "STATE_MODEL: EVIDENCE_DERIVED",
  "PRIORITY_POLICY: SYSTEMIC_LEVERAGE",
  "ACCOUNTING_POLICY: ZERO_SILENT_MATERIAL_ELEMENT",
  "CLOSURE_POLICY: EXACT_CANDIDATE_EVIDENCE_ONLY",
  "LEGACY_POLICY: V1_V4_HISTORICAL_EVIDENCE_ONLY",
  "HOLD → PROMOTED",
  "DEEPENED_ENOUGH_TO_RANK",
  "PROVEN_CANNOT_OUTRANK",
  "Task Branch green ≠ Integration Target green",
  "FINAL_CANDIDATE",
  "final read-only verification",
]);

requireMarkers("PACKAGE.template.md", template, [
  "SCHEMA: BTHWANI_PACKAGE_V5",
  "## Operational Coverage",
  "## Root-Cause Graph",
  "## Ledger",
  "## Frontier",
  "## Evidence",
  "## Closure",
  "- Integration head: SELF",
  "- Final candidate: SELF",
]);

rejectMarkers("PACKAGE.template.md", template, [
  ["SELF_DECLARED_READINESS_FORBIDDEN", /^READINESS:/m],
  ["SELF_DECLARED_ACCOUNTING_FORBIDDEN", /^UNACCOUNTED:/m],
  ["SELF_DECLARED_COMPLETION_FORBIDDEN", /^COMPLETION:/m],
  ["SELF_DECLARED_STATUS_FORBIDDEN", /^STATUS:/m],
  ["V4_SCHEMA_FORBIDDEN", /BTHWANI_PACKAGE_V4/],
]);

requireMarkers("orchestrator.mjs", cli, [
  'const SCHEMA = "BTHWANI_PACKAGE_V5"',
  'const PHASES = new Set(["diagnose", "prepare", "execute", "verify", "close"])',
  'command === "new"',
  'command === "check"',
  'command === "state"',
  "remoteBranchSha",
  "currentBranch",
  "merge-base",
  "semanticCheckForTests",
  "EVD-FINAL-ADVERSARIAL",
  "EVD-NO-MATERIAL-FINDINGS",
  "new package requires TASK_BRANCH to start exactly",
  "must run on exact TASK_BRANCH HEAD",
  "TASK_BRANCH has not been fully integrated into the live Integration Target",
  "close must run on exact live Integration Target HEAD",
  "PROMOTED lower-layer observation requires RC",
  "operational graph",
  '{ candidate: "TASK_HEAD" }',
]);

rejectMarkers("orchestrator.mjs", cli, [
  ["AGENT_SUPPLIED_HEAD_AUTHORITY_FORBIDDEN", /--head\b|args\.head\b/],
  ["V4_SCHEMA_FORBIDDEN", /BTHWANI_PACKAGE_V4/],
  ["SELF_DECLARED_READINESS_CONSUMPTION_FORBIDDEN", /parseAssignments\([^)]*READINESS|requireYes\(state\.readiness/],
]);

if (readme) {
  requireMarkers("README.md", readme, [
    "DERIVED_SUPPORT / NAVIGATION_ONLY",
    "BTHWANI_PACKAGE_V5",
    "orchestrator.mjs state",
  ]);
  rejectMarkers("README.md", readme, [["README_AUTHORITY_FORBIDDEN", /AUTHORITATIVE|SOURCE_OF_TRUTH/i]]);
}

const forbiddenRootPlan = /^(?:_template|frontier-derivation-gate\.mjs|migrate-package-v3(?:-core)?\.mjs|new-package(?:-core)?\.mjs|new-sequence(?:-core)?\.mjs|operational-root-gate(?:-core)?\.mjs|root-anchor-gate(?:-core)?\.mjs|root-cause-priority-gate(?:-core)?\.mjs|task-isolation-gate(?:-core)?\.mjs|validate-package(?:-core)?\.mjs|expand-v3-.+)$/i;
if (fs.existsSync(PLAN_ROOT)) {
  for (const entry of fs.readdirSync(PLAN_ROOT)) if (forbiddenRootPlan.test(entry)) fail(`obsolete V3 public artifact remains: ${entry}`);
}

for (const dir of [
  path.join(ROOT, "tools", "guards", "orchestrator"),
  path.join(ROOT, "tools", "orchestrator"),
]) {
  if (fs.existsSync(dir)) fail(`obsolete orchestrator implementation remains: ${path.relative(ROOT, dir)}`);
}

const syntax = spawnSync(process.execPath, ["--check", CLI], { encoding: "utf8" });
if (syntax.status !== 0) fail(`orchestrator.mjs syntax check failed: ${syntax.stderr.trim()}`);

function fixture({ mode = "EXECUTE_END_TO_END", frontierState = "READY", full = false, prepare = false } = {}) {
  const zero = "0".repeat(40);
  let text = template
    .replaceAll("__TASK_ID__", "guard-fixture")
    .replaceAll("__TARGET__", "all")
    .replaceAll("__MODE__", mode)
    .replaceAll("__INTEGRATION_BRANCH__", "A")
    .replaceAll("__TASK_BRANCH__", "task/guard-fixture")
    .replaceAll("__BASE_SHA__", zero);

  text = rowAfter(
    text,
    "Operational Coverage",
    "| OP-ROOT | SYSTEM_ROOT | ROOT | Material operational root reconciled | PROVEN | EVD-ROOT |",
  );
  text = rowAfter(
    text,
    "Root-Cause Graph",
    "| RC-001 | Root ownership contradiction | OP-ROOT | EVD-RC-001 | NONE | CON-001 | Removes duplicate truth | 1 | DEEPENED_ENOUGH_TO_RANK | READY |",
  );
  const ledgerRows = [
    "| FINDING | FND-001 | RC-001 | Material contradiction mapped | RESOLVED | EVD-RC-001 |",
    "| DECISION | DEC-001 | RC-001 | Derived decision propagated | RESOLVED | EVD-RC-001 |",
    "| CONSUMER | CON-001 | RC-001 | Required consumer reconciled | RESOLVED | EVD-CONSUMERS |",
    "| DEPENDENCY | DEP-001 | RC-001 | Dependency dispositioned | RESOLVED | EVD-RC-001 |",
    "| SCOPE_DELTA | SCOPE-001 | RC-001 | Blast radius accounted | RESOLVED | EVD-RC-001 |",
    "| LOWER_LAYER | LOW-001 | RC-001 | Early technical symptom dispositioned | DISPOSITIONED | EVD-RC-001 |",
    `| CLEANUP | CLN-001 | RC-001 | Superseded truth removed | ${full ? "DONE" : "PLANNED"} | ${full ? "EVD-CLEANUP" : "EVD-VERIFICATION-PLAN"} |`,
  ];
  for (const row of ledgerRows.reverse()) text = rowAfter(text, "Ledger", row);

  const state = prepare ? "PREPARED" : frontierState;
  text = rowAfter(
    text,
    "Frontier",
    `| WORK-001 | RC-001 | NONE | Canonical cutover | ownership | owner | NO | ${state} | ${full ? "EVD-IMPLEMENTATION,EVD-VERIFICATION" : "EVD-VERIFICATION-PLAN"} |`,
  );

  const evidenceRows = [
    "| EVD-ROOT | Root coverage proof | operational-root-check | BASE | repo | PASS | invalidate on root/authority change |",
    "| EVD-NEGATIVE-SPACE | Negative-space challenge | negative-space-check | BASE | repo | PASS | invalidate on scope change |",
    "| EVD-ADVERSARIAL | Adversarial diagnosis | adversarial-check | BASE | repo | PASS | invalidate on causal graph change |",
    "| EVD-VERIFICATION-PLAN | Verification defined before writes | verification-plan | BASE | repo | PASS | invalidate on solution/scope change |",
    "| EVD-RC-001 | Root cause evidence | causal-trace | BASE | repo | PASS | invalidate on owner/contract change |",
    "| EVD-CONSUMERS | Consumer reconciliation | consumer-readback | TASK_HEAD | repo | PASS | invalidate on consumer change |",
  ];
  if (full) {
    evidenceRows.push(
      "| EVD-IMPLEMENTATION | Root treatment implemented | implementation-check | TASK_HEAD | repo | PASS | invalidate on source write |",
      "| EVD-CLEANUP | Cleanup completed | cleanup-check | TASK_HEAD | repo | PASS | invalidate on source write |",
      "| EVD-VERIFICATION | Exact candidate verification | final-read-only-check | SELF | repo | PASS | invalidate on any source write |",
      "| EVD-GOVERNANCE | Governance/self-guard verification | governance-schema-gate | SELF | repo | PASS | invalidate on governance/source write |",
      "| EVD-FINAL-ADVERSARIAL | Final adversarial review | adversarial-final | SELF | repo | PASS | invalidate on any source write |",
      "| EVD-RUNTIME | Runtime not required for fixture | scope-classification | N/A | repo | N/A | invalidate if runtime becomes required |",
    );
  }
  for (const row of evidenceRows.reverse()) text = rowAfter(text, "Evidence", row);

  if (full) {
    text = text
      .replace("INTEGRATION_OWNER: UNASSIGNED", "INTEGRATION_OWNER: owner")
      .replace("RUNTIME_REQUIRED: UNSET", "RUNTIME_REQUIRED: NO")
      .replace("- Verification:", "- Verification: EVD-VERIFICATION")
      .replace("- Runtime/product evidence:", "- Runtime/product evidence: N/A by scope; EVD-RUNTIME")
      .replace("- Cleanup:", "- Cleanup: EVD-CLEANUP")
      .replace("- Governance:", "- Governance: EVD-GOVERNANCE")
      .replace("- Final adversarial:", "- Final adversarial: EVD-FINAL-ADVERSARIAL");
  }
  return text;
}

function noMaterialFixture() {
  const zero = "0".repeat(40);
  let text = template
    .replaceAll("__TASK_ID__", "guard-no-material")
    .replaceAll("__TARGET__", "all")
    .replaceAll("__MODE__", "PREPARE_ONLY")
    .replaceAll("__INTEGRATION_BRANCH__", "A")
    .replaceAll("__TASK_BRANCH__", "task/guard-no-material")
    .replaceAll("__BASE_SHA__", zero);
  text = rowAfter(
    text,
    "Operational Coverage",
    "| OP-ROOT | SYSTEM_ROOT | ROOT | Material operational root reconciled with no material findings | PROVEN | EVD-ROOT |",
  );
  for (const row of [
    "| EVD-ROOT | Root coverage proof | operational-root-check | BASE | repo | PASS | invalidate on root/authority change |",
    "| EVD-NEGATIVE-SPACE | Negative-space challenge | negative-space-check | BASE | repo | PASS | invalidate on scope change |",
    "| EVD-ADVERSARIAL | Adversarial diagnosis | adversarial-check | BASE | repo | PASS | invalidate on causal graph change |",
    "| EVD-VERIFICATION-PLAN | Verification defined | verification-plan | BASE | repo | PASS | invalidate on scope change |",
    "| EVD-NO-MATERIAL-FINDINGS | No material findings remain | adversarial-no-findings | BASE | repo | PASS | invalidate on new material evidence |",
  ].reverse()) text = rowAfter(text, "Evidence", row);
  return text;
}

let semanticCheckForTests;
try {
  ({ semanticCheckForTests } = await import(`${pathToFileURL(CLI).href}?gate=${Date.now()}`));
} catch (error) {
  fail(`cannot import orchestrator.mjs for adversarial tests: ${error.message}`);
}

function expectPass(label, text, phase) {
  if (!semanticCheckForTests) return;
  try {
    semanticCheckForTests(text, phase);
  } catch (error) {
    fail(`${label} unexpectedly failed: ${error.message}`);
  }
}

function expectFail(label, text, phase, expectedFragment) {
  if (!semanticCheckForTests) return;
  try {
    semanticCheckForTests(text, phase);
    fail(`${label} unexpectedly passed`);
  } catch (error) {
    if (expectedFragment && !String(error.message).includes(expectedFragment)) {
      fail(`${label} failed for wrong reason: ${error.message}`);
    }
  }
}

const goodDiagnose = fixture();
expectPass("positive diagnose fixture", goodDiagnose, "diagnose");
expectPass("positive execute fixture", goodDiagnose, "execute");
expectPass("positive prepare fixture", fixture({ mode: "PREPARE_ONLY", prepare: true }), "prepare");
expectPass("positive no-material-findings fixture", noMaterialFixture(), "diagnose");
const goodFull = fixture({ frontierState: "COMPLETE", full: true });
expectPass("positive verify fixture", goodFull, "verify");
expectPass("positive close semantic fixture", goodFull, "close");

expectFail(
  "empty operational coverage",
  goodDiagnose.replace("| OP-ROOT | SYSTEM_ROOT | ROOT | Material operational root reconciled | PROVEN | EVD-ROOT |\n", ""),
  "diagnose",
  "operational coverage is empty",
);
expectFail(
  "unknown operational evidence",
  goodDiagnose.replace("| OP-ROOT | SYSTEM_ROOT | ROOT | Material operational root reconciled | PROVEN | EVD-ROOT |", "| OP-ROOT | SYSTEM_ROOT | ROOT | Material operational root reconciled | PROVEN | EVD-404 |"),
  "diagnose",
  "OP-ROOT references unknown Evidence EVD-404",
);
expectFail(
  "operational parent cycle",
  goodDiagnose.replace("| OP-ROOT | SYSTEM_ROOT | ROOT |", "| OP-ROOT | SYSTEM_ROOT | OP-ROOT |"),
  "diagnose",
  "operational graph dependency cycle",
);
expectFail(
  "root-cause dependency cycle",
  goodDiagnose.replace("| RC-001 | Root ownership contradiction | OP-ROOT | EVD-RC-001 | NONE |", "| RC-001 | Root ownership contradiction | OP-ROOT | EVD-RC-001 | RC-001 |"),
  "diagnose",
  "root-cause graph dependency cycle",
);
expectFail(
  "frontier dependency cycle",
  goodDiagnose.replace("| WORK-001 | RC-001 | NONE |", "| WORK-001 | RC-001 | WORK-001 |"),
  "diagnose",
  "frontier dependency cycle",
);
expectFail(
  "unknown RC reference",
  goodDiagnose.replace("| FINDING | FND-001 | RC-001 |", "| FINDING | FND-001 | RC-404 |"),
  "diagnose",
  "references unknown RC RC-404",
);
expectFail(
  "lower-layer HOLD",
  goodDiagnose.replace("| LOWER_LAYER | LOW-001 | RC-001 | Early technical symptom dispositioned | DISPOSITIONED |", "| LOWER_LAYER | LOW-001 | RC-001 | Early technical symptom dispositioned | HOLD |"),
  "diagnose",
  "unaccounted material ledger rows",
);
expectFail(
  "promoted lower-layer without RC",
  goodDiagnose.replace("| LOWER_LAYER | LOW-001 | RC-001 | Early technical symptom dispositioned | DISPOSITIONED |", "| LOWER_LAYER | LOW-001 | NONE | Early technical symptom dispositioned | PROMOTED |"),
  "diagnose",
  "PROMOTED lower-layer observation requires RC",
);
expectFail(
  "unknown consumer",
  goodDiagnose.replace("| CON-001 | Removes duplicate truth |", "| CON-404 | Removes duplicate truth |"),
  "diagnose",
  "unknown/non-consumer CON-404",
);
expectFail(
  "blocked execution",
  goodDiagnose.replace("| owner | NO | READY |", "| owner | NO | BLOCKED |"),
  "execute",
  "execute cannot pass with BLOCKED",
);
expectFail(
  "verify with stale implementation candidate",
  goodFull.replace("| EVD-IMPLEMENTATION | Root treatment implemented | implementation-check | TASK_HEAD |", "| EVD-IMPLEMENTATION | Root treatment implemented | implementation-check | BASE |"),
  "verify",
  "EVD-IMPLEMENTATION must be bound to Candidate=TASK_HEAD",
);
expectFail(
  "verify without implementation evidence",
  goodFull.replace("| EVD-IMPLEMENTATION | Root treatment implemented | implementation-check | TASK_HEAD | repo | PASS | invalidate on source write |\n", ""),
  "verify",
  "unknown Evidence EVD-IMPLEMENTATION",
);
expectFail(
  "close without final adversarial",
  goodFull.replace("| EVD-FINAL-ADVERSARIAL | Final adversarial review | adversarial-final | SELF | repo | PASS | invalidate on any source write |\n", ""),
  "close",
  "missing required evidence EVD-FINAL-ADVERSARIAL",
);

if (failed) process.exit(1);
console.log("governance-schema-gate: PASS");
