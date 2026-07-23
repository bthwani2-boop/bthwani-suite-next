<#
.SYNOPSIS
  Destructive-on-isolated-database verification for the canonical DSH runner.

.DESCRIPTION
  This script is CI-only. It proves that checksum drift is rejected and that a
  migration failure rolls back both schema effects and its ledger record.
#>

[CmdletBinding()]
param(
  [string]$DatabaseUrl = $env:DATABASE_URL
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw "DATABASE_URL is required for migration-runner verification."
}
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "psql is required for migration-runner verification."
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "../../../..")).Path
$Runner = Join-Path $ScriptDir "invoke-dsh-database.ps1"
$MigrationDir = Join-Path $RepoRoot "services/dsh/database/migrations"
$ProbeName = "dsh-999_ci_atomicity_probe.sql"
$ProbePath = Join-Path $MigrationDir $ProbeName

function Invoke-ProbePsql {
  param([Parameter(Mandatory = $true)][string]$Sql)
  $output = $Sql | & psql $DatabaseUrl -X -q -v ON_ERROR_STOP=1 -tA
  if ($LASTEXITCODE -ne 0) {
    throw "Probe psql command failed (exit $LASTEXITCODE)."
  }
  return (($output | ForEach-Object { "$_" }) -join "`n").Trim()
}

$firstMigration = Get-ChildItem -LiteralPath $MigrationDir -File -Filter "*.sql" |
  Where-Object Name -ne $ProbeName |
  Sort-Object Name |
  Select-Object -First 1
if (-not $firstMigration) {
  throw "No DSH migration is available for checksum verification."
}

$escapedFirstName = $firstMigration.Name.Replace("'", "''")
$originalChecksum = Invoke-ProbePsql "SELECT checksum FROM runtime_schema_migrations WHERE migration_name = '$escapedFirstName';"
if ([string]::IsNullOrWhiteSpace($originalChecksum)) {
  throw "Canonical migration ledger does not contain $($firstMigration.Name)."
}

Write-Host "--- Verifying checksum drift rejection ---"
try {
  Invoke-ProbePsql "UPDATE runtime_schema_migrations SET checksum = repeat('0', 64) WHERE migration_name = '$escapedFirstName';" | Out-Null

  $checksumRejected = $false
  try {
    & $Runner -Action migrate -Transport url -DatabaseUrl $DatabaseUrl
  } catch {
    $checksumRejected = $_.Exception.Message -match "checksum mismatch"
  }

  if (-not $checksumRejected) {
    throw "Canonical runner did not reject migration checksum drift."
  }
} finally {
  $escapedChecksum = $originalChecksum.Replace("'", "''")
  Invoke-ProbePsql "UPDATE runtime_schema_migrations SET checksum = '$escapedChecksum' WHERE migration_name = '$escapedFirstName';" | Out-Null
}
Write-Host "Checksum drift rejection: PASS"

Write-Host "--- Verifying atomic migration rollback ---"
@"
CREATE TABLE dsh_ci_atomicity_probe (
  id INTEGER PRIMARY KEY
);

SELECT 1 / 0;
"@ | Set-Content -LiteralPath $ProbePath -Encoding utf8NoBOM

try {
  $probeRejected = $false
  try {
    & $Runner -Action migrate -Transport url -DatabaseUrl $DatabaseUrl
  } catch {
    $probeRejected = $true
  }

  if (-not $probeRejected) {
    throw "The intentionally failing migration unexpectedly succeeded."
  }

  $tableExists = Invoke-ProbePsql "SELECT CASE WHEN to_regclass('public.dsh_ci_atomicity_probe') IS NULL THEN '0' ELSE '1' END;"
  $ledgerExists = Invoke-ProbePsql "SELECT COUNT(*) FROM runtime_schema_migrations WHERE migration_name = '$ProbeName';"

  if ($tableExists -ne "0") {
    throw "Atomic rollback failed: dsh_ci_atomicity_probe still exists."
  }
  if ($ledgerExists -ne "0") {
    throw "Atomic rollback failed: probe migration was written to the ledger."
  }
} finally {
  Remove-Item -LiteralPath $ProbePath -Force -ErrorAction SilentlyContinue
  Invoke-ProbePsql "DROP TABLE IF EXISTS dsh_ci_atomicity_probe; DELETE FROM runtime_schema_migrations WHERE migration_name = '$ProbeName';" | Out-Null
}
Write-Host "Atomic migration rollback: PASS"

& $Runner -Action migrate -Transport url -DatabaseUrl $DatabaseUrl
Write-Host "Canonical migration runner verification: PASS"
