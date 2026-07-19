import { spawnSync } from "node:child_process";

function execute(command, args) {
  return spawnSync(command, args, { encoding: "utf8", stdio: "pipe" });
}

let result = execute("actionlint", []);
if (result.error?.code === "ENOENT") {
  result = execute("go", [
    "run",
    "github.com/rhysd/actionlint/cmd/actionlint@v1.7.7",
  ]);
}

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.error) {
  console.error(`[ACTIONLINT FAIL] unable to execute validator: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  console.error(`[ACTIONLINT FAIL] workflow validation exited with ${result.status ?? 1}`);
  process.exit(result.status ?? 1);
}
console.log("[ACTIONLINT PASS] GitHub Actions workflows are syntactically valid");
