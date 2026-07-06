/**
 * tools/scripts/run-osv-scanner.mjs
 *
 * BTHWANI_DEEP_TOOLS_GOVERNANCE_V5_AND_OSS_TOOLCHAIN_ACTIVATION — OSV-Scanner Wrapper
 *
 * Runs OSV-Scanner dependency vulnerability scan if installed, otherwise skips gracefully.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { repoRoot, assertActiveOrWarn } from "../guards/_guard-utils.mjs";

const outDir = path.join(repoRoot, ".diagnostics", "security");
fs.mkdirSync(outDir, { recursive: true });

function hasBinary(cmd) {
  try {
    execSync(process.platform === "win32" ? `where.exe ${cmd}` : `which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const args = process.argv.slice(2);
const isDiagnosticOnly = args.includes("--diagnostic-only");

if (!hasBinary("osv-scanner")) {
  assertActiveOrWarn("osv-scanner", "osv-scanner");
}

try {
  let cmd = "osv-scanner scan source -r .";
  if (isDiagnosticOnly) {
    // OSV redirects json output
    cmd = `osv-scanner scan source -r . --format json > "${path.join(outDir, "osv-report.json")}"`;
  }
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: repoRoot });
} catch (e) {
  console.error("OSV-Scanner detected dependency vulnerabilities.");
  process.exit(1);
}
