/**
 * tools/scripts/run-pinact.mjs
 *
 * BTHWANI_DEEP_TOOLS_GOVERNANCE_V5_AND_OSS_TOOLCHAIN_ACTIVATION — pinact Wrapper
 *
 * Runs pinact verify/list on workflows if installed, otherwise skips.
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

const args = process.argv.slice(2);
const verifyMode = args.includes("--verify");

if (!hasBinary("pinact")) {
  assertActiveOrWarn("pinact", "pinact");
}

try {
  const cmd = verifyMode ? "pinact verify" : "pinact list";
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: repoRoot });
} catch (e) {
  console.error("pinact detected unpinned actions or errors.");
  // Exit with 0 since it is warn-only in the baseline rules
  process.exit(0);
}
