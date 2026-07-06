/**
 * tools/scripts/run-hadolint.mjs
 *
 * BTHWANI_DEEP_TOOLS_GOVERNANCE_V5_AND_OSS_TOOLCHAIN_ACTIVATION — Hadolint Wrapper
 *
 * Scans all Dockerfiles in the repository using hadolint if installed, otherwise skips.
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

if (!hasBinary("hadolint")) {
  assertActiveOrWarn("hadolint", "hadolint");
}

const SEARCH_ROOTS = ["apps", "services", "shared", "tools", "infra", "core"];
const dockerfiles = [];

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
      const isDocker = entry.name === "Dockerfile" ||
                       entry.name.endsWith(".Dockerfile") ||
                       entry.name.startsWith("Dockerfile.");
      if (isDocker) {
        dockerfiles.push(full);
      }
    }
  }
}

for (const root of SEARCH_ROOTS) {
  const rootPath = path.join(repoRoot, root);
  if (fs.existsSync(rootPath)) walk(rootPath);
}

if (dockerfiles.length === 0) {
  console.log("No Dockerfiles found to lint.");
  process.exit(0);
}

const fileArgs = dockerfiles.map(f => `"${path.relative(repoRoot, f)}"`).join(" ");
try {
  let cmd = `hadolint ${fileArgs}`;
  if (fs.existsSync(path.join(repoRoot, ".hadolint.yaml"))) {
    cmd = `hadolint --config .hadolint.yaml ${fileArgs}`;
  }
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: repoRoot });
} catch (e) {
  console.error("Hadolint detected Dockerfile style or security issues.");
  process.exit(1);
}
