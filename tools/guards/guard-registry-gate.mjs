import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "guard-registry-gate";
const violations = [];
const warnings = [];
const registryRelative = "governance/guards/guard-registry.json";
const packageRelative = "package.json";
const manifestRelative = "tools/guards/guard-manifest.json";
const foundationRunnerRelative = "tools/scripts/run-foundation-gate.ps1";
const journeyRunnerRelative = "tools/scripts/run-journey-gate.ps1";
const remediationRelative = ".github/workflows/remediation-analysis.yml";
const workflowsDir = path.join(repoRoot, ".github/workflows");
const actionsDir = path.join(repoRoot, ".github/actions");
const expectedWorkflowFiles = [
  "ci-backends.yml",
  "ci-node-diagnostics.yml",
  "ci-node-verification.yml",
  "ci-policy.yml",
  "ci-runtime.yml",
  "ci.yml",
  "dsh-database.yml",
  "remediation-analysis.yml",
].sort();

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

function externalUses(text) {
  return [...text.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+).*$/gm)]
    .map((match) => ({ target: match[1], index: match.index ?? 0 }))
    .filter(({ target }) => !target.startsWith("./") && !target.startsWith("docker://"));
}

function verifyPinnedUses(relativePath, content) {
  for (const { target, index } of externalUses(content)) {
    if (!/@[a-f0-9]{40}$/i.test(target)) {
      violations.push({
        file: relativePath,
        line: lineNumber(content, index),
        message: `EXTERNAL_ACTION_NOT_PINNED_TO_SHA ${target}`,
      });
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

function commandSwallowsFailure(command) {
  return /\|\|\s*true|continue-on-error|catch\s*\([^)]*\)\s*\{?[\s\S]*?console\.log|catch\s*\{[\s\S]*?console\.log/i.test(command);
}

function verifyRemediationWorkflow(relativePath, content) {
  requireMarkers(relativePath, content, [
    "name: BThwani Expert Live-Code Remediation",
    "workflow_dispatch:",
    "Forensic discovery and deterministic repair",
    "Logic, binding, duplication, and repository integrity",
    "Type, lint, test, and build verification",
    "backend and database",
    "Dependency, secret, workflow, and container security",
    "Integrated SaaS runtime proof",
    "Publish reviewed remediation pull request",
    "patch_sha256",
    "Unapproved deletion rejected",
    "contents: write",
    "pull-requests: write",
  ]);

  if (/^\s{2}(?:workflow_run|pull_request_target|schedule|repository_dispatch):/m.test(content)) {
    violations.push({ file: relativePath, line: 0, message: "REMEDIATION_MUST_REMAIN_MANUAL" });
  }
  if (/\bsecrets\.[A-Za-z0-9_]+\b/.test(content)) {
    violations.push({ file: relativePath, line: 0, message: "REMEDIATION_REPOSITORY_SECRET_FORBIDDEN" });
  }
  if ((content.match(/^\s*contents:\s*write\s*$/gm) ?? []).length !== 1) {
    violations.push({ file: relativePath, line: 0, message: "REMEDIATION_SINGLE_CONTENT_WRITE_BOUNDARY_REQUIRED" });
  }
  if (/git\s+push\s+(?:--force|-f)\b|gh\s+pr\s+merge\b/i.test(content)) {
    violations.push({ file: relativePath, line: 0, message: "REMEDIATION_FORCE_PUSH_OR_MERGE_FORBIDDEN" });
  }

  const publishStart = content.search(/^\s{2}publish:\s*$/m);
  const resultStart = content.search(/^\s{2}result:\s*$/m);
  if (publishStart < 0 || resultStart <= publishStart) {
    violations.push({ file: relativePath, line: 0, message: "REMEDIATION_PUBLISH_BOUNDARY_MISSING" });
  } else {
    const publish = content.slice(publishStart, resultStart);
    if (/^\s*(?:pnpm|npm|npx|yarn|node|go)\b/m.test(publish) || /uses:\s*\.\//m.test(publish)) {
      violations.push({ file: relativePath, line: 0, message: "REMEDIATION_WRITE_JOB_EXECUTES_REPOSITORY_CODE" });
    }
  }
}

const registry = readJson(registryRelative);
const packageJson = readJson(packageRelative);
const manifest = readJson(manifestRelative);
const entries = Array.isArray(registry?.entries) ? registry.entries : [];
const scripts = packageJson?.scripts ?? {};
const registeredScripts = new Set();
const registeredSources = new Set();
const entryById = new Map();

for (const entry of entries) {
  if (!entry?.id) {
    violations.push({ file: registryRelative, line: 0, message: "MALFORMED_ENTRY_MISSING_ID" });
    continue;
  }
  if (entryById.has(entry.id)) {
    violations.push({ file: registryRelative, line: 0, message: `DUPLICATE_GUARD_ID ${entry.id}` });
  }
  entryById.set(entry.id, entry);

  if (entry.script) {
    if (registeredScripts.has(entry.script)) {
      violations.push({ file: registryRelative, line: 0, message: `DUPLICATE_GUARD_SCRIPT ${entry.script}` });
    }
    registeredScripts.add(entry.script);
    if (!aggregateScripts.has(entry.script) && !scripts[entry.script]) {
      violations.push({ file: registryRelative, line: 0, message: `MISSING_PACKAGE_SCRIPT ${entry.id} -> ${entry.script}` });
    }
    if (entry.exit_level === "fail" && commandSwallowsFailure(scripts[entry.script] ?? "")) {
      violations.push({ file: packageRelative, line: 0, message: `FAIL_GUARD_SCRIPT_SWALLOWS_FAILURE ${entry.script}` });
    }
  }

  const canonicalSource = canonicalSourceById.get(entry.id) ?? entry.source_file;
  if (canonicalSource) {
    registeredSources.add(canonicalSource);
    if (!fs.existsSync(path.join(repoRoot, canonicalSource))) {
      violations.push({ file: registryRelative, line: 0, message: `MISSING_SOURCE_FILE ${entry.id} -> ${canonicalSource}` });
    }
    if (entry.source_file && entry.source_file !== canonicalSource) {
      warnings.push(`registry source migration pending: ${entry.id} -> ${canonicalSource}`);
    }
  }
}

for (const requiredId of [
  "governance-schema",
  "agent-governance",
  "authority-separation",
  "saas-governance",
  "guard-registry",
  "sdlc",
  "workflow-lint",
  "workflow-security",
  "actions-pin",
  "a11y-runtime",
]) {
  if (entryById.get(requiredId)?.exit_level !== "fail") {
    violations.push({ file: registryRelative, line: 0, message: `REQUIRED_FAIL_LEVEL_GUARD_DRIFT ${requiredId}` });
  }
}

for (const scriptName of Object.keys(scripts).filter((name) => name.startsWith("guard:"))) {
  if (!aggregateScripts.has(scriptName) && !registeredScripts.has(scriptName)) {
    violations.push({ file: packageRelative, line: 0, message: `UNREGISTERED_GUARD_SCRIPT ${scriptName}` });
  }
}

for (const [defaultScript, fullScript] of [
  ["journey:gate", "journey:gate:full"],
  ["guard:journey", "guard:journey:full"],
]) {
  if (!scripts[defaultScript] || /\s-Full\b/i.test(scripts[defaultScript])) {
    violations.push({ file: packageRelative, line: 0, message: `TARGETED_DEFAULT_SCRIPT_INVALID ${defaultScript}` });
  }
  if (!scripts[fullScript] || !/\s-Full\b/i.test(scripts[fullScript])) {
    violations.push({ file: packageRelative, line: 0, message: `EXPLICIT_FULL_SCRIPT_MISSING ${fullScript}` });
  }
}

const mandatoryGovernanceMarkers = [
  "guard:governance-schema",
  "guard:agent-governance",
  "guard:authority-separation",
  "guard:saas-governance",
  "guard:guard-registry",
  "guard:sdlc",
  "guard:cleanup-policy",
];
const governanceAggregate = scripts["guard:governance-all"] ?? "";
for (const marker of mandatoryGovernanceMarkers) {
  if (!governanceAggregate.includes(marker)) {
    violations.push({ file: packageRelative, line: 0, message: `GOVERNANCE_AGGREGATE_MISSING ${marker}` });
  }
}

for (const runnerRelative of [foundationRunnerRelative, journeyRunnerRelative]) {
  const runner = readText(runnerRelative);
  if (/\[switch\]\$Soft|\b-Soft\b/.test(runner)) {
    violations.push({ file: runnerRelative, line: 0, message: "SOFT_FAILURE_MODE_FORBIDDEN" });
  }
  if (!/RESULT:\s+PASS\s+scope=/.test(runner)) {
    violations.push({ file: runnerRelative, line: 0, message: "SCOPED_PASS_OUTPUT_REQUIRED" });
  }
  if (!/FIX_REQUIRED/.test(runner)) {
    violations.push({ file: runnerRelative, line: 0, message: "CANONICAL_FAILURE_DECISION_REQUIRED" });
  }
}

const manifestGuardIds = new Set([
  ...(manifest?.guardSets?.foundation ?? []),
  ...(manifest?.guardSets?.journey ?? []),
  ...(manifest?.guardSets?.governance ?? []),
]);
for (const id of manifestGuardIds) {
  if (!entryById.has(id)) {
    violations.push({ file: manifestRelative, line: 0, message: `MANIFEST_REFERENCES_UNKNOWN_GUARD ${id}` });
  }
}
for (const marker of mandatoryGovernanceMarkers.map((value) => value.replace(/^guard:/, ""))) {
  if (!(manifest?.guardSets?.governance ?? []).includes(marker)) {
    violations.push({ file: manifestRelative, line: 0, message: `GOVERNANCE_SET_MISSING ${marker}` });
  }
}

if (!fs.existsSync(workflowsDir)) {
  violations.push({ file: ".github/workflows", line: 0, message: "WORKFLOW_DIRECTORY_MISSING" });
} else {
  const workflowFiles = fs.readdirSync(workflowsDir).filter((name) => /\.ya?ml$/i.test(name)).sort();
  if (JSON.stringify(workflowFiles) !== JSON.stringify(expectedWorkflowFiles)) {
    violations.push({
      file: ".github/workflows",
      line: 0,
      message: `WORKFLOW_INVENTORY_DRIFT expected=${expectedWorkflowFiles.join(",")} found=${workflowFiles.join(",")}`,
    });
  }

  for (const fileName of workflowFiles) {
    const relativePath = `.github/workflows/${fileName}`;
    const content = fs.readFileSync(path.join(workflowsDir, fileName), "utf8");
    const isRemediation = relativePath === remediationRelative;

    if (!/^permissions:\s*(?:\n|$)/m.test(content) && !/^permissions:\s*\{\s*\}\s*$/m.test(content)) {
      violations.push({ file: relativePath, line: 0, message: "WORKFLOW_MUST_DECLARE_EXPLICIT_TOP_LEVEL_PERMISSIONS" });
    }
    if (/pull_request_target\s*:/m.test(content)) {
      violations.push({ file: relativePath, line: 0, message: "PULL_REQUEST_TARGET_FORBIDDEN" });
    }
    if (!isRemediation && /contents:\s*write\b|statuses:\s*write\b|write-all\b/i.test(content)) {
      violations.push({ file: relativePath, line: 0, message: "WORKFLOW_WRITE_PERMISSION_FORBIDDEN" });
    }
    if (!isRemediation && /\b(?:git\s+(?:push|commit|reset\s+--hard)|gh\s+pr\s+merge)\b/i.test(content)) {
      violations.push({ file: relativePath, line: 0, message: "CI_SOURCE_OR_BRANCH_MUTATION_FORBIDDEN" });
    }
    if (!isRemediation && /\b(?:gofmt\s+-w|prettier\s+--write|eslint\s+--fix|sed\s+-i|perl\s+-pi)\b/i.test(content)) {
      violations.push({ file: relativePath, line: 0, message: "CI_FIX_OR_SOURCE_REWRITE_COMMAND_FORBIDDEN" });
    }
    if (/@latest\b/i.test(content)) {
      violations.push({ file: relativePath, line: 0, message: "LATEST_VERSION_FORBIDDEN_IN_WORKFLOW" });
    }
    if (isRemediation) verifyRemediationWorkflow(relativePath, content);

    for (const match of content.matchAll(/\b(?:pnpm|npm|yarn)\s+(?:run\s+)?(guard:[A-Za-z0-9:_-]+)\b/g)) {
      if (!aggregateScripts.has(match[1]) && !registeredScripts.has(match[1])) {
        violations.push({ file: relativePath, line: lineNumber(content, match.index), message: `UNREGISTERED_WORKFLOW_GUARD ${match[1]}` });
      }
    }
    for (const match of content.matchAll(/node\s+(tools\/guards\/[A-Za-z0-9_./-]+(?:-gate\.mjs|no-broken-imports\.mjs))/g)) {
      if (!registeredSources.has(match[1])) {
        violations.push({ file: relativePath, line: lineNumber(content, match.index), message: `UNREGISTERED_DIRECT_WORKFLOW_GUARD ${match[1]}` });
      }
    }

    verifyPinnedUses(relativePath, content);
    verifyCheckoutCredentials(relativePath, content);
  }

  const ci = readText(".github/workflows/ci.yml");
  requireMarkers(".github/workflows/ci.yml", ci, [
    "workflow_dispatch:",
    "pull_request:",
    "push:",
    "branches: [master]",
    "cancel-in-progress: true",
    "BThwani CI result",
    "if: ${{ always() }}",
    "uses: ./.github/workflows/ci-policy.yml",
    "uses: ./.github/workflows/ci-node-diagnostics.yml",
    "uses: ./.github/workflows/ci-node-verification.yml",
    "uses: ./.github/workflows/ci-backends.yml",
    "uses: ./.github/workflows/ci-runtime.yml",
  ]);
  if ((ci.match(/^\s*concurrency:\s*$/gm) ?? []).length !== 1) {
    violations.push({ file: ".github/workflows/ci.yml", line: 0, message: "WORKFLOW_LEVEL_CONCURRENCY_ONLY" });
  }

  const policy = readText(".github/workflows/ci-policy.yml");
  requireMarkers(".github/workflows/ci-policy.yml", policy, [
    ...mandatoryGovernanceMarkers,
    "guard:workflow-lint",
    "guard:workflow-security",
    "guard:actions-pin",
    "check-ci-source-immutability.mjs",
    "check-repository-hygiene.mjs",
    "check-portable-tracked-config.mjs",
  ]);
}

if (fs.existsSync(actionsDir)) {
  const stack = [actionsDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/^action\.ya?ml$/.test(entry.name)) {
        const relativePath = toPosix(path.relative(repoRoot, full));
        verifyPinnedUses(relativePath, fs.readFileSync(full, "utf8"));
      }
    }
  }
}

for (const warning of warnings) console.warn(`guard-registry warning: ${warning}`);
fail(guardId, violations);
