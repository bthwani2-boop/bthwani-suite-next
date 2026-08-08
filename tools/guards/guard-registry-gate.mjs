import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, repoRoot } from "./_guard-utils.mjs";
import { resolveWorkflowInventory } from "./_workflow-registry.mjs";

const guardId = "guard-registry-gate";
const violations = [];
const registryRelative = "governance/guards/guard-registry.json";
const assuranceRelative = "governance/guards/guard-assurance.json";
const guardSetsRelative = "governance/guards/guard-sets.json";
const packageRelative = "package.json";
const workflowsRoot = ".github/workflows";
const workflowsDir = path.join(repoRoot, workflowsRoot);
const retiredRegistrationRoot = "governance/guards/registrations";
const immutableCoreWorkflows = [
  "ci-backends.yml", "ci-node-diagnostics.yml", "ci-node-verification.yml", "ci-policy.yml", "ci-runtime.yml", "ci.yml",
  "dsh-database.yml", "lockfile-integrity.yml", "manual-deep-verification.yml",
].sort();
const aggregateScripts = new Set([
  "guard:logic-all", "guard:repo-all", "guard:performance-all", "guard:governance-all",
  "guard:tools-v5-all", "guard:tools-v5-registry", "guard:tools-v5-ci", "guard:journey:full",
]);

function readJson(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) { violations.push({ file: relativePath, line: 0, message: "MISSING_REQUIRED_FILE" }); return undefined; }
  try { return JSON.parse(fs.readFileSync(fullPath, "utf8")); }
  catch (error) { violations.push({ file: relativePath, line: 0, message: `INVALID_JSON ${error.message}` }); return undefined; }
}
function readText(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) { violations.push({ file: relativePath, line: 0, message: "MISSING_REQUIRED_FILE" }); return ""; }
  return fs.readFileSync(fullPath, "utf8");
}
function requireMarkers(relativePath, content, markers) {
  for (const marker of markers) if (!content.includes(marker)) violations.push({ file: relativePath, line: 0, message: `REQUIRED_MARKER_MISSING ${marker}` });
}
function verifyPinnedUses(relativePath, content) {
  for (const match of content.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+).*$/gm)) {
    const target = match[1];
    if (target.startsWith("./") || target.startsWith("docker://")) continue;
    if (!/@[a-f0-9]{40}$/i.test(target)) violations.push({ file: relativePath, line: lineNumber(content, match.index ?? 0), message: `EXTERNAL_ACTION_NOT_PINNED_TO_SHA ${target}` });
  }
}
function verifyCheckoutCredentials(relativePath, content) {
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (!/uses:\s*actions\/checkout@[a-f0-9]{40}/i.test(lines[index])) continue;
    const block = lines.slice(index, Math.min(lines.length, index + 14)).join("\n");
    if (!/persist-credentials:\s*false\b/.test(block)) violations.push({ file: relativePath, line: index + 1, message: "CHECKOUT_MUST_DISABLE_PERSISTED_CREDENTIALS" });
  }
}

if (fs.existsSync(path.join(repoRoot, retiredRegistrationRoot))) violations.push({ file: retiredRegistrationRoot, line: 0, message: "PARALLEL_GUARD_REGISTRATION_LAYER_FORBIDDEN" });

const registry = readJson(registryRelative);
const assurance = readJson(assuranceRelative);
const packageJson = readJson(packageRelative);
const guardSets = readJson(guardSetsRelative);
const entries = Array.isArray(registry?.entries) ? registry.entries : [];
const assuranceEntries = Array.isArray(assurance?.entries) ? assurance.entries : [];
const scripts = packageJson?.scripts ?? {};
const entryById = new Map();
const registeredScripts = new Set();
const sourceOwners = new Map();

for (const entry of entries) {
  if (!entry?.id) { violations.push({ file: registryRelative, line: 0, message: "MALFORMED_ENTRY_MISSING_ID" }); continue; }
  if (entryById.has(entry.id)) violations.push({ file: registryRelative, line: 0, message: `DUPLICATE_GUARD_ID ${entry.id}` });
  entryById.set(entry.id, entry);
  if (entry.kind === "DIAGNOSTIC" && entry.exit_level !== "warn") violations.push({ file: registryRelative, line: 0, message: `DIAGNOSTIC_MUST_WARN ${entry.id}` });
  if (entry.exit_level === "warn" && entry.kind !== "DIAGNOSTIC") violations.push({ file: registryRelative, line: 0, message: `WARN_GUARD_MUST_BE_DIAGNOSTIC ${entry.id}` });
  if (entry.script) {
    if (registeredScripts.has(entry.script)) violations.push({ file: registryRelative, line: 0, message: `DUPLICATE_GUARD_SCRIPT ${entry.script}` });
    registeredScripts.add(entry.script);
    if (!aggregateScripts.has(entry.script) && !scripts[entry.script]) violations.push({ file: registryRelative, line: 0, message: `MISSING_PACKAGE_SCRIPT ${entry.id} -> ${entry.script}` });
    if (/\|\|\s*true|continue-on-error|catch\s*\(/i.test(scripts[entry.script] ?? "")) violations.push({ file: packageRelative, line: 0, message: `FAIL_GUARD_SCRIPT_SWALLOWS_FAILURE ${entry.script}` });
  }
  if (entry.source_file) {
    const source = path.join(repoRoot, entry.source_file);
    if (!fs.existsSync(source)) violations.push({ file: registryRelative, line: 0, message: `MISSING_SOURCE_FILE ${entry.id} -> ${entry.source_file}` });
    if (sourceOwners.has(entry.source_file) && sourceOwners.get(entry.source_file) !== entry.id && !["foundation", "journey", "journey-runtime"].includes(entry.id)) {
      violations.push({ file: registryRelative, line: 0, message: `DUPLICATE_GUARD_SOURCE ${entry.source_file}` });
    } else sourceOwners.set(entry.source_file, entry.id);
  }
}

const assuranceById = new Map();
for (const item of assuranceEntries) {
  if (assuranceById.has(item.guardId)) violations.push({ file: assuranceRelative, line: 0, message: `DUPLICATE_GUARD_ASSURANCE ${item.guardId}` });
  assuranceById.set(item.guardId, item);
  if (!entryById.has(item.guardId)) violations.push({ file: assuranceRelative, line: 0, message: `ASSURANCE_REFERENCES_UNKNOWN_GUARD ${item.guardId}` });
  if (item.closureEligible !== false) violations.push({ file: assuranceRelative, line: 0, message: `GUARD_MAY_NOT_SELF_GRANT_CLOSURE ${item.guardId}` });
}
for (const entry of entries) {
  if (entry.exit_level === "fail" && !assuranceById.has(entry.id)) violations.push({ file: assuranceRelative, line: 0, message: `FAIL_GUARD_ASSURANCE_MISSING ${entry.id}` });
  if (entry.exit_level === "warn" && assuranceById.has(entry.id)) violations.push({ file: assuranceRelative, line: 0, message: `DIAGNOSTIC_MUST_NOT_BE_PROMOTED_TO_GUARD_ASSURANCE ${entry.id}` });
}

for (const requiredId of ["governance-schema", "agent-governance", "authority-separation", "guard-registry", "direct-work-branch-execution", "sdlc", "workflow-lint", "workflow-security", "actions-pin", "a11y-runtime"]) {
  if (entryById.get(requiredId)?.exit_level !== "fail") violations.push({ file: registryRelative, line: 0, message: `REQUIRED_FAIL_LEVEL_GUARD_DRIFT ${requiredId}` });
}
for (const scriptName of Object.keys(scripts).filter((name) => name.startsWith("guard:"))) if (!aggregateScripts.has(scriptName) && !registeredScripts.has(scriptName)) violations.push({ file: packageRelative, line: 0, message: `UNREGISTERED_GUARD_SCRIPT ${scriptName}` });

const canonicalGuardIds = new Set([...(guardSets?.guardSets?.foundation ?? []), ...(guardSets?.guardSets?.journey ?? []), ...(guardSets?.guardSets?.governance ?? [])]);
for (const id of canonicalGuardIds) {
  const entry = entryById.get(id);
  if (!entry) violations.push({ file: guardSetsRelative, line: 0, message: `GUARD_SET_REFERENCES_UNKNOWN_GUARD ${id}` });
  else if (entry.exit_level !== "fail") violations.push({ file: guardSetsRelative, line: 0, message: `GUARD_SET_MAY_NOT_USE_DIAGNOSTIC ${id}` });
}

const direct = entryById.get("direct-work-branch-execution");
if (direct?.source_file !== "tools/guards/direct-work-branch-execution-gate.mjs") violations.push({ file: registryRelative, line: 0, message: "DIRECT_WORK_SOURCE_DRIFT" });
for (const required of ["tools/guards/direct-work-branch-execution-gate.mjs", "tools/guards/direct-work-branch-execution-gate.test.mjs", "governance/authority/direct-work-branch-execution-policy.json", "governance/authority/direct-work-branch-execution-policy.schema.json"]) {
  if (!fs.existsSync(path.join(repoRoot, required))) violations.push({ file: required, line: 0, message: "DIRECT_WORK_CONTRACT_TARGET_MISSING" });
}

const workflowInventory = resolveWorkflowInventory(repoRoot, immutableCoreWorkflows);
violations.push(...workflowInventory.violations);
const expectedWorkflowFiles = workflowInventory.expectedFiles;
if (!fs.existsSync(workflowsDir)) violations.push({ file: workflowsRoot, line: 0, message: "WORKFLOW_DIRECTORY_MISSING" });
else {
  const workflowFiles = fs.readdirSync(workflowsDir).filter((name) => /\.ya?ml$/i.test(name)).sort();
  if (JSON.stringify(workflowFiles) !== JSON.stringify(expectedWorkflowFiles)) violations.push({ file: workflowsRoot, line: 0, message: `WORKFLOW_INVENTORY_DRIFT expected=${expectedWorkflowFiles.join(",")} found=${workflowFiles.join(",")}` });
  for (const fileName of workflowFiles) {
    const relativePath = `${workflowsRoot}/${fileName}`;
    const content = readText(relativePath);
    if (!/^permissions:\s*(?:\n|$)/m.test(content) && !/^permissions:\s*\{\s*\}\s*$/m.test(content)) violations.push({ file: relativePath, line: 0, message: "WORKFLOW_MUST_DECLARE_EXPLICIT_TOP_LEVEL_PERMISSIONS" });
    if (/pull_request_target\s*:/m.test(content)) violations.push({ file: relativePath, line: 0, message: "PULL_REQUEST_TARGET_FORBIDDEN" });
    if (/contents:\s*write\b|statuses:\s*write\b|write-all/i.test(content)) violations.push({ file: relativePath, line: 0, message: "WORKFLOW_WRITE_PERMISSION_FORBIDDEN" });
    if (/\b(?:git\s+(?:push|commit|reset\s+--hard)|gh\s+pr\s+(?:create|merge))\b/i.test(content)) violations.push({ file: relativePath, line: 0, message: "CI_SOURCE_OR_BRANCH_MUTATION_FORBIDDEN" });
    if (/\b(?:gofmt\s+-w|prettier\s+--write|eslint\s+--fix|nx\b[^\n]*--fix|sed\s+-i|perl\s+-pi)\b/i.test(content)) violations.push({ file: relativePath, line: 0, message: "CI_SOURCE_REWRITE_FORBIDDEN" });
    if (/@latest\b/.test(content)) violations.push({ file: relativePath, line: 0, message: "LATEST_VERSION_FORBIDDEN_IN_WORKFLOW" });
    verifyPinnedUses(relativePath, content);
    verifyCheckoutCredentials(relativePath, content);
  }

  requireMarkers(`${workflowsRoot}/ci.yml`, readText(`${workflowsRoot}/ci.yml`), ["workflow_dispatch:", "pull_request:", "push:", "branches: [\"**\"]", "BThwani CI result", "uses: ./.github/workflows/ci-policy.yml"]);
  requireMarkers(`${workflowsRoot}/ci-policy.yml`, readText(`${workflowsRoot}/ci-policy.yml`), ["guard:governance-schema", "guard:agent-governance", "guard:authority-separation", "guard:guard-registry", "guard:sdlc", "guard:workflow-lint", "guard:workflow-security", "guard:actions-pin", "direct-work-branch-execution-gate.test.mjs", "direct-work-branch-execution-gate.mjs", "check-ci-source-immutability.mjs", "check-repository-hygiene.mjs", "check-portable-tracked-config.mjs", "generated-client-provenance.log"]);
  if (readText(`${workflowsRoot}/ci-policy.yml`).includes("openapi:generate:all")) violations.push({ file: `${workflowsRoot}/ci-policy.yml`, line: 0, message: "CI_GENERATED_SOURCE_MATERIALIZATION_FORBIDDEN" });
  requireMarkers(`${workflowsRoot}/lockfile-integrity.yml`, readText(`${workflowsRoot}/lockfile-integrity.yml`), ["name: BThwani Lockfile Integrity", "contents: read", "persist-credentials: false", "pnpm install --frozen-lockfile --ignore-scripts", "Reject tracked source mutation"]);
  if (fs.existsSync(path.join(workflowsDir, "lockfile-snapshot.yml"))) violations.push({ file: `${workflowsRoot}/lockfile-snapshot.yml`, line: 0, message: "RETIRED_LOCKFILE_SNAPSHOT_WORKFLOW_PRESENT" });
  requireMarkers(`${workflowsRoot}/manual-deep-verification.yml`, readText(`${workflowsRoot}/manual-deep-verification.yml`), ["name: BThwani Manual Deep Verification", "default: affected", "Resolve affected and risk-expanded mode", "Reject tracked source mutation", "read-only-exact-sha-verification", "persist-credentials: false"]);
}

fail(guardId, violations);
