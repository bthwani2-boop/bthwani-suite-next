import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  handleCommandFailure,
  handleMissingBinary,
  hasBinary,
  repoRoot,
  walkFiles
} from "./_external-tool-runner.mjs";
import { adjudicateOsvReport, scopedGoImports } from "./lib/osv-go-reachability.mjs";

const toolId = "osv-scanner";
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
  "osv-scanner.toml",
  ...lockfiles.flatMap((file) => ["-L", path.relative(repoRoot, file)])
];
const reportRel = ".diagnostics/security/osv-report.json";
const reportPath = path.join(repoRoot, reportRel);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

// One scan produces both the table a reviewer reads and the JSON this script
// adjudicates, so the two can never disagree about what was found. The scanner
// is invoked without a shell so repository-controlled filenames cannot become
// executable command syntax.
console.log(`Running: osv-scanner ${baseArgs.map((arg) => JSON.stringify(arg)).join(" ")}`);
let reportedFindings = false;
try {
  execFileSync("osv-scanner", [...baseArgs, "--format", "table"], {
    cwd: repoRoot,
    stdio: "inherit"
  });
} catch {
  reportedFindings = true;
}

let reportJson = "";
try {
  reportJson = execFileSync("osv-scanner", [...baseArgs, "--format", "json"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "inherit"]
  });
} catch (error) {
  // osv-scanner exits non-zero whenever it reports findings. execFileSync still
  // exposes the scanner's stdout on that error, so persist the exact JSON body
  // without using shell redirection.
  reportJson = typeof error?.stdout === "string"
    ? error.stdout
    : Buffer.isBuffer(error?.stdout)
      ? error.stdout.toString("utf8")
      : "";
}
if (reportJson.trim()) {
  fs.writeFileSync(reportPath, reportJson, { encoding: "utf8", mode: 0o600 });
}

if (!reportedFindings) {
  console.log("[OSV-SCANNER PASS] no known vulnerabilities in scanned dependencies.");
  process.exit(0);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
} catch (error) {
  console.error(`[OSV-SCANNER FAIL] findings were reported but the JSON report is unreadable: ${error.message}`);
  handleCommandFailure(toolId, true);
}

// The adjudication rule lives in lib/osv-go-reachability.mjs; this file supplies
// the two real inputs it needs: the module import graph and the advisory scope.
// The graph is resolved module-locally with GOWORK off, so a developer's partial
// workspace cannot change which module is analyzed.
const importGraphs = new Map();

function moduleImportGraph(goModAbsolutePath) {
  const moduleDir = path.dirname(goModAbsolutePath);
  if (importGraphs.has(moduleDir)) return importGraphs.get(moduleDir);
  let graph = null;
  try {
    const output = execFileSync("go", ["list", "-deps", "./..."], {
      cwd: moduleDir,
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024,
      env: { ...process.env, GOWORK: "off" }
    });
    graph = new Set(output.split("\n").map((line) => line.trim()).filter(Boolean));
  } catch (error) {
    console.error(`[OSV-SCANNER] go list -deps failed in ${moduleDir}: ${error.message}`);
  }
  importGraphs.set(moduleDir, graph);
  return graph;
}

// The report embeds the OSV record, but a truncated or reshaped record must not
// silently become either a pass or a false blocker, so the advisory is
// re-resolved from OSV itself when the embedded copy carries no scope.
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
