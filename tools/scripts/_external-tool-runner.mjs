import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

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

export function runTool({ toolId, binary, command, diagnosticCommand }) {
  const diagnostic = isDiagnosticMode();

  if (!hasBinary(binary)) {
    if (diagnostic) {
      console.log("[" + toolId.toUpperCase() + " DIAGNOSTIC-SKIP] " + binary + " is not installed.");
      process.exit(0);
    }

    console.error("[" + toolId.toUpperCase() + " FAIL] Required binary missing: " + binary);
    console.error("This is a gate command. Missing active tools cannot pass.");
    process.exit(1);
  }

  ensureDir(".diagnostics/security");
  ensureDir(".diagnostics/toolchain");

  const cmd = diagnostic && diagnosticCommand ? diagnosticCommand : command;
  console.log("Running: " + cmd);

  try {
    execSync(cmd, { cwd: repoRoot, stdio: "inherit", shell: true });
  } catch {
    process.exit(1);
  }
}