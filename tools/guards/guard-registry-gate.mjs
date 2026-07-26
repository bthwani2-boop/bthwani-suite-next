import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, repoRoot } from "./_guard-utils.mjs";
import { resolveWorkflowInventory } from "./_workflow-registry.mjs";

const guardId = "guard-registry-gate";
const violations = [];
const warnings = [];
const registryRelative = "governance/guards/guard-registry.json";
const packageRelative = "package.json";
const manifestRelative = "tools/guards/guard-manifest.json";
const workflowsRoot = ".github/workflows";
const workflowsDir = path.join(repoRoot, workflowsRoot);
const immutableCoreWorkflows = [
  "ci-backends.yml",
  "ci-node-diagnostics.yml",
  "ci-node-verification.yml",
  "ci-policy.yml",
  "ci-runtime.yml",
  "ci.yml",
  "dsh-database.yml",
  "lockfile-snapshot.yml",
  "manual-deep-verification.yml",
].sort();

const workflowInventory = resolveWorkflowInventory(repoRoot, immutableCoreWorkflows);
violations.push(...workflowInventory.violations);
const expectedWorkflowFiles = workflowInventory.expectedFiles;

const aggregateScripts = new Set([
  "guard:logic-all",
  "guard:repo-all",
  "guard:performance-all",
  "guard:governance-all",
  "guard:tools-v5-all",
  "guard:tools-v5-registry",
  "guard:tools-v5-ci",
  "guard:journey:full",
]);

const canonicalSourceById = new Map([
  ["jrn-040-platform-change-sets", "tools/guards/platform-change-sets-gate.mjs"],
]);

function readJson(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    violations.push({ file: relativePath, line: 0, message: "MISSING_REQUIRED_FILE" });
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    violations.push({ file: relativePath, line: 0, message: `INVALID_JSON ${error.message}` });
    return undefined;
  }
}

function readText(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    violations.push({ file: relativePath, line: 0, message: "MISSING_REQUIRED_FILE" });
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireMarkers(relativePath, content, markers) {
  for (const marker of markers) {
    if (!content.includes(marker)) {
      violations.push({ file: relativePath, line: 0, message: `REQUIRED_MARKER_MISSING ${marker}` });
    }
  }
}

function verifyPinnedUses(relativePath, content) {
  for (const match of content.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+).*$/gm)) {
    const target = match[1];
    if (target.startsWith("./") || target.startsWith("docker://")) continue;
    if (!/@[a-f0-9]{40}$/i.test(target)) {
      violations.push({ file: relativePath, line: lineNumber(content, match.index ?? 0), message: `EXTERNAL_ACTION_NOT_PINNED_TO_SHA ${target}` });
    }
  }
}

function verifyCheckoutCredentials(relativePath, content) {
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (!/uses:\s*actions\/checkout@[a-f0-9]{40}/i.test(lines[index])) continue;
    const block = lines.slice(index, Math.min(lines.length, index + 14)).join("\n");
    if (!/persist-credentials:\s*false\b/.test(block)) {
      violations.push({ file: relativePath, line: index + 1, message: "CHECKOUT_MUST_DISABLE_PERSISTED_CREDENTIALS" });
    }
  }
}

const registry = readJson(registryRelative);
const packageJson = readJson(packageRelative);
const manifest = readJson(manifestRelative);
const entries = Array.isArray(registry?.entries) ? registry.entries : [];
const scripts = packageJson?.scripts ?? {};
const registeredScripts = new Set();
const entryById = new Map();

for (const entry of entries) {
  if (!entry?.id) {
    violations.push({ file: registryRelative, line: 0, message: "MALFORMED_ENTRY_MISSING_ID" });
    continue;
  }
  if (entryById.has(entry.id)) violations.push({ file: registryRelative, line: 0, message: `DUPLICATE_GUARD_ID ${entry.id}` });
  entryById.set(entry.id, entry);

  if (entry.script) {
    if (registeredScripts.has(entry.script)) violations.push({ file: registryRelative, line: 0, message: `DUPLICATE_GUARD_SCRIPT ${entry.script}` });
    registeredScripts.add(entry.script);
    if (!aggregateScripts.has(entry.script) && !scripts[entry.script]) violations.push({ file: registryRelative, line: 0, message: `MISSING_PACKAGE_SCRIPT ${entry.id} -> ${entry.script}` });
    if (/\|\|\s*true|continue-on-error|catch\s*\(/i.test(scripts[entry.script] ?? "")) violations.push({ file: packageRelative, line: 0, message: `FAIL_GUARD_SCRIPT_SWALLOWS_FAILURE ${entry.script}` });
  }

  const canonicalSource = canonicalSourceById.get(entry.id) ?? entry.source_file;
  if (canonicalSource) {
    if (!fs.existsSync(path.join(repoRoot, canonicalSource))) violations.push({ file: registryRelative, line: 0, message: `MISSING_SOURCE_FILE ${entry.id} -> ${canonicalSource}` });
    if (entry.source_file && entry.source_file !== canonicalSource) warnings.push(`registry source migration pending: ${entry.id} -> ${canonicalSource}`);
  }
}

for (const requiredId of ["governance-schema", "agent-governance", "authority-separation", "saas-governance", "guard-registry", "sdlc", "workflow-lint", "workflow-security", "actions-pin", "a11y-runtime"]) {
  if (entryById.get(requiredId)?.exit_level !== "fail") violations.push({ file: registryRelative, line: 0, message: `REQUIRED_FAIL_LEVEL_GUARD_DRIFT ${requiredId}` });
}

for (const scriptName of Object.keys(scripts).filter((name) => name.startsWith("guard:"))) {
  if (!aggregateScripts.has(scriptName) && !registeredScripts.has(scriptName)) violations.push({ file: packageRelative, line: 0, message: `UNREGISTERED_GUARD_SCRIPT ${scriptName}` });
}

const manifestGuardIds = new Set([...(manifest?.guardSets?.foundation ?? []), ...(manifest?.guardSets?.journey ?? []), ...(manifest?.guardSets?.governance ?? [])]);
for (const id of manifestGuardIds) {
  if (!entryById.has(id)) violations.push({ file: manifestRelative, line: 0, message: `MANIFEST_REFERENCES_UNKNOWN_GUARD ${id}` });
}

if (!fs.existsSync(workflowsDir)) {
  violations.push({ file: workflowsRoot, line: 0, message: "WORKFLOW_DIRECTORY_MISSING" });
} else {
  const workflowFiles = fs.readdirSync(workflowsDir).filter((name) => /\.ya?ml$/i.test(name)).sort();
  if (JSON.stringify(workflowFiles) !== JSON.stringify(expectedWorkflowFiles)) {
    violations.push({ file: workflowsRoot, line: 0, message: `WORKFLOW_INVENTORY_DRIFT expected=${expectedWorkflowFiles.join(",")} found=${workflowFiles.join(",")}` });
  }
  for (const fileName of workflowFiles) {
    const relativePath = `${workflowsRoot}/${fileName}`;
    const content = readText(relativePath);
    if (!/^permissions:\s*(?:\n|$)/m.test(content) && !/^permissions:\s*\{\s*\}\s*$/m.test(content)) violations.push({ file: relativePath, line: 0, message: "WORKFLOW_MUST_DECLARE_EXPLICIT_TOP_LEVEL_PERMISSIONS" });
    if (/pull_request_target\s*:/m.test(content)) violations.push({ file: relativePath, line: 0, message: "PULL_REQUEST_TARGET_FORBIDDEN" });
    if (/contents:\s*write\b|statuses:\s*write\b|write-all/i.test(content)) violations.push({ file: relativePath, line: 0, message: "WORKFLOW_WRITE_PERMISSION_FORBIDDEN" });
    if (/\b(?:git\s+(?:push|commit|reset\s+--hard)|gh\s+pr\s+(?:create|merge))\b/i.test(content)) violations.push({ file: relativePath, line: 0, message: "CI_SOURCE_OR_BRANCH_MUTATION_FORBIDDEN" });
    if (/\b(?:gofmt\s+-w|prettier\s+--write|eslint\s+--fix|nx\b[^\n]*--fix|sed\s+-i|perl\s+-pi)\b/i.test(content)) violations.push({ file: relativePath, line: 0, message: "CI_SOURCE_REWRITE_FORBIDDEN" });
    if (/@latest\b/i.test(content)) violations.push({ file: relativePath, line: 0, message: "LATEST_VERSION_FORBIDDEN_IN_WORKFLOW" });
    verifyPinnedUses(relativePath, content);
    verifyCheckoutCredentials(relativePath, content);
  }

  requireMarkers(`${workflowsRoot}/ci.yml`, readText(`${workflowsRoot}/ci.yml`), ["workflow_dispatch:", "pull_request:", "push:", "branches: [master]", "BThwani CI result", "uses: ./.github/workflows/ci-policy.yml"]);
  requireMarkers(`${workflowsRoot}/ci-policy.yml`, readText(`${workflowsRoot}/ci-policy.yml`), ["guard:governance-schema", "guard:agent-governance", "guard:authority-separation", "guard:saas-governance", "guard:guard-registry", "guard:sdlc", "guard:workflow-lint", "guard:workflow-security", "guard:actions-pin", "check-ci-source-immutability.mjs", "check-repository-hygiene.mjs", "check-portable-tracked-config.mjs"]);
  requireMarkers(`${workflowsRoot}/lockfile-snapshot.yml`, readText(`${workflowsRoot}/lockfile-snapshot.yml`), ["name: BThwani Lockfile Snapshot", "contents: read", "persist-credentials: false", "Upload lockfile candidate"]);
  requireMarkers(`${workflowsRoot}/manual-deep-verification.yml`, readText(`${workflowsRoot}/manual-deep-verification.yml`), ["name: BThwani Manual Deep Verification", "default: affected", "Resolve affected and risk-expanded mode", "Reject tracked source mutation", "read-only-exact-sha-verification", "persist-credentials: false"]);
}

for (const warning of warnings) console.warn(`guard-registry warning: ${warning}`);
fail(guardId, violations);
