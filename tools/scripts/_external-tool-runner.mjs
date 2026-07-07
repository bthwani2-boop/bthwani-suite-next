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

function classificationForMissingBinary() {
  return "BLOCKED_NEEDS_TOOL";
}

function classificationForFailedCommand() {
  return "FIX_REQUIRED";
}

export function hasBinary(binary) {
  try {
    execSync(process.platform === "win32" ? "where.exe " + binary : "which " + binary, { stdio: "ignore" });
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

export function handleMissingBinary(toolId, binary) {
  const activation = readActivation(toolId);
  const diagnostic = isDiagnosticMode();

  if (diagnostic || activation === "optional") {
    console.log(`[${toolId.toUpperCase()} SKIP] '${binary}' is not installed. activation=${activation} classification=${classificationForMissingBinary()}`);
    process.exit(0);
  }

  if (activation === "partial") {
    console.warn(`[${toolId.toUpperCase()} WARN] '${binary}' is not installed. activation=partial classification=${classificationForMissingBinary()}`);
    process.exit(0);
  }

  console.error(`[${toolId.toUpperCase()} FAIL] Required binary missing: ${binary} classification=${classificationForMissingBinary()}`);
  console.error("Active tools cannot pass when their binary is missing.");
  process.exit(1);
}

export function runTool({ toolId, binary, command, diagnosticCommand }) {
  if (!hasBinary(binary)) {
    handleMissingBinary(toolId, binary);
  }

  ensureDir(".diagnostics/security");
  ensureDir(".diagnostics/toolchain");

  const cmd = isDiagnosticMode() && diagnosticCommand ? diagnosticCommand : command;
  console.log("Running: " + cmd);

  try {
    execSync(cmd, { cwd: repoRoot, stdio: "inherit", shell: true });
  } catch {
    const activation = readActivation(toolId);
    if (activation === "partial" || isDiagnosticMode()) {
      console.warn(`[${toolId.toUpperCase()} WARN] Command failed but activation=${activation}. classification=${classificationForFailedCommand()}`);
      process.exit(0);
    }
    process.exit(1);
  }
}

export function runFilesTool({ toolId, binary, files, makeCommand, noFilesMessage }) {
  if (!hasBinary(binary)) {
    handleMissingBinary(toolId, binary);
  }

  if (!files.length) {
    console.log(noFilesMessage || "No files found.");
    process.exit(0);
  }

  const cmd = makeCommand(files);
  console.log("Running: " + cmd);

  try {
    execSync(cmd, { cwd: repoRoot, stdio: "inherit", shell: true });
  } catch {
    const activation = readActivation(toolId);
    if (activation === "partial" || isDiagnosticMode()) {
      console.warn(`[${toolId.toUpperCase()} WARN] Command failed but activation=${activation}. classification=${classificationForFailedCommand()}`);
      process.exit(0);
    }
    process.exit(1);
  }
}

export { repoRoot };
