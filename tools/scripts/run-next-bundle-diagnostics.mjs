import { spawnSync } from "node:child_process";
import path from "node:path";

const repoRoot = process.cwd();
const environment = {
  ...process.env,
  ANALYZE: "true",
  CI: process.env.CI || "1",
};

const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(
  executable,
  ["--dir", "apps/control-panel/runtime", "build"],
  {
    cwd: path.resolve(repoRoot),
    env: environment,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
