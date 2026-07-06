/**
 * tools/scripts/run-zizmor.mjs
 *
 * BTHWANI_DEEP_TOOLS_GOVERNANCE_V5_AND_OSS_TOOLCHAIN_ACTIVATION — zizmor Wrapper
 *
 * Runs zizmor security audit on workflows if installed, otherwise skips.
 */

import { execSync } from "node:child_process";
import { repoRoot, assertActiveOrWarn } from "../guards/_guard-utils.mjs";

function hasBinary(cmd) {
  try {
    execSync(process.platform === "win32" ? `where.exe ${cmd}` : `which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (!hasBinary("zizmor")) {
  assertActiveOrWarn("zizmor", "zizmor");
}

try {
  const cmd = "zizmor .github/workflows";
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: repoRoot });
} catch (e) {
  console.error("zizmor detected workflow security risks.");
  process.exit(1);
}
