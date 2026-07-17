import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "guard-registry-gate";
const violations = [];
const registryRelative = "governance/guards/guard-registry.json";
const packageRelative = "package.json";
const workflowsDir = path.join(repoRoot, ".github/workflows");

const aggregateScripts = new Set([
  "guard:logic-all",
  "guard:repo-all",
  "guard:performance-all",
  "guard:governance-all",
  "guard:tools-v5-all",
  "guard:tools-v5-registry",
  "guard:tools-v5-ci",
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

const registry = readJson(registryRelative);
const packageJson = readJson(packageRelative);
const entries = Array.isArray(registry?.entries) ? registry.entries : [];
const scripts = packageJson?.scripts ?? {};
const registeredScripts = new Set(entries.map((entry) => entry.script).filter(Boolean));
const registeredSources = new Set(entries.map((entry) => entry.source_file).filter(Boolean));
const seenIds = new Set();
const seenScripts = new Set();

for (const entry of entries) {
  if (!entry.id) {
    violations.push({ file: registryRelative, line: 0, message: "MALFORMED_ENTRY_MISSING_ID" });
    continue;
  }
  if (seenIds.has(entry.id)) {
    violations.push({ file: registryRelative, line: 0, message: `DUPLICATE_GUARD_ID ${entry.id}` });
  }
  seenIds.add(entry.id);

  if (entry.script) {
    if (seenScripts.has(entry.script)) {
      violations.push({ file: registryRelative, line: 0, message: `DUPLICATE_GUARD_SCRIPT ${entry.script}` });
    }
    seenScripts.add(entry.script);
    if (!aggregateScripts.has(entry.script) && !scripts[entry.script]) {
      violations.push({ file: registryRelative, line: 0, message: `MISSING_PACKAGE_SCRIPT ${entry.id} -> ${entry.script}` });
    }
  }

  if (entry.source_file && !fs.existsSync(path.join(repoRoot, entry.source_file))) {
    violations.push({ file: registryRelative, line: 0, message: `MISSING_SOURCE_FILE ${entry.id} -> ${entry.source_file}` });
  }

  if (entry.exit_level === "fail" && entry.script) {
    const command = scripts[entry.script] ?? "";
    if (/\b(?:\|\|\s*true|continue-on-error|try\s*\{)/i.test(command)) {
      violations.push({ file: packageRelative, line: 0, message: `FAIL_GUARD_SCRIPT_SWALLOWS_FAILURE ${entry.script}` });
    }
  }
}

for (const script of Object.keys(scripts).filter((name) => name.startsWith("guard:"))) {
  if (aggregateScripts.has(script)) continue;
  if (!registeredScripts.has(script)) {
    violations.push({ file: packageRelative, line: 0, message: `UNREGISTERED_GUARD_SCRIPT ${script}` });
  }
}

const guardsDir = path.join(repoRoot, "tools/guards");
if (fs.existsSync(guardsDir)) {
  const sourceFiles = fs.readdirSync(guardsDir)
    .filter((name) => name.endsWith("-gate.mjs") || name === "no-broken-imports.mjs")
    .map((name) => `tools/guards/${name}`);
  for (const source of sourceFiles) {
    if (!registeredSources.has(source)) {
      violations.push({ file: source, line: 0, message: "UNREGISTERED_TOP_LEVEL_GUARD_SOURCE" });
    }
  }
}

if (fs.existsSync(workflowsDir)) {
  const workflowFiles = fs.readdirSync(workflowsDir)
    .filter((name) => /\.ya?ml$/.test(name))
    .sort();

  for (const fileName of workflowFiles) {
    const relative = `.github/workflows/${fileName}`;
    const text = fs.readFileSync(path.join(workflowsDir, fileName), "utf8");

    const runGuardRegex = /\b(?:pnpm|npm|yarn)\s+(?:run\s+)?(guard:[A-Za-z0-9:_-]+)\b/g;
    for (const match of text.matchAll(runGuardRegex)) {
      const script = match[1];
      if (!aggregateScripts.has(script) && !registeredScripts.has(script)) {
        violations.push({ file: relative, line: 0, message: `UNREGISTERED_WORKFLOW_GUARD ${script}` });
      }
    }

    const directGuardRegex = /node\s+(tools\/guards\/[A-Za-z0-9_./-]+(?:-gate\.mjs|no-broken-imports\.mjs))/g;
    for (const match of text.matchAll(directGuardRegex)) {
      if (!registeredSources.has(match[1])) {
        violations.push({ file: relative, line: 0, message: `UNREGISTERED_DIRECT_WORKFLOW_GUARD ${match[1]}` });
      }
    }

    if (!/^permissions:\s*(?:\n|$)/m.test(text) && !/^permissions:\s*\{\s*\}\s*$/m.test(text)) {
      violations.push({ file: relative, line: 0, message: "WORKFLOW_MUST_DECLARE_EXPLICIT_TOP_LEVEL_PERMISSIONS" });
    }
    if (/pull_request_target\s*:/m.test(text)) {
      violations.push({ file: relative, line: 0, message: "PULL_REQUEST_TARGET_FORBIDDEN" });
    }
    if (/contents:\s*write\b/i.test(text) || /write-all\b/i.test(text)) {
      violations.push({ file: relative, line: 0, message: "SOURCE_CONTENT_WRITE_PERMISSION_FORBIDDEN" });
    }
    if (/\b(?:git\s+(?:push|commit|reset\s+--hard)|gh\s+pr\s+merge)\b/i.test(text)) {
      violations.push({ file: relative, line: 0, message: "CI_SOURCE_OR_BRANCH_MUTATION_FORBIDDEN" });
    }
    if (/\b(?:gofmt\s+-w|prettier\s+--write|eslint\s+--fix|sed\s+-i|perl\s+-pi)\b/i.test(text)) {
      violations.push({ file: relative, line: 0, message: "CI_FIX_OR_SOURCE_REWRITE_COMMAND_FORBIDDEN" });
    }
    if (/@latest\b/i.test(text)) {
      violations.push({ file: relative, line: 0, message: "LATEST_VERSION_FORBIDDEN_IN_REQUIRED_WORKFLOW" });
    }
    if (/^\s*ref:\s*(?:reem|sam|onebyone|implementing|master)\s*$/m.test(text)) {
      violations.push({ file: relative, line: 0, message: "EXPLICIT_FOREIGN_BRANCH_CHECKOUT_FORBIDDEN" });
    }
    if (/one-time/i.test(fileName) || /One-time/i.test(text)) {
      violations.push({ file: relative, line: 0, message: "ONE_TIME_WORKFLOW_FORBIDDEN" });
    }
  }

  for (const fileName of ["ci.yml", "security.yml", "governance-audit.yml", "dsh-operational-closure-ci.yml"]) {
    const fullPath = path.join(workflowsDir, fileName);
    if (!fs.existsSync(fullPath)) {
      violations.push({ file: `.github/workflows/${fileName}`, line: 0, message: "REQUIRED_WORKFLOW_MISSING" });
      continue;
    }
    const text = fs.readFileSync(fullPath, "utf8");
    if (!/(?:branches:\s*\[[^\]]*\bbassam\b|^\s*-\s+bassam\s*$)/m.test(text)) {
      violations.push({ file: `.github/workflows/${fileName}`, line: 0, message: "ACTIVE_REMOTE_BRANCH_BASSAM_NOT_COVERED" });
    }
  }

  const governancePath = path.join(workflowsDir, "governance-audit.yml");
  if (fs.existsSync(governancePath)) {
    const text = fs.readFileSync(governancePath, "utf8");
    for (const marker of [
      '"AGENTS.md"',
      '"GEMINI.md"',
      '".agents/**"',
      '"governance/**"',
      '"tools/guards/**"',
      '"package.json"',
      '".github/workflows/**"',
    ]) {
      if (!text.includes(marker)) {
        violations.push({ file: ".github/workflows/governance-audit.yml", line: 0, message: `GOVERNANCE_TRIGGER_PATH_MISSING ${marker}` });
      }
    }
  }
}

fail(guardId, violations);
