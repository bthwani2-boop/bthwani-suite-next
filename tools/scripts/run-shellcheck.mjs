/**
 * tools/scripts/run-shellcheck.mjs
 *
 * BTHWANI_DEEP_TOOLS_GOVERNANCE_V5_AND_OSS_TOOLCHAIN_ACTIVATION — ShellCheck Wrapper
 *
 * Scans all tracked *.sh files using ShellCheck if installed, otherwise skips.
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

if (!hasBinary("shellcheck")) {
  assertActiveOrWarn("shellcheck", "shellcheck");
}

// Find all shell files (*.sh) in project folders (apps, services, shared, tools, infra, core)
const SEARCH_ROOTS = ["apps", "services", "shared", "tools", "infra", "core"];
const shellFiles = [];

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
      if (entry.name.endsWith(".sh")) {
        shellFiles.push(full);
      }
    }
  }
}

for (const root of SEARCH_ROOTS) {
  const rootPath = path.join(repoRoot, root);
  if (fs.existsSync(rootPath)) walk(rootPath);
}

if (shellFiles.length === 0) {
  console.log("No *.sh files found to scan.");
  process.exit(0);
}

const fileArgs = shellFiles.map(f => `"${path.relative(repoRoot, f)}"`).join(" ");
try {
  const cmd = `shellcheck ${fileArgs}`;
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: repoRoot });
} catch (e) {
  console.error("ShellCheck detected scripting issues.");
  process.exit(1);
}
