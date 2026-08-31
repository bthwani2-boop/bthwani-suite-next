#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolvePackageManagerInvocation } from "./lib/package-manager-invocation.mjs";
import { writeToolEvidence } from "./capture-tool-evidence.mjs";

function fail(message, exitCode = 2) {
  process.stderr.write(`${message}\n`);
  process.exit(exitCode);
}

const separatorIndex = process.argv.indexOf("--");
if (separatorIndex < 0 || separatorIndex === process.argv.length - 1) {
  fail("run-command-check requires a command after --");
}

const options = process.argv.slice(2, separatorIndex);
let label = "command-check";
for (let index = 0; index < options.length; index += 1) {
  const option = options[index];
  if (option === "--label") {
    const value = options[index + 1]?.trim();
    if (!value) fail("run-command-check requires a non-empty --label value");
    label = value;
    index += 1;
    continue;
  }
  fail(`run-command-check received unsupported option: ${option}`);
}

const [command, ...commandArgs] = process.argv.slice(separatorIndex + 1);
if (!["pnpm", "npx"].includes(command)) {
  fail(`run-command-check only permits governed package-manager commands; received: ${command}`);
}
const invocation = resolvePackageManagerInvocation(command, commandArgs, process.env);
process.stdout.write(`[${label}] ${[command, ...commandArgs].join(" ")}\n`);

const result = spawnSync(invocation.executable, invocation.args, {
  cwd: process.cwd(),
  env: process.env,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  shell: false,
  windowsHide: true,
});
const rawText = [result.stdout, result.stderr].filter(Boolean).join("\n");
try {
  writeToolEvidence({
    toolId: label,
    status: result.error || result.signal || result.status !== 0 ? "FAIL" : "PASS",
    exitCode: result.error || result.signal ? 1 : result.status,
    rawText,
    rawPath: [invocation.executable, ...invocation.args].join(" "),
    claim: "Command check evidence: " + label,
    scope: "exact candidate command",
  });
} catch (error) {
  process.stderr.write("[" + label + "] evidence capture failed: " + error.message + "\n");
}
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.error) {
  process.stderr.write(`[${label}] failed to start: ${result.error.message}\n`);
  process.exit(1);
}
if (result.signal) {
  process.stderr.write(`[${label}] terminated by signal ${result.signal}\n`);
  process.exit(1);
}
process.exit(result.status ?? 1);
