import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";
import { writeToolEvidence } from "./capture-tool-evidence.mjs";

export function hasBinary(binary) {
  const locator = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(locator, [binary], { stdio: "ignore", windowsHide: true });
  return !result.error && result.status === 0;
}

export function requireRemoteExecution(toolId) {
  if (process.env.GITHUB_ACTIONS === "true") return;
  try {
    writeToolEvidence({
      toolId,
      status: "BLOCKED",
      exitCode: 1,
      rawText: "remote-only analyzer invoked outside GitHub Actions",
      rawPath: "remote-only",
    });
  } catch (error) {
    console.error("[" + toolId.toUpperCase() + " EVIDENCE ERROR] " + error.message);
  }
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
  return JSON.stringify(path.relative(repoRoot, file));
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
  try {
    writeToolEvidence({
      toolId,
      status: required && !diagnostic ? "FAIL" : "NOT_APPLICABLE",
      exitCode: required && !diagnostic ? 1 : 0,
      rawText: "required binary missing: " + binary,
      rawPath: binary,
    });
  } catch (error) {
    console.error("[" + toolId.toUpperCase() + " EVIDENCE ERROR] " + error.message);
  }
  if (required && !diagnostic) {
    console.error(`[${toolId.toUpperCase()} FAIL] required binary missing: ${binary} decision=FIX_REQUIRED`);
    process.exit(1);
  }
  const mode = diagnostic ? "diagnostic" : "optional";
  console.log(`[${toolId.toUpperCase()} SKIP] '${binary}' is not installed. mode=${mode}`);
  process.exit(0);
}

export function handleCommandFailure(toolId, required, {skipEvidence = false} = {}) {
  const diagnostic = isDiagnosticMode();
  if (!skipEvidence) {
    try {
      writeToolEvidence({
        toolId,
        status: required && !diagnostic ? "FAIL" : "WARNING",
        exitCode: 1,
        rawText: "command failed",
        rawPath: toolId,
      });
    } catch (error) {
      console.error("[" + toolId.toUpperCase() + " EVIDENCE ERROR] " + error.message);
    }
  }
  if (required && !diagnostic) {
    console.error(`[${toolId.toUpperCase()} FAIL] command failed. decision=FIX_REQUIRED`);
    process.exit(1);
  }
  const mode = diagnostic ? "diagnostic" : "optional";
  console.warn(`[${toolId.toUpperCase()} WARN] command failed. mode=${mode}`);
  process.exit(0);
}

function formatCommand(binary, args) {
  return [binary, ...args].map((arg) => JSON.stringify(String(arg))).join(" ");
}

function runProcess(binary, args, toolId, required) {
  const result = spawnSync(binary, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    windowsHide: true,
  });
  const rawText = [result.stdout, result.stderr].filter(Boolean).join("\n");
  try {
    writeToolEvidence({
      toolId,
      status: result.error || result.status !== 0 ? "FAIL" : "PASS",
      exitCode: result.error ? 1 : result.status,
      rawText,
      rawPath: binary + " " + args.join(" "),
    });
  } catch (error) {
    console.error("[" + toolId.toUpperCase() + " EVIDENCE ERROR] " + error.message);
  }
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error || result.status !== 0) handleCommandFailure(toolId, required, {skipEvidence: true});
  return result;
}

export function runTool({ toolId, binary, args, diagnosticArgs, required = false }) {
  requireRemoteExecution(toolId);
  if (!hasBinary(binary)) handleMissingBinary(toolId, binary, required);
  const diagnostic = isDiagnosticMode();
  if (diagnostic) {
    ensureDir(".diagnostics/security");
    ensureDir(".diagnostics/toolchain");
  }
  const selectedArgs = diagnostic && diagnosticArgs ? diagnosticArgs : args;
  console.log(`Running: ${formatCommand(binary, selectedArgs)}`);
  runProcess(binary, selectedArgs, toolId, required);
}

export function runFilesTool({ toolId, binary, files, makeArgs, noFilesMessage, required = false }) {
  requireRemoteExecution(toolId);
  if (!hasBinary(binary)) handleMissingBinary(toolId, binary, required);
  if (!files.length) {
    const message = noFilesMessage || "No files found.";
    try {
      writeToolEvidence({toolId, status: "PASS", exitCode: 0, rawText: message, rawPath: toolId});
    } catch (error) {
      console.error("[" + toolId.toUpperCase() + " EVIDENCE ERROR] " + error.message);
    }
    console.log(message);
    process.exit(0);
  }
  const args = makeArgs(files);
  console.log(`Running: ${formatCommand(binary, args)}`);
  runProcess(binary, args, toolId, required);
}

export { repoRoot };
