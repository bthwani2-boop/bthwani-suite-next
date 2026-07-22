import { execFileSync, execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { hasBinary, repoRoot } from "./_external-tool-runner.mjs";

const version = "1.27.0";
const args = ["--no-config", "--min-severity", "high", "--min-confidence", "high", ".github/workflows"];

function execute(binary, binaryArgs) {
  execFileSync(binary, binaryArgs, {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
}

function runPinnedFallback() {
  if (hasBinary("uvx")) {
    execute("uvx", ["--from", `zizmor==${version}`, "zizmor", ...args]);
    return;
  }

  if (hasBinary("pipx")) {
    execute("pipx", ["run", "--spec", `zizmor==${version}`, "zizmor", ...args]);
    return;
  }

  const userBin = path.join(os.homedir(), ".local", "bin");
  execSync(
    `python3 -m pip install --user --disable-pip-version-check --break-system-packages \"zizmor==${version}\"`,
    { cwd: repoRoot, stdio: "inherit", shell: true },
  );
  execute(path.join(userBin, "zizmor"), args);
}

try {
  if (hasBinary("zizmor")) execute("zizmor", args);
  else runPinnedFallback();
  console.log(`[ZIZMOR PASS] workflow security verified with locked version ${version}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ZIZMOR FAIL] ${message} decision=FIX_REQUIRED`);
  process.exit(1);
}
