import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["tools/scripts/guard-mobile-apps.mjs"],
  {
    stdio: "inherit",
    shell: false
  }
);

if (result.error) {
  console.error("FAIL:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
