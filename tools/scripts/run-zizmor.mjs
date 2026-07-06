/**
 * tools/scripts/run-zizmor.mjs
 *
 * BTHWANI_DEEP_TOOLS_GOVERNANCE_V5_AND_OSS_TOOLCHAIN_ACTIVATION — zizmor Wrapper
 *
 * Runs zizmor security audit on workflows if installed, otherwise skips.
 */

import { execSync } from "node:child_process";
import { repoRoot } from "../guards/_guard-utils.mjs";

function hasBinary(cmd) {
  try {
    execSync(process.platform === "win32" ? `where.exe ${cmd}` : `which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (!hasBinary("zizmor")) {
  console.log(`\n[ZIZMOR SKIP] 'zizmor' binary not installed. Skipping local workflow security scanning.`);
  console.log(`               (This check runs as a mandatory job in GitHub Actions CI)\n`);
  process.exit(0);
}

try {
  const cmd = "zizmor .github/workflows";
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: repoRoot });
} catch (e) {
  console.error("zizmor detected workflow security risks.");
  process.exit(1);
}
