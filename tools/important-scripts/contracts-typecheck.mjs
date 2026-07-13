import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const contracts = [
  "contracts/master.openapi.yaml",
  "core/identity/contracts/auth.openapi.yaml",
  "core/providers/contracts/providers.openapi.yaml",
  "core/workforce/contracts/workforce.openapi.yaml",
  "services/dsh/contracts/dsh.openapi.yaml",
  "services/wlt/contracts/wlt.openapi.yaml",
];

const tempDir = mkdtempSync(join(tmpdir(), "bthwani-contracts-"));
const ruleset = join(tempDir, "spectral.yaml");
writeFileSync(ruleset, "extends: [spectral:oas]\n", "utf8");

function run(label, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: new URL("../..", import.meta.url),
    encoding: "utf8",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${label} failed with exit code ${result.status}`);
  }

  if (options.stdio !== "pipe") {
    return;
  }
  if (result.stderr) process.stderr.write(result.stderr);
}

try {
  run("contracts-foundation", "node", ["tools/important-scripts/contracts-foundation.mjs"], {
    stdio: "inherit",
  });
  run("spectral active contract lint", "pnpm", [
    "exec",
    "spectral",
    "lint",
    "--ruleset",
    ruleset,
    "--fail-severity",
    "error",
    ...contracts,
  ], { stdio: "inherit" });

  for (const contract of contracts) {
    run(`openapi-typescript ${contract}`, "pnpm", [
      "exec",
      "openapi-typescript",
      contract,
    ]);
  }

  console.log("contracts-typecheck: OK");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
