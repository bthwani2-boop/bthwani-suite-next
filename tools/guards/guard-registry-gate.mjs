/**
 * Guard Registry Integrity Gate
 *
 * Checks:
 * 1. Every registered non-aggregate guard has a matching package script.
 * 2. Every non-aggregate guard:* script in package.json is registered.
 * 3. Every workflow guard:* command uses a registered or aggregate script.
 * 4. Physical source files exist when source_file is declared.
 */
import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "guard-registry-gate";
const violations = [];

const registryPath = path.join(repoRoot, "governance/guards/guard-registry.json");
const packageJsonPath = path.join(repoRoot, "package.json");
const workflowsDir = path.join(repoRoot, ".github/workflows");

const aggregateScripts = new Set([
  "guard:logic-all",
  "guard:repo-all",
  "guard:performance-all",
  "guard:governance-all",
  "guard:tools-v5-all",
  "guard:tools-v5-registry",
  "guard:tools-v5-ci"
]);

if (!fs.existsSync(registryPath) || !fs.existsSync(packageJsonPath)) {
  violations.push({
    file: "governance/guards/guard-registry.json",
    line: 0,
    message: "MISSING_FILES: guard-registry.json or package.json missing."
  });
  fail(guardId, violations);
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const scripts = packageJson.scripts || {};
const entries = Array.isArray(registry.entries) ? registry.entries : [];
const registeredScripts = new Set(entries.map((g) => g.script).filter(Boolean));
const seenIds = new Set();
const seenScripts = new Set();

for (const entry of entries) {
  if (!entry.id) {
    violations.push({
      file: "governance/guards/guard-registry.json",
      line: 0,
      message: "MALFORMED_ENTRY: missing id."
    });
    continue;
  }

  if (seenIds.has(entry.id)) {
    violations.push({
      file: "governance/guards/guard-registry.json",
      line: 0,
      message: "DUPLICATE_GUARD_ID: " + entry.id
    });
  }
  seenIds.add(entry.id);

  if (entry.script) {
    if (seenScripts.has(entry.script)) {
      violations.push({
        file: "governance/guards/guard-registry.json",
        line: 0,
        message: "DUPLICATE_GUARD_SCRIPT: " + entry.script
      });
    }
    seenScripts.add(entry.script);
  }

  if (entry.script && !aggregateScripts.has(entry.script) && !scripts[entry.script]) {
    violations.push({
      file: "governance/guards/guard-registry.json",
      line: 0,
      message: "MISSING_PACKAGE_SCRIPT: Guard '" + entry.id + "' is registered but script '" + entry.script + "' is missing from package.json"
    });
  }

  if (entry.source_file) {
    const filePath = path.join(repoRoot, entry.source_file);
    if (!fs.existsSync(filePath)) {
      violations.push({
        file: "governance/guards/guard-registry.json",
        line: 0,
        message: "MISSING_SOURCE_FILE: Guard '" + entry.id + "' source_file '" + entry.source_file + "' does not exist physically."
      });
    }
  }
}

for (const script of Object.keys(scripts).filter((s) => s.startsWith("guard:"))) {
  if (aggregateScripts.has(script)) continue;
  if (!registeredScripts.has(script)) {
    violations.push({
      file: "package.json",
      line: 0,
      message: "UNREGISTERED_GUARD_SCRIPT: Script '" + script + "' is defined in package.json but is not registered in guard-registry.json"
    });
  }
}

if (fs.existsSync(workflowsDir)) {
  const workflowFiles = fs.readdirSync(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

  for (const wFile of workflowFiles) {
    const content = fs.readFileSync(path.join(workflowsDir, wFile), "utf8");
    const runGuardRegex = /\b(?:pnpm|npm|yarn)\s+(?:run\s+)?(guard:[A-Za-z0-9:_-]+)\b/g;
    let match;
    while ((match = runGuardRegex.exec(content)) !== null) {
      const scriptName = match[1];
      if (aggregateScripts.has(scriptName)) continue;
      if (!registeredScripts.has(scriptName)) {
        violations.push({
          file: ".github/workflows/" + wFile,
          line: 0,
          message: "UNREGISTERED_WORKFLOW_GUARD: Workflow references unregistered guard script '" + scriptName + "'"
        });
      }
    }
  }
}

fail(guardId, violations);
