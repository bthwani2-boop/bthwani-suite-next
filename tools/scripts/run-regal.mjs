/**
 * tools/scripts/run-regal.mjs
 *
 * BTHWANI_DEEP_TOOLS_GOVERNANCE_V5_AND_OSS_TOOLCHAIN_ACTIVATION — Regal Wrapper
 *
 * Runs regal lint on rego files if installed, otherwise skips.
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

if (!hasBinary("regal")) {
  assertActiveOrWarn("regal", "regal");
}

try {
  const cmd = "regal lint governance/policies";
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: repoRoot });
} catch (e) {
  console.error("Regal detected Rego formatting or quality warnings/errors.");
  process.exit(1);
}
