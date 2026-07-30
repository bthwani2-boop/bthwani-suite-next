#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

function fail(message, exitCode = 2) {
  process.stderr.write(`${message}\n`);
  process.exit(exitCode);
}

let project = "";
let label = "typecheck";
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  const option = args[index];
  if (option === "--project") {
    project = args[index + 1]?.trim() ?? "";
    if (!project) fail("run-tsc-check requires a non-empty --project value");
    index += 1;
    continue;
  }
  if (option === "--label") {
    label = args[index + 1]?.trim() ?? "";
    if (!label) fail("run-tsc-check requires a non-empty --label value");
    index += 1;
    continue;
  }
  fail(`run-tsc-check received unsupported option: ${option}`);
}

if (!project) fail("run-tsc-check requires --project <tsconfig path>");
if (!existsSync(project)) fail(`[${label}] TypeScript project does not exist: ${project}`, 1);

process.stdout.write(`[${label}] pnpm exec tsc --noEmit -p ${project}\n`);
const result = spawnSync("pnpm", ["exec", "tsc", "--noEmit", "-p", project], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  process.stderr.write(`[${label}] failed to start TypeScript: ${result.error.message}\n`);
  process.exit(1);
}
if (result.signal) {
  process.stderr.write(`[${label}] TypeScript terminated by signal ${result.signal}\n`);
  process.exit(1);
}
process.exit(result.status ?? 1);
