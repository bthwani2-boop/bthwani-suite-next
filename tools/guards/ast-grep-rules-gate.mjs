/**
 * tools/guards/ast-grep-rules-gate.mjs
 *
 * Runs bthwani custom ast-grep rules from tools/rules/ against all app source files.
 *
 * Rules are run via @ast-grep/cli (already a devDependency).
 *
 * Only FAIL-severity rules cause a non-zero exit.
 * WARNING-severity rules are printed but do not fail.
 *
 * Output: AST_GREP_RULES_GATE: PASS / FAIL
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const guardId = "AST_GREP_RULES_GATE";

const RULES_DIR = path.join(repoRoot, "tools/rules");
const SCAN_DIRS = [
  "apps/app-client/runtime/src",
  "apps/app-captain/runtime/src",
  "apps/app-field/runtime/src",
  "apps/app-partner/runtime/src",
  "apps/control-panel/runtime/src",
  "apps/webapp/src",
  "services/dsh/frontend",
  "services/wlt/frontend",
].filter((d) => fs.existsSync(path.join(repoRoot, d)));

// Load all rule files
const ruleFiles = fs
  .readdirSync(RULES_DIR)
  .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
  .map((f) => path.join(RULES_DIR, f));

if (ruleFiles.length === 0) {
  console.log(`${guardId}: PASS (no rule files found in tools/rules/)`);
  process.exit(0);
}

if (SCAN_DIRS.length === 0) {
  console.log(`${guardId}: PASS (no scan directories found)`);
  process.exit(0);
}

// Find ast-grep binary
const isWin = process.platform === "win32";
const astGrepBin = path.join(repoRoot, "node_modules/.bin/ast-grep" + (isWin ? ".cmd" : ""));
if (!fs.existsSync(astGrepBin)) {
  console.error(`${guardId}: FAIL — @ast-grep/cli not found. Run pnpm install.`);
  process.exit(1);
}

let totalErrors = 0;
let totalWarnings = 0;

for (const ruleFile of ruleFiles) {
  const ruleName = path.basename(ruleFile, path.extname(ruleFile));

  for (const scanDir of SCAN_DIRS) {
    const result = spawnSync(
      astGrepBin,
      ["scan", "--rule", ruleFile, "--json", scanDir],
      { encoding: "utf8", cwd: repoRoot, maxBuffer: 10 * 1024 * 1024, shell: isWin }
    );

    let matches = [];
    try {
      if (result.stdout && result.stdout.trim()) {
        matches = JSON.parse(result.stdout);
      }
    } catch {
      // Non-JSON output is OK (no matches)
    }

    if (!Array.isArray(matches) || matches.length === 0) continue;

    for (const match of matches) {
      const severity = match.severity ?? "error";
      const file = path.relative(repoRoot, match.file ?? "").replaceAll("\\", "/");
      const line = match.range?.start?.line ?? 0;
      const msg = `[${ruleName}] ${file}:${line + 1} — ${match.message ?? match.text ?? "match found"}`;

      if (severity === "error") {
        console.error(`  ERROR: ${msg}`);
        totalErrors++;
      } else {
        console.warn(`  WARN:  ${msg}`);
        totalWarnings++;
      }
    }
  }
}

console.log(`\n  Rules scanned: ${ruleFiles.length}`);
console.log(`  Directories:   ${SCAN_DIRS.length}`);
console.log(`  Errors:        ${totalErrors}`);
console.log(`  Warnings:      ${totalWarnings}`);

if (totalErrors > 0) {
  console.error(`\n${guardId}: FAIL`);
  process.exit(1);
} else {
  console.log(`\n${guardId}: PASS`);
  process.exit(0);
}
