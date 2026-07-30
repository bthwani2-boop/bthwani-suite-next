<#
.SYNOPSIS
  Proves the WLT migration-ledger legacy-backfill logic (Get-WltLegacyBackfillList /
  Invoke-WltMigrate in infra/docker/scripts/runtime.ps1) across the scenarios a
  false backfill could silently corrupt: fresh database, legacy pre-ledger
  database, partial-upgrade database, second run (no-op), and rejection of a
  post-hoc edited migration file.

.PARAMETER PsqlMode
  docker  — run psql inside the compose postgres container (local default).
  native  — run the host psql binary (CI service container; uses PGHOST etc.).
#>

param(
  [ValidateSet("docker", "native")]
  [string]$PsqlMode = "docker"
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "../../")).Path
Set-Location -LiteralPath $RepoRoot

# Reuse the production probe map and backfill-decision logic instead of
# reimplementing it, so this test can never silently drift from what
# Invoke-WltMigrate actually does.
. (Join-Path $RepoRoot "infra/docker/scripts/wlt-migration-probes.ps1")

$ComposeFile = "infra/docker/compose.runtime.yml"
$EnvFile = "infra/docker/env/runtime.env.example"
$MigrationDir = "services/wlt/database/migrations"
# Every WLT migration-ledger probe hardcodes the `public` schema (matching
# what production actually does against the real wlt_runtime database), so
# scenario isolation must be a genuinely separate database — not just a
# separate schema inside wlt_runtime, which the probes would never see, and
# never the real wlt_runtime database itself, which the running WLT service
# depends on. Reuses the same superuser role the sibling DSH migration test
# (test-central-catalog-migration.ps1) already uses for this.
$AdminUser = "bthwani_runtime"
$AdminDb = "bthwani_runtime"
$TestDb = "wlt_migration_ledger_test"

function Invoke-TestPsql {
  param(
    [string]$Sql,
    [string]$Db = $TestDb
  )
  $flags = @("-v", "ON_ERROR_STOP=1", "-tA")
  if ($PsqlMode -eq "docker") {
    $out = $Sql |
      docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres psql -U $AdminUser -d $Db @flags
  } else {
    if (-not $env:PGHOST) { $env:PGHOST = "localhost" }
    if (-not $env:PGPORT) { $env:PGPORT = "5432" }
    $out = $Sql | psql -U $AdminUser -d $Db @flags
  }
  if ($LASTEXITCODE -ne 0) {
    throw "psql failed (exit $LASTEXITCODE) for: $(($Sql -split "`n")[0])"
  }
  return ($out -join "`n").Trim()
}

function Assert-Equal([string]$Actual, [string]$Expected, [string]$Label) {
  if ($Actual -ne $Expected) {
    throw "ASSERT FAILED [$Label]: expected '$Expected' got '$Actual'"
  }
  Write-Host "  ok: $Label = $Expected"
}

function Assert-Throws([scriptblock]$Action, [string]$ExpectedMessageFragment, [string]$Label) {
  $threw = $false
  try {
    & $Action
  } catch {
    $threw = $true
    if ($_.Exception.Message -notlike "*$ExpectedMessageFragment*") {
      throw "ASSERT FAILED [$Label]: expected exception containing '$ExpectedMessageFragment', got '$($_.Exception.Message)'"
    }
  }
  if (-not $threw) {
    throw "ASSERT FAILED [$Label]: expected an exception, none was thrown"
  }
  Write-Host "  ok: $Label threw as expected"
}

function Reset-TestDb {
  Invoke-TestPsql -Db $AdminDb -Sql "DROP DATABASE IF EXISTS $TestDb WITH (FORCE);" | Out-Null
  Invoke-TestPsql -Db $AdminDb -Sql "CREATE DATABASE $TestDb;" | Out-Null
}

function Get-WltMigrationFiles {
  return Get-ChildItem -LiteralPath $MigrationDir -Filter "*.sql" | Sort-Object Name
}

function Apply-WltMigrationRaw {
  param([System.IO.FileInfo]$File)
  $content = Get-Content -LiteralPath $File.FullName -Raw
  Invoke-TestPsql -Sql $content | Out-Null
}

function New-LedgerTable {
  Invoke-TestPsql @"
CREATE TABLE IF NOT EXISTS runtime_schema_migrations (
  migration_name TEXT        PRIMARY KEY,
  checksum       TEXT        NOT NULL,
  applied_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"@ | Out-Null
}

function Get-FileChecksum([System.IO.FileInfo]$File) {
  return (Get-FileHash -LiteralPath $File.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Add-LedgerRow([System.IO.FileInfo]$File) {
  $checksum = Get-FileChecksum $File
  Invoke-TestPsql @"
INSERT INTO runtime_schema_migrations (migration_name, checksum)
VALUES ('$($File.Name)', '$checksum')
ON CONFLICT (migration_name) DO NOTHING;
"@ | Out-Null
}

# Mirrors Invoke-WltMigrate's control flow exactly (probe-gated backfill, then
# normal checksum-verified apply loop) but against this test's own psql
# runner, so the whole ledger lifecycle — not just the backfill decision — is
# exercised the same way production code exercises it.
function Invoke-WltMigrateUnderTest {
  $files = Get-WltMigrationFiles
  Test-WltMigrationProbeCoverage -MigrationFiles $files
  New-LedgerTable

  $ledgerRowCount = Invoke-TestPsql "SELECT COUNT(*) FROM runtime_schema_migrations;"
  $sentinelExists = Invoke-TestPsql "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'wlt_payment_sessions';"
  if ($ledgerRowCount -eq "0" -and $sentinelExists -ne "0") {
    $backfillList = Get-WltLegacyBackfillList -MigrationFiles $files -PsqlRunner ${function:Invoke-TestPsql}
    foreach ($f in $backfillList) {
      Add-LedgerRow $f
      Write-Host "  Backfilled (schema already present): $($f.Name)"
    }
  }

  foreach ($f in $files) {
    $checksum = Get-FileChecksum $f
    $recorded = Invoke-TestPsql "SELECT checksum FROM runtime_schema_migrations WHERE migration_name = '$($f.Name)';"
    if ($recorded -eq $checksum) {
      Write-Host "  Skipping (already applied): $($f.Name)"
      continue
    }
    if ($recorded -ne "") {
      throw "Migration ledger checksum mismatch for $($f.Name): recorded $recorded, file $checksum. Applied migrations must never be edited; add a new migration instead."
    }
    Write-Host "  Applying: $($f.Name)"
    Apply-WltMigrationRaw $f
    Invoke-TestPsql @"
INSERT INTO runtime_schema_migrations (migration_name, checksum)
VALUES ('$($f.Name)', '$checksum')
ON CONFLICT (migration_name) DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = NOW();
"@ | Out-Null
  }
}

$AllFiles = Get-WltMigrationFiles
$AllCount = $AllFiles.Count

# ── Scenario 1: fresh database ─────────────────────────────────────────────
Write-Host "`n=== Scenario 1: fresh database ==="
Reset-TestDb
Invoke-WltMigrateUnderTest
Assert-Equal (Invoke-TestPsql "SELECT COUNT(*)::text FROM runtime_schema_migrations;") "$AllCount" "fresh: ledger has one row per migration file"
Assert-Equal (Invoke-TestPsql "SELECT (to_regclass('public.wlt_ledger_accounts') IS NOT NULL)::text") "true" "fresh: wlt-017 ledger kernel table genuinely created"
Assert-Equal (Invoke-TestPsql "SELECT (to_regclass('public.wlt_commissions') IS NOT NULL)::text") "true" "fresh: wlt-005 table genuinely created"
Write-Host "Scenario 1: PASS"

# ── Scenario 2: legacy pre-ledger database (only wlt-000..006 truly ran) ──
Write-Host "`n=== Scenario 2: legacy pre-ledger database ==="
Reset-TestDb
foreach ($f in $AllFiles) {
  if ($f.Name -ge "wlt-007") { break }
  Apply-WltMigrationRaw $f
}
Invoke-WltMigrateUnderTest
Assert-Equal (Invoke-TestPsql "SELECT COUNT(*)::text FROM runtime_schema_migrations;") "$AllCount" "legacy: ledger fully populated after upgrade"
Assert-Equal (Invoke-TestPsql "SELECT checksum FROM runtime_schema_migrations WHERE migration_name = 'wlt-000_financial_references.sql';") (Get-FileChecksum ($AllFiles | Where-Object Name -eq "wlt-000_financial_references.sql")) "legacy: wlt-000 backfilled with correct checksum"
Assert-Equal (Invoke-TestPsql "SELECT (to_regclass('public.wlt_ledger_accounts') IS NOT NULL)::text") "true" "legacy: wlt-017 ledger kernel table genuinely applied (not falsely backfilled)"
Assert-Equal (Invoke-TestPsql "SELECT (to_regclass('public.wlt_payout_destinations') IS NOT NULL)::text") "true" "legacy: wlt-010 genuinely applied"
Assert-Equal (Invoke-TestPsql "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_commissions' AND column_name = 'updated_at')::text") "true" "legacy: wlt-022 commission lifecycle columns genuinely applied"
Write-Host "Scenario 2: PASS"

# ── Scenario 3: partial-upgrade database (wlt-000..017 already ledgered) ──
Write-Host "`n=== Scenario 3: partial-upgrade database ==="
Reset-TestDb
foreach ($f in $AllFiles) {
  Apply-WltMigrationRaw $f
  if ($f.Name -eq "wlt-017_ledger_kernel.sql") { break }
}
New-LedgerTable
foreach ($f in $AllFiles) {
  Add-LedgerRow $f
  if ($f.Name -eq "wlt-017_ledger_kernel.sql") { break }
}
$preRunRowCount = Invoke-TestPsql "SELECT COUNT(*)::text FROM runtime_schema_migrations;"
Assert-Equal $preRunRowCount "17" "partial: fixture has 17 ledgered rows (wlt-000..017, no wlt-016 file)"
Invoke-WltMigrateUnderTest
Assert-Equal (Invoke-TestPsql "SELECT COUNT(*)::text FROM runtime_schema_migrations;") "$AllCount" "partial: remaining migrations applied for real, none re-backfilled"
Assert-Equal (Invoke-TestPsql "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_payout_destinations' AND column_name = 'account_number_encrypted')::text") "true" "partial: wlt-018 encryption columns genuinely applied"
Write-Host "Scenario 3: PASS"

# ── Scenario 4: second run is a no-op ──────────────────────────────────────
Write-Host "`n=== Scenario 4: second run / no-op ==="
$beforeSecondRun = Invoke-TestPsql "SELECT string_agg(migration_name || ':' || applied_at::text, ',' ORDER BY migration_name) FROM runtime_schema_migrations;"
Invoke-WltMigrateUnderTest
$afterSecondRun = Invoke-TestPsql "SELECT string_agg(migration_name || ':' || applied_at::text, ',' ORDER BY migration_name) FROM runtime_schema_migrations;"
Assert-Equal $afterSecondRun $beforeSecondRun "second run: no ledger rows changed"
Write-Host "Scenario 4: PASS"

# ── Scenario 5: checksum-mutation rejection ────────────────────────────────
Write-Host "`n=== Scenario 5: checksum-mutation rejection ==="
Invoke-TestPsql "UPDATE runtime_schema_migrations SET checksum = 'deadbeef' WHERE migration_name = 'wlt-003_refunds.sql';" | Out-Null
Assert-Throws { Invoke-WltMigrateUnderTest } "Migration ledger checksum mismatch" "checksum mismatch still rejected after new backfill logic"
Write-Host "Scenario 5: PASS"

Invoke-TestPsql -Db $AdminDb -Sql "DROP DATABASE IF EXISTS $TestDb WITH (FORCE);" | Out-Null
Write-Host "`ntest-wlt-migration-ledger: PASS"
