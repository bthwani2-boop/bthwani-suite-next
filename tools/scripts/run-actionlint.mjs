/**
 * tools/scripts/run-actionlint.mjs
 *
 * BTHWANI_DEEP_TOOLS_GOVERNANCE_V5_AND_OSS_TOOLCHAIN_ACTIVATION — actionlint Wrapper
 *
 * Runs actionlint on workflows if installed, otherwise skips.
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

if (!hasBinary("actionlint")) {
  assertActiveOrWarn("actionlint", "actionlint");
}

try {
  const cmd = "actionlint";
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: repoRoot });
} catch (e) {
  console.error("actionlint detected GitHub Actions workflow errors.");
  process.exit(1);
}
