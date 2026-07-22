import { spawnSync } from "node:child_process";

const lockedVersion = "v1.7.12";

function execute(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 16 * 1024 * 1024,
  });
}

function normalizedOutput(result) {
  return [result.stdout, result.stderr]
    .filter(Boolean)
    .join("\n")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .join("\n");
}

let result = execute("actionlint", ["-format", "{{json .}}"]);
if (result.error?.code === "ENOENT") {
  result = execute("go", [
    "run",
    `github.com/rhysd/actionlint/cmd/actionlint@${lockedVersion}`,
    "-format",
    "{{json .}}",
  ]);
}

const output = normalizedOutput(result);
if (output) process.stdout.write(`${output}\n`);

if (result.error) {
  console.error(`[ACTIONLINT FAIL] unable to execute validator: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  console.error(`[ACTIONLINT FAIL] workflow validation exited with ${result.status ?? 1} using ${lockedVersion}`);
  process.exit(result.status ?? 1);
}
console.log(`[ACTIONLINT PASS] GitHub Actions workflows are valid using ${lockedVersion}`);
