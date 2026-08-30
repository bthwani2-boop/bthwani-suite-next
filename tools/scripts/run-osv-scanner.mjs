import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  handleCommandFailure,
  handleMissingBinary,
  hasBinary,
  requireRemoteExecution,
  repoRoot,
  walkFiles
} from "./_external-tool-runner.mjs";
import { adjudicateOsvReport, scopedGoImports } from "./lib/osv-go-reachability.mjs";

const toolId = "osv-scanner";
requireRemoteExecution(toolId);
const trustedPolicyRoot = path.resolve(process.env.BTHWANI_TRUSTED_POLICY_ROOT || repoRoot);
const osvConfig = path.join(trustedPolicyRoot, "osv-scanner.toml");
if (!fs.existsSync(osvConfig)) {
  console.error(`[OSV-SCANNER FAIL] trusted policy config missing: ${osvConfig}`);
  process.exit(1);
}
const rootLockfile = path.join(repoRoot, "pnpm-lock.yaml");
const lockfiles = [
  ...(fs.existsSync(rootLockfile) ? [rootLockfile] : []),
  ...walkFiles(["."], (_file, name) => name === "go.mod")
].sort();

if (lockfiles.length === 0) {
  console.error("[OSV-SCANNER FAIL] no supported lockfiles or Go modules found decision=FIX_REQUIRED");
  process.exit(1);
}
if (!hasBinary("osv-scanner")) handleMissingBinary(toolId, "osv-scanner", true);

const baseArgs = [
  "scan",
  "source",
  "--config",
  osvConfig,
  ...lockfiles.flatMap((file) => ["-L", path.relative(repoRoot, file)])
];
const reportRel = ".diagnostics/security/osv-report.json";
const reportPath = path.join(repoRoot, reportRel);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

console.log(`Running: osv-scanner ${baseArgs.map((arg) => JSON.stringify(arg)).join(" ")} --format json`);
const scan = spawnSync("osv-scanner", [...baseArgs, "--format", "json"], {
  cwd: repoRoot,
  encoding: "utf8",
  maxBuffer: 128 * 1024 * 1024,
  stdio: ["ignore", "pipe", "inherit"]
});
if (scan.error) {
  console.error(`[OSV-SCANNER FAIL] scanner could not start: ${scan.error.message}`);
  handleCommandFailure(toolId, true);
}

const reportJson = String(scan.stdout || "");
if (reportJson.trim()) {
  fs.writeFileSync(reportPath, reportJson, { encoding: "utf8", mode: 0o600 });
}

if (scan.status === 0) {
  console.log("[OSV-SCANNER PASS] no known vulnerabilities in scanned dependencies.");
  process.exit(0);
}
if (scan.status !== 1) {
  console.error(`[OSV-SCANNER FAIL] scanner failed with exit code ${String(scan.status)}`);
  handleCommandFailure(toolId, true);
}

let report;
try {
  report = JSON.parse(reportJson);
} catch (error) {
  console.error(`[OSV-SCANNER FAIL] findings were reported but the JSON report is unreadable: ${error.message}`);
  handleCommandFailure(toolId, true);
}

const importGraphs = new Map();

function moduleImportGraph(goModAbsolutePath) {
  const moduleDir = path.dirname(goModAbsolutePath);
  if (importGraphs.has(moduleDir)) return importGraphs.get(moduleDir);
  let graph = null;
  try {
    const output = spawnSync("go", ["list", "-deps", "./..."], {
      cwd: moduleDir,
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024,
      env: { ...process.env, GOWORK: "off" },
      windowsHide: true,
    });
    if (output.error || output.status !== 0) throw output.error || new Error(`exit ${output.status}`);
    graph = new Set(String(output.stdout || "").split("\n").map((line) => line.trim()).filter(Boolean));
  } catch (error) {
    console.error(`[OSV-SCANNER] go list -deps failed in ${moduleDir}: ${error.message}`);
  }
  importGraphs.set(moduleDir, graph);
  return graph;
}

async function resolveScopedImports(vulnerability, packageName) {
  const embedded = scopedGoImports(vulnerability, packageName);
  if (embedded.length > 0) return embedded;
  try {
    const response = await fetch(`https://api.osv.dev/v1/vulns/${encodeURIComponent(vulnerability.id)}`, {
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) return [];
    return scopedGoImports(await response.json(), packageName);
  } catch (error) {
    console.error(`[OSV-SCANNER] could not resolve advisory scope for ${vulnerability.id}: ${error.message}`);
    return [];
  }
}

const { blocking, unreachable } = await adjudicateOsvReport({
  report,
  repoRoot,
  resolveScopedImports,
  importGraph: moduleImportGraph
});

for (const finding of unreachable) {
  console.log(
    `[OSV-SCANNER UNREACHABLE] ${finding.id} ${finding.name}@${finding.version} (${finding.source}): ` +
      `the module import graph contains none of ${finding.vulnerableImports.join(", ")}.`
  );
}

if (blocking.length > 0) {
  for (const finding of blocking) {
    console.error(
      `[OSV-SCANNER FAIL] ${finding.id} ${finding.name}@${finding.version} (${finding.source}): ${finding.reason}`
    );
  }
  handleCommandFailure(toolId, true);
}

if (unreachable.length === 0) {
  console.error("[OSV-SCANNER FAIL] findings were reported but none could be adjudicated");
  handleCommandFailure(toolId, true);
}

console.log(
  `[OSV-SCANNER PASS] ${unreachable.length} Go advisory match(es) proven unreachable; no reachable vulnerability remains.`
);
