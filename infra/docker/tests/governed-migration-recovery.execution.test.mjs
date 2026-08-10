// Locks the governed migration ledger recovery contract.
//
// Regression origin: the recovery guard in invoke-runtime-database-migrations.ps1
// classified the failure by reading a shared $script:LastPsqlOutput. When a
// migration batch failed, Invoke-BthwaniGovernedMigrations caught it and issued
// a bookkeeping UPDATE through $ExecuteStatement, which re-entered
// Invoke-ComposePsql and overwrote that variable with the UPDATE's output. By
// the time the guard looked, the conflict token was gone, so the rebuild path
// was unreachable for exactly the failure it was written for and bootstrap-dev
// could not self-heal.
//
// Second defect: recovery permission was inferred from $env:npm_lifecycle_event,
// a pnpm side effect rather than a contract, whose allow-list also covered
// client/partner/captain/field/control -- so ordinary app startup was authorized
// to destructively rebuild a database.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const runner = path.join(repoRoot, "infra/docker/scripts/schema-migration-runner.ps1");
const migrations = path.join(repoRoot, "infra/docker/scripts/invoke-runtime-database-migrations.ps1");
const runtime = path.join(repoRoot, "infra/docker/scripts/runtime.ps1");
const phase = path.join(repoRoot, "tools/scripts/invoke-runtime-phase.ps1");

function pwsh(t, command) {
  const exe = process.platform === "win32" ? "pwsh.exe" : "pwsh";
  const probe = spawnSync(exe, ["-NoLogo", "-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (probe.error?.code === "ENOENT") {
    t.skip("pwsh is unavailable in this environment");
    return null;
  }
  return spawnSync(exe, ["-NoLogo", "-NoProfile", "-Command", command], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
  });
}

const quoted = (value) => value.replaceAll("'", "''");

test("a ledger conflict stays classifiable after the failure-bookkeeping statement runs", (t) => {
  // This is the exact shape that defeated the old guard: the batch fails with a
  // ledger conflict, then a SUCCEEDING statement runs during error handling.
  const identityDir = path.join(repoRoot, "core/identity/database/migrations");

  const command = [
    `. '${quoted(runner)}'`,
    `$files = @(Get-ChildItem -LiteralPath '${quoted(identityDir)}' -Filter '*.sql' -File | Sort-Object Name)`,
    "$batch = { throw 'ERROR:  GOVERNED_MIGRATION_LEDGER_CONFLICT: service identity contains an unknown or checksum-invalid row' }",
    "$statement = { param([string]$Sql) 'UPDATE 0' }",
    "$classified = $false",
    "try { Invoke-BthwaniGovernedMigrations -ServiceName 'identity' -MigrationFiles $files -SourceCommitSha 'aaaaaaa' -ExecuteBatch $batch -ExecuteStatement $statement } catch { $classified = Test-BthwaniRecoverableLedgerConflict -FailureText ([string] $_.Exception.Message) }",
    "if (-not $classified) { throw 'ledger conflict was lost before the recovery guard could classify it' }",
  ].join("; ");

  const result = pwsh(t, command);
  if (!result) return;
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("the recoverable conflict set covers ledger drift but not execution failure", (t) => {
  const command = [
    `. '${quoted(runner)}'`,
    "$cases = @{ 'GOVERNED_MIGRATION_LEDGER_CONFLICT' = $true; 'LEGACY_MIGRATION_LEDGER_CONFLICT' = $true; 'BTHWANI_MIGRATION_LEDGER_SCHEMA_CONFLICT' = $true; 'MIGRATION_CHECKSUM_MISMATCH' = $true; 'UNTRACKED_LEGACY_SCHEMA' = $true; 'DIRTY_MIGRATION_STATE' = $false; 'INCOMPLETE_MIGRATION_RUN' = $false; 'connection refused' = $false }",
    "foreach ($code in $cases.Keys) { $actual = Test-BthwaniRecoverableLedgerConflict -FailureText $code; if ($actual -ne $cases[$code]) { throw \"$code classified as $actual\" } }",
  ].join("; ");

  const result = pwsh(t, command);
  if (!result) return;
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("every recoverable code the classifier accepts is actually raised by the runner SQL", () => {
  // Guards against the classifier drifting away from the authority that raises
  // the codes, which is why the list lives in schema-migration-runner.ps1.
  const source = fs.readFileSync(runner, "utf8");
  const declared = source
    .slice(source.indexOf("$script:BthwaniRecoverableLedgerConflictCodes = @("))
    .split(")")[0]
    .match(/'([A-Z_]+)'/g)
    .map((entry) => entry.replaceAll("'", ""));

  assert.ok(declared.length >= 8, `expected the recoverable set to be populated, got ${declared.length}`);
  for (const code of declared) {
    assert.ok(
      source.includes(`RAISE EXCEPTION '${code}`),
      `${code} is classified as recoverable but no SQL in the runner raises it`,
    );
  }
});

test("local ledger recovery is an explicit permission, not ambient lifecycle state", () => {
  const source = fs.readFileSync(migrations, "utf8");

  assert.match(source, /\[switch\]\$AllowLocalLedgerRecovery/);
  assert.match(source, /if \(\$AllowLocalLedgerRecovery\) \{ return \$true \}/);

  // npm_lifecycle_event must not gate authorization anywhere in the runtime
  // scripts: it is a pnpm side effect that any process hop silently drops.
  for (const file of [migrations, runtime, phase]) {
    assert.doesNotMatch(
      fs.readFileSync(file, "utf8"),
      /npm_lifecycle_event/,
      `${path.basename(file)} must not authorize destructive recovery from npm_lifecycle_event`,
    );
  }

  // The shared mutable buffer that defeated the guard must stay gone.
  assert.doesNotMatch(source, /\$script:LastPsqlOutput\s*=/);
});

test("only bootstrap-dev grants recovery; up and smoke must surface the conflict", () => {
  const source = fs.readFileSync(runtime, "utf8");
  assert.match(source, /\$allowLocalLedgerRecovery = \(\$Action -eq "bootstrap-dev"\)/);

  // The switch is passed only on the guarded branch, never unconditionally.
  const invocations = source.match(/GovernedMigrationScript[^\n]*-AllowLocalLedgerRecovery/g) ?? [];
  assert.equal(invocations.length, 1, "recovery permission must be passed from exactly one guarded branch");
});
