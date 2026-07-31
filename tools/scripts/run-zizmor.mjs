import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { hasBinary, repoRoot } from "./_external-tool-runner.mjs";

const version = "1.27.0";
const reportPath = path.resolve(
  repoRoot,
  process.env.BTHWANI_ZIZMOR_REPORT ?? ".diagnostics/workflow-security/zizmor.json",
);
const args = [
  "--no-config",
  "--min-severity",
  "high",
  "--min-confidence",
  "high",
  "--format",
  "json",
  ".github/workflows",
];

function execute(binary, binaryArgs) {
  return spawnSync(binary, binaryArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 32 * 1024 * 1024,
  });
}

function findPython() {
  const candidates = process.platform === "win32"
    ? [["python", []], ["py", ["-3"]], ["python3", []]]
    : [["python3", []], ["python", []]];

  for (const [binary, prefixArgs] of candidates) {
    const probe = execute(binary, [...prefixArgs, "--version"]);
    if (!probe.error && probe.status === 0) {
      return { binary, prefixArgs };
    }
  }

  throw new Error("Python 3 is required to install the pinned zizmor fallback.");
}

function runPinned() {
  if (hasBinary("zizmor")) return execute("zizmor", args);
  if (hasBinary("uvx")) {
    return execute("uvx", ["--from", `zizmor==${version}`, "zizmor", ...args]);
  }
  if (hasBinary("pipx")) {
    return execute("pipx", ["run", "--spec", `zizmor==${version}`, "zizmor", ...args]);
  }

  const python = findPython();
  const install = execute(python.binary, [
    ...python.prefixArgs,
    "-m",
    "pip",
    "install",
    "--user",
    "--disable-pip-version-check",
    `zizmor==${version}`,
  ]);
  if (install.error || install.status !== 0) return install;

  const scriptsPathResult = execute(python.binary, [
    ...python.prefixArgs,
    "-c",
    "import os,sysconfig; print(sysconfig.get_path('scripts', scheme='nt_user' if os.name == 'nt' else 'posix_user'))",
  ]);
  if (scriptsPathResult.error || scriptsPathResult.status !== 0) return scriptsPathResult;

  const executable = process.platform === "win32" ? "zizmor.exe" : "zizmor";
  const scriptsPath = String(scriptsPathResult.stdout).trim();
  return execute(path.join(scriptsPath, executable), args);
}

function normalizeReport(stdout, stderr) {
  const trimmed = String(stdout ?? "").trim();
  if (trimmed) {
    try {
      const parsed = JSON.parse(trimmed);
      return `${JSON.stringify(parsed, null, 2)}\n`;
    } catch {
      // Keep raw output when the external tool did not emit JSON.
    }
  }
  return `${JSON.stringify({
    schemaVersion: 1,
    tool: "zizmor",
    version,
    parseFailure: true,
    stdout: String(stdout ?? ""),
    stderr: String(stderr ?? ""),
  }, null, 2)}\n`;
}

const result = runPinned();
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, normalizeReport(result.stdout, result.stderr), "utf8");

if (result.error || result.status !== 0) {
  let findings = [];
  try {
    const parsed = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    findings = Array.isArray(parsed) ? parsed : [];
  } catch {
    findings = [];
  }

  for (const finding of findings.slice(0, 20)) {
    const location = finding.locations?.[0]?.symbolic?.key?.Local?.verbatim_path
      ?? finding.locations?.[0]?.concrete?.location?.path
      ?? "workflow";
    const severity = finding.determinations?.severity ?? "unknown";
    const confidence = finding.determinations?.confidence ?? "unknown";
    console.error(`::error file=${location},title=zizmor:${finding.ident ?? "finding"}::severity=${severity} confidence=${confidence} ${finding.desc ?? "workflow security finding"}`);
  }

  const stderrMessage = String(result.stderr ?? "").trim();
  const message = result.error?.message ?? (stderrMessage || `exit=${result.status}`);
  console.error(`[ZIZMOR FAIL] ${message} report=${path.relative(repoRoot, reportPath)} decision=FIX_REQUIRED`);
  process.exit(1);
}

console.log(`[ZIZMOR PASS] workflow security verified with locked version ${version}`);
console.log(`[ZIZMOR REPORT] ${path.relative(repoRoot, reportPath)}`);
