import fs from "node:fs";
import path from "node:path";

import { quoteRel, repoRoot, runTool, walkFiles } from "./_external-tool-runner.mjs";

const rootLockfile = path.join(repoRoot, "pnpm-lock.yaml");
const lockfiles = [
  ...(fs.existsSync(rootLockfile) ? [rootLockfile] : []),
  ...walkFiles(["."], (_file, name) => name === "go.mod"),
].sort();

if (lockfiles.length === 0) {
  console.error("[OSV-SCANNER FAIL] no supported lockfiles or Go modules found decision=FIX_REQUIRED");
  process.exit(1);
}

const lockfileArgs = lockfiles.map((file) => `-L ${quoteRel(file)}`).join(" ");
const baseCommand = `osv-scanner scan source --config osv-scanner.toml ${lockfileArgs}`;

runTool({
  toolId: "osv-scanner",
  binary: "osv-scanner",
  command: baseCommand,
  diagnosticCommand: `${baseCommand} --format json > .diagnostics/security/osv-report.json`
});
