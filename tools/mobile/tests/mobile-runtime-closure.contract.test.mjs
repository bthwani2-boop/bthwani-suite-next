import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

test("runtime closure converges governed databases before smoke", () => {
  const closure = read("tools/scripts/verify-mobile-runtime-closure.ps1");
  assert.match(closure, /pnpm run runtime:full:bootstrap-dev/);
  assert.match(closure, /pnpm run runtime:full:smoke/);
  assert.ok(
    closure.indexOf("pnpm run runtime:full:bootstrap-dev") <
      closure.indexOf("pnpm run runtime:full:smoke"),
    "governed bootstrap must precede runtime smoke",
  );
  assert.doesNotMatch(
    closure,
    /ensure-mobile-dev-runtime\.ps1/,
    "final runtime closure must not use health-only mobile readiness as its migration gate",
  );
});

test("full bootstrap is the explicit local ledger-rebuild lifecycle", () => {
  const packageJson = JSON.parse(read("package.json"));
  const command = packageJson.scripts?.["runtime:full:bootstrap-dev"] ?? "";
  assert.match(command, /-Action bootstrap-dev/);
  assert.match(command, /-Force/);

  // Recovery permission is an explicit switch threaded from the bootstrap-dev
  // phase, not a lifecycle-event string the runner sniffs out of its
  // environment. The runner therefore no longer names the pnpm script at all;
  // runtime.ps1 is what decides, and only for bootstrap-dev.
  const migrationRunner = read("infra/docker/scripts/invoke-runtime-database-migrations.ps1");
  assert.match(migrationRunner, /\[switch\]\$AllowLocalLedgerRecovery/);
  assert.match(migrationRunner, /rebuild-runtime-service-database\.ps1/);

  const runtimeScript = read("infra/docker/scripts/runtime.ps1");
  assert.match(runtimeScript, /\$allowLocalLedgerRecovery = \(\$Action -eq "bootstrap-dev"\)/);

  // The recoverable conflict set lives with the SQL that raises it.
  const migrationRunnerAuthority = read("infra/docker/scripts/schema-migration-runner.ps1");
  assert.match(migrationRunnerAuthority, /GOVERNED_MIGRATION_LEDGER_CONFLICT/);
});
