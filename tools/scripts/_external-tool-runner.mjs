import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

function readActivation(toolId) {
  const baselinePath = path.join(repoRoot, "tools/toolchain/tool-activation-baseline.json");
  try {
    const data = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    return data.baseline?.[toolId] || "optional";
  } catch {
    return "optional";
  }
}

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

function handleMissingBinary(toolId, binary, required) {
  const activation = readActivation(toolId);
  const diagnostic = isDiagnosticMode();
  const enforce = required && !diagnostic;

  if (enforce) {
    console.error(`[${toolId.toUpperCase()} FAIL] required binary missing: ${binary} activation=${activation} decision=FIX_REQUIRED`);
    process.exit(1);
  }

  if (diagnostic || activation === "optional") {
    console.log(`[${toolId.toUpperCase()} SKIP] '${binary}' is not installed. activation=${activation} decision=NEEDS_EVIDENCE`);
    process.exit(0);
  }

  if (activation === "partial") {
    console.warn(`[${toolId.toUpperCase()} WARN] '${binary}' is not installed. activation=partial decision=NEEDS_EVIDENCE`);
    process.exit(0);
  }

  console.error(`[${toolId.toUpperCase()} FAIL] active binary missing: ${binary} decision=FIX_REQUIRED`);
  process.exit(1);
}

function handleCommandFailure(toolId, required) {
  const activation = readActivation(toolId);
  const diagnostic = isDiagnosticMode();
  const enforce = required && !diagnostic;

  if (enforce || activation === "active") {
    console.error(`[${toolId.toUpperCase()} FAIL] command failed. activation=${activation} decision=FIX_REQUIRED`);
    process.exit(1);
  }

  if (diagnostic || activation === "partial" || activation === "optional") {
    console.warn(`[${toolId.toUpperCase()} WARN] command failed. activation=${activation} decision=NEEDS_EVIDENCE`);
    process.exit(0);
  }

  process.exit(1);
}

export function runTool({ toolId, binary, command, diagnosticCommand, required = false }) {
  if (!hasBinary(binary)) handleMissingBinary(toolId, binary, required);

  ensureDir(".diagnostics/security");
  ensureDir(".diagnostics/toolchain");

  const cmd = isDiagnosticMode() && diagnosticCommand ? diagnosticCommand : command;
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
