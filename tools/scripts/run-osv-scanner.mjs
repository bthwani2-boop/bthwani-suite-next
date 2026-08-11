import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  handleCommandFailure,
  handleMissingBinary,
  hasBinary,
  quoteRel,
  repoRoot,
  walkFiles
} from "./_external-tool-runner.mjs";

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

const lockfileArgs = lockfiles.map((file) => `-L ${quoteRel(file)}`).join(" ");
const baseCommand = `osv-scanner scan source --config osv-scanner.toml ${lockfileArgs}`;
const reportRel = ".diagnostics/security/osv-report.json";
fs.mkdirSync(path.join(repoRoot, ".diagnostics/security"), { recursive: true });

// One scan produces both the table a reviewer reads and the JSON this script
// adjudicates, so the two can never disagree about what was found.
console.log(`Running: ${baseCommand}`);
let reportedFindings = false;
try {
  execSync(`${baseCommand} --format table`, { cwd: repoRoot, stdio: "inherit", shell: true });
} catch {
  reportedFindings = true;
}
try {
  execSync(`${baseCommand} --format json > ${JSON.stringify(reportRel)}`, {
    cwd: repoRoot,
    stdio: ["ignore", "ignore", "inherit"],
    shell: true
  });
} catch {
  // osv-scanner exits non-zero whenever it reports anything, so a non-zero exit
  // here is expected and the report is still written. An unreadable report is
  // the real blocker and is handled below.
}

if (!reportedFindings) {
  console.log("[OSV-SCANNER PASS] no known vulnerabilities in scanned dependencies.");
  process.exit(0);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(path.join(repoRoot, reportRel), "utf8"));
} catch (error) {
  console.error(`[OSV-SCANNER FAIL] findings were reported but the JSON report is unreadable: ${error.message}`);
  handleCommandFailure(toolId, true);
}

// Go advisories match a module version, not the packages a build imports.
// golang.org/x/crypto is the standing case: its openpgp advisory covers every
// version of the module and will never have a fixed release, while this
// repository only imports bcrypt from it. No dependency bump can satisfy a
// module-level verdict there, and ignoring the advisory by id would also hide
// the day one of those packages is imported for real.
//
// Each Go finding is therefore adjudicated against the module's own import
// graph, resolved module-locally with GOWORK off so a developer's partial
// workspace cannot change which module is analyzed. A finding is dismissed only
// when the advisory names the vulnerable import paths and the graph contains
// none of them. Unknown scope, an unresolvable graph, and every other ecosystem
// stay blocking.
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

function scopedImports(vulnerability, packageName) {
  const imports = new Set();
  for (const affected of vulnerability.affected ?? []) {
    if (affected.package?.ecosystem !== "Go") continue;
    if (affected.package?.name !== packageName) continue;
    for (const entry of affected.ecosystem_specific?.imports ?? []) {
      if (entry.path) imports.add(entry.path);
    }
  }
  return [...imports];
}

// The report embeds the OSV record, but a truncated or reshaped record must not
// silently become either a pass or a false blocker, so the advisory is
// re-resolved from OSV itself when the embedded copy carries no scope.
async function resolveScopedImports(vulnerability, packageName) {
  const embedded = scopedImports(vulnerability, packageName);
  if (embedded.length > 0) return embedded;
  try {
    const response = await fetch(`https://api.osv.dev/v1/vulns/${encodeURIComponent(vulnerability.id)}`, {
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) return [];
    return scopedImports(await response.json(), packageName);
  } catch (error) {
    console.error(`[OSV-SCANNER] could not resolve advisory scope for ${vulnerability.id}: ${error.message}`);
    return [];
  }
}

const blocking = [];
const unreachable = [];

for (const result of report.results ?? []) {
  const rawSource = result.source?.path ?? "";
  const absoluteSource = path.isAbsolute(rawSource) ? rawSource : path.join(repoRoot, rawSource);
  const source = path.relative(repoRoot, absoluteSource).split(path.sep).join("/");
  const isGoModule = source.endsWith("go.mod");
  for (const entry of result.packages ?? []) {
    const ecosystem = entry.package?.ecosystem;
    const name = entry.package?.name;
    const version = entry.package?.version;
    for (const vulnerability of entry.vulnerabilities ?? []) {
      const finding = { id: vulnerability.id, source, name, version };
      if (!isGoModule || ecosystem !== "Go") {
        blocking.push({ ...finding, reason: "no import-level reachability evidence exists for this ecosystem" });
        continue;
      }
      const vulnerableImports = await resolveScopedImports(vulnerability, name);
      if (vulnerableImports.length === 0) {
        blocking.push({ ...finding, reason: "the advisory does not scope the vulnerability to import paths" });
        continue;
      }
      const graph = moduleImportGraph(absoluteSource);
      if (!graph) {
        blocking.push({ ...finding, reason: "the module import graph could not be resolved" });
        continue;
      }
      const reached = vulnerableImports.filter((importPath) => graph.has(importPath));
      if (reached.length > 0) {
        blocking.push({ ...finding, reason: `the build imports ${reached.join(", ")}` });
        continue;
      }
      unreachable.push({ ...finding, vulnerableImports });
    }
  }
}

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
