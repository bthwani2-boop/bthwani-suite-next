#!/usr/bin/env node

import { spawnSync } from "node:child_process";

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
process.stdout.write(`[${label}] ${[command, ...commandArgs].join(" ")}\n`);

const result = spawnSync(command, commandArgs, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  process.stderr.write(`[${label}] failed to start: ${result.error.message}\n`);
  process.exit(1);
}
if (result.signal) {
  process.stderr.write(`[${label}] terminated by signal ${result.signal}\n`);
  process.exit(1);
}
process.exit(result.status ?? 1);
