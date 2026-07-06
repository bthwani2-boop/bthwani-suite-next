/**
 * tools/guards/guard-registry-gate.mjs
 *
 * BTHWANI_GOVERNANCE_AS_CODE_GATE — Guard Registry Integrity Gate
 *
 * Checks:
 *   1. Every registered guard in guard-registry.json has a matching "guard:<id>" script in package.json
 *   2. Every "guard:*" script in package.json is registered in guard-registry.json
 *   3. Every workflow step in .github/workflows/ running a "guard:*" command uses a registered, valid script
 *   4. Verifies physical source files exist for all registered guards
 *
 * FAIL: missing scripts, unregistered guard scripts, missing source files, invalid CI step references.
 */

import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "guard-registry-gate";
const violations = [];

const registryPath = path.join(repoRoot, "governance/guards/guard-registry.json");
const packageJsonPath = path.join(repoRoot, "package.json");
const workflowsDir = path.join(repoRoot, ".github/workflows");

if (!fs.existsSync(registryPath) || !fs.existsSync(packageJsonPath)) {
  violations.push({
    file: "governance/guards/guard-registry.json",
    line: 0,
    message: "MISSING_FILES: guard-registry.json or package.json missing.",
  });
  fail(guardId, violations);
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const scripts = packageJson.scripts || {};

const registeredGuards = new Set(registry.entries.map((g) => g.id));
const registeredScripts = new Set(registry.entries.map((g) => g.script));

// ── 1. Check every registered guard has a package script & physical source file ────
for (const entry of registry.entries) {
  // Check script exists in package.json
  if (!scripts[entry.script]) {
    violations.push({
      file: "governance/guards/guard-registry.json",
      line: 0,
      message: `MISSING_PACKAGE_SCRIPT: Guard '${entry.id}' is registered but script '${entry.script}' is missing from package.json`,
    });
  }

  // Check physical file exists
  if (entry.source_file) {
    const filePath = path.join(repoRoot, entry.source_file);
    if (!fs.existsSync(filePath)) {
      violations.push({
        file: "governance/guards/guard-registry.json",
        line: 0,
        message: `MISSING_SOURCE_FILE: Guard '${entry.id}' source_file '${entry.source_file}' does not exist physically.`,
      });
    }
  }
}

// ── 2. Check every "guard:*" script in package.json is registered ────────────────
const guardScriptsInPkgJson = Object.keys(scripts).filter((s) => s.startsWith("guard:"));

for (const script of guardScriptsInPkgJson) {
  // Skip custom aggregate scripts if needed, but they should ideally be registered
  if (script === "guard:logic-all" || script === "guard:repo-all" || script === "guard:performance-all" || script === "guard:governance-all") {
    continue;
  }
  if (!registeredScripts.has(script)) {
    violations.push({
      file: "package.json",
      line: 0,
      message: `UNREGISTERED_GUARD_SCRIPT: Script '${script}' is defined in package.json but is not registered in guard-registry.json`,
    });
  }
}

// ── 3. Check GitHub workflows for invalid script references ───────────────────────
if (fs.existsSync(workflowsDir)) {
  const workflowFiles = fs.readdirSync(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

  for (const wFile of workflowFiles) {
    const wPath = path.join(workflowsDir, wFile);
    const content = fs.readFileSync(wPath, "utf8");

    // Match lines like: "run: pnpm run guard:name" or "run: npm run guard:name"
    const runGuardRegex = /\brun:\s*(?:pnpm|npm|yarn)\s+(?:run\s+)?(guard:[a-z0-9-]+)\b/g;
    let match;
    while ((match = runGuardRegex.exec(content)) !== null) {
      const scriptName = match[1];
      // Skip compound aggregate scripts
      if (scriptName === "guard:logic-all" || scriptName === "guard:repo-all" || scriptName === "guard:performance-all" || scriptName === "guard:governance-all") {
        continue;
      }
      if (!registeredScripts.has(scriptName)) {
        violations.push({
          file: `.github/workflows/${wFile}`,
          line: 0, // simple static check, line extraction omitted for speed
          message: `UNREGISTERED_WORKFLOW_GUARD: Workflow references unregistered guard script '${scriptName}'`,
        });
      }
    }
  }
}

fail(guardId, violations);
