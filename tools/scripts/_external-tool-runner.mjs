import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

export function hasBinary(binary) {
  try {
    execSync(process.platform === "win32" ? `where.exe ${binary}` : `which ${binary}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
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
  const out = [];
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", "dist", "build", ".next", ".git", ".diagnostics", ".nx", ".turbo", ".cache"].includes(entry.name)) continue;
        walk(full);
      } else if (predicate(full, entry.name)) {
        out.push(full);
      }
    }
  }
  for (const root of rootDirs) {
    const full = path.join(repoRoot, root);
    if (fs.existsSync(full)) walk(full);
  }
  return out;
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

export function runTool({ toolId, binary, command, diagnosticCommand, required = false }) {
  if (!hasBinary(binary)) handleMissingBinary(toolId, binary, required);
  const diagnostic = isDiagnosticMode();
  if (diagnostic) {
    ensureDir(".diagnostics/security");
    ensureDir(".diagnostics/toolchain");
  }
  const cmd = diagnostic && diagnosticCommand ? diagnosticCommand : command;
  console.log(`Running: ${cmd}`);
  try {
    execSync(cmd, { cwd: repoRoot, stdio: "inherit", shell: true });
  } catch {
    handleCommandFailure(toolId, required);
  }
}

export function runFilesTool({ toolId, binary, files, makeCommand, noFilesMessage, required = false }) {
  if (!hasBinary(binary)) handleMissingBinary(toolId, binary, required);
  if (!files.length) {
    console.log(noFilesMessage || "No files found.");
    process.exit(0);
  }
  const cmd = makeCommand(files);
  console.log(`Running: ${cmd}`);
  try {
    execSync(cmd, { cwd: repoRoot, stdio: "inherit", shell: true });
  } catch {
    handleCommandFailure(toolId, required);
  }
}

export { repoRoot };
