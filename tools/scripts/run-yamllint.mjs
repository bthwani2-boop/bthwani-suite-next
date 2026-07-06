/**
 * tools/scripts/run-yamllint.mjs
 *
 * BTHWANI_DEEP_TOOLS_GOVERNANCE_V5_AND_OSS_TOOLCHAIN_ACTIVATION — yamllint Wrapper
 *
 * Scans YAML files using yamllint if installed, otherwise skips.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { repoRoot, assertActiveOrWarn } from "../guards/_guard-utils.mjs";

function hasBinary(cmd) {
  try {
    execSync(process.platform === "win32" ? `where.exe ${cmd}` : `which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (!hasBinary("yamllint")) {
  assertActiveOrWarn("yamllint", "yamllint");
}

// Check files in .github, governance, infra, tools directories
const targetDirs = [".github", "governance", "infra", "tools"];
const yamlFiles = [];

function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "build", ".next", ".git"].includes(entry.name)) continue;
      walk(full);
    } else {
      if (entry.name.endsWith(".yml") || entry.name.endsWith(".yaml")) {
        yamlFiles.push(full);
      }
    }
  }
}

for (const dir of targetDirs) {
  const fullPath = path.join(repoRoot, dir);
  if (fs.existsSync(fullPath)) walk(fullPath);
}

if (yamlFiles.length === 0) {
  console.log("No YAML files found to lint.");
  process.exit(0);
}

const fileArgs = yamlFiles.map(f => `"${path.relative(repoRoot, f)}"`).join(" ");
try {
  let cmd = `yamllint ${fileArgs}`;
  if (fs.existsSync(path.join(repoRoot, ".yamllint.yml"))) {
    cmd = `yamllint -c .yamllint.yml ${fileArgs}`;
  }
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: repoRoot });
} catch (e) {
  console.error("yamllint detected syntax or formatting issues.");
  process.exit(1);
}
