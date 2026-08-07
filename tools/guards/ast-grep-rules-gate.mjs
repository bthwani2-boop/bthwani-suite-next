/**
 * Runs BThwani custom ast-grep guard rules from tools/guards/rules/ against
 * governed application source files. Only error-severity matches fail.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const guardId = "AST_GREP_RULES_GATE";
const RULES_DIR = path.join(repoRoot, "tools/guards/rules");
const SCAN_DIRS = [
  "apps/app-client/runtime/src",
  "apps/app-captain/runtime/src",
  "apps/app-field/runtime/src",
  "apps/app-partner/runtime/src",
  "apps/control-panel/runtime/src",
  "apps/webapp/src",
  "services/dsh/frontend",
  "services/wlt/frontend",
].filter((directory) => fs.existsSync(path.join(repoRoot, directory)));

if (!fs.existsSync(RULES_DIR)) {
  console.error(`${guardId}: FAIL — rules directory is missing: tools/guards/rules/`);
  process.exit(1);
}

const ruleFiles = fs
  .readdirSync(RULES_DIR)
  .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
  .map((file) => path.join(RULES_DIR, file));

if (ruleFiles.length === 0) {
  console.error(`${guardId}: FAIL — no registered rule files found in tools/guards/rules/`);
  process.exit(1);
}
if (SCAN_DIRS.length === 0) {
  console.error(`${guardId}: FAIL — no governed scan directories exist`);
  process.exit(1);
}

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
    const result = spawnSync(astGrepBin, ["scan", "--rule", ruleFile, "--json", scanDir], {
      encoding: "utf8",
      cwd: repoRoot,
      maxBuffer: 10 * 1024 * 1024,
      shell: isWin,
    });

    let matches = [];
    try {
      if (result.stdout?.trim()) matches = JSON.parse(result.stdout);
    } catch {
      if (result.status && result.status !== 0) {
        console.error(`${guardId}: FAIL — invalid ast-grep output for ${ruleName}/${scanDir}`);
        process.exit(1);
      }
    }
    if (!Array.isArray(matches) || matches.length === 0) continue;

    for (const match of matches) {
      const severity = match.severity ?? "error";
      const file = path.relative(repoRoot, match.file ?? "").replaceAll("\\", "/");
      const line = match.range?.start?.line ?? 0;
      const message = `[${ruleName}] ${file}:${line + 1} — ${match.message ?? match.text ?? "match found"}`;
      if (severity === "error") {
        console.error(`  ERROR: ${message}`);
        totalErrors += 1;
      } else {
        console.warn(`  WARN:  ${message}`);
        totalWarnings += 1;
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
}
console.log(`\n${guardId}: PASS`);
