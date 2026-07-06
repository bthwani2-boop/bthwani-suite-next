/**
 * tools/scripts/run-trivy.mjs
 *
 * BTHWANI_DEEP_TOOLS_GOVERNANCE_V5_AND_OSS_TOOLCHAIN_ACTIVATION — Trivy Wrapper
 *
 * Runs Trivy filesystem scan if installed, otherwise warns and exits 0.
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

if (!hasBinary("trivy")) {
  assertActiveOrWarn("trivy", "trivy");
}

try {
  let cmd = "trivy fs --config trivy.yaml .";
  if (isDiagnosticOnly) {
    cmd = "trivy fs --config trivy.yaml --format json --output .diagnostics/security/trivy-report.json .";
  }
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: repoRoot });
} catch (e) {
  console.error("Trivy scan encountered vulnerabilities/errors.");
  // Exit with error code if mandatory, unless custom exit handling is requested
  process.exit(1);
}
