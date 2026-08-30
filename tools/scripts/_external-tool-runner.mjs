import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

export function hasBinary(binary) {
  const locator = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(locator, [binary], { stdio: "ignore", windowsHide: true });
  return !result.error && result.status === 0;
}

export function requireRemoteExecution(toolId) {
  if (process.env.GITHUB_ACTIONS === "true") return;
  console.error(`[${toolId.toUpperCase()} BLOCKED] this analyzer is Remote-only and must run on a GitHub Actions runner.`);
  process.exit(1);
}

export function ensureDir(rel) {
  fs.mkdirSync(path.join(repoRoot, rel), { recursive: true });
}

export function isDiagnosticMode() {
  const args = process.argv.slice(2);
  return args.includes("--diagnostic-only") || args.includes("--optional") || args.includes("--list");
}

export function quoteRel(file) {
  return path.relative(repoRoot, file);
}

const formatInvocation = (binary, args) => [binary, ...args].map((value) => JSON.stringify(String(value))).join(" ");

function assertArgumentArray(args, label) {
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string")) {
    throw new TypeError(`${label} must be an array of strings`);
  }
  return args;
}

export function walkFiles(rootDirs, predicate) {
  const roots = [...new Set(rootDirs.map((root) => String(root).trim()).filter(Boolean))];
  if (!roots.length) return [];
  for (const root of roots) {
    if (path.isAbsolute(root) || root === ".." || root.startsWith(`..${path.sep}`) || root.replaceAll("\\", "/").startsWith("../")) {
      throw new Error(`walkFiles root must be repository-relative: ${root}`);
    }
  }

  let raw;
  try {
    raw = execFileSync(
      "git",
      ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...roots],
      { cwd: repoRoot, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (error) {
    throw new Error(`Unable to inventory repository files: ${error?.message || String(error)}`);
  }

  const out = [];
  for (const relative of String(raw).split("\0").filter(Boolean)) {
    const full = path.join(repoRoot, relative);
    if (!predicate(full, path.basename(relative))) continue;
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
    out.push(full);
  }
  return out;
}

export function changedFiles(baseSha, candidateSha, rootDirs, predicate = () => true) {
  const base = String(baseSha || "").trim();
  const candidate = String(candidateSha || "").trim();
  if (!/^[0-9a-f]{40}$/i.test(base) || !/^[0-9a-f]{40}$/i.test(candidate)) {
    throw new Error("changedFiles requires full base and candidate commit SHAs");
  }
  const roots = [...new Set(rootDirs.map((root) => String(root).trim()).filter(Boolean))];
  for (const root of roots) {
    if (path.isAbsolute(root) || root === ".." || root.startsWith(`..${path.sep}`) || root.replaceAll("\\\\", "/").startsWith("../")) {
      throw new Error(`changedFiles root must be repository-relative: ${root}`);
    }
  }
  let raw;
  try {
    raw = execFileSync(
      "git",
      ["diff", "--name-only", "--diff-filter=ACMR", `${base}..${candidate}`, "--", ...roots],
      { cwd: repoRoot, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (error) {
    throw new Error(`Unable to inventory changed files: ${error?.message || String(error)}`);
  }
  return String(raw).split(/\r?\n/).filter(Boolean).map((relative) => path.join(repoRoot, relative)).filter((full) =>
    fs.existsSync(full) && fs.statSync(full).isFile() && predicate(full, path.basename(full))
  );
}

export function handleMissingBinary(toolId, binary, required) {
  const diagnostic = isDiagnosticMode();
  if (required && !diagnostic) {
    console.error(`[${toolId.toUpperCase()} FAIL] required binary missing: ${binary} decision=FIX_REQUIRED`);
    process.exit(1);
  }
  const mode = diagnostic ? "diagnostic" : "optional";
  console.log(`[${toolId.toUpperCase()} SKIP] '${binary}' is not installed. mode=${mode}`);
  process.exit(0);
}

export function handleCommandFailure(toolId, required) {
  const diagnostic = isDiagnosticMode();
  if (required && !diagnostic) {
    console.error(`[${toolId.toUpperCase()} FAIL] command failed. decision=FIX_REQUIRED`);
    process.exit(1);
  }
  const mode = diagnostic ? "diagnostic" : "optional";
  console.warn(`[${toolId.toUpperCase()} WARN] command failed. mode=${mode}`);
  process.exit(0);
}

export function runTool({ toolId, binary, args, diagnosticArgs, required = false }) {
  requireRemoteExecution(toolId);
  if (!hasBinary(binary)) handleMissingBinary(toolId, binary, required);
  const diagnostic = isDiagnosticMode();
  if (diagnostic) {
    ensureDir(".diagnostics/security");
    ensureDir(".diagnostics/toolchain");
  }
  const selectedArgs = assertArgumentArray(diagnostic && diagnosticArgs ? diagnosticArgs : args, `${toolId} arguments`);
  console.log(`Running: ${formatInvocation(binary, selectedArgs)}`);
  try {
    execFileSync(binary, selectedArgs, { cwd: repoRoot, stdio: "inherit", shell: false, windowsHide: true });
  } catch {
    handleCommandFailure(toolId, required);
  }
}

export function runFilesTool({ toolId, binary, files, makeArgs, noFilesMessage, required = false }) {
  requireRemoteExecution(toolId);
  if (!hasBinary(binary)) handleMissingBinary(toolId, binary, required);
  if (!files.length) {
    console.log(noFilesMessage || "No files found.");
    process.exit(0);
  }
  const selectedArgs = assertArgumentArray(makeArgs(files), `${toolId} arguments`);
  console.log(`Running: ${formatInvocation(binary, selectedArgs)}`);
  try {
    execFileSync(binary, selectedArgs, { cwd: repoRoot, stdio: "inherit", shell: false, windowsHide: true });
  } catch {
    handleCommandFailure(toolId, required);
  }
}

export { repoRoot };
