import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["tools/scripts/guard-mobile-apps.mjs"],
  { stdio: "inherit", shell: true }
);

process.exit(result.status ?? 1);
