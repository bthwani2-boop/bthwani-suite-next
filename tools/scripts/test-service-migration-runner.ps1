<#
.SYNOPSIS
  Verifies the canonical service migration runner against a real PostgreSQL database.

.DESCRIPTION
  Covers a fresh but non-empty database, deterministic re-execution, immutable
  checksums, per-migration atomic rollback, and roll-forward recovery after a
  partially failed batch.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern("^[a-z0-9][a-z0-9-]*$")]
  [string]$ServiceKey,

  [Parameter(Mandatory = $true)]
  [string]$MigrationDirectory,

  [string]$DatabaseUrl = $env:DATABASE_URL
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RunnerPath = Join-Path $PSScriptRoot "invoke-service-migrations.ps1"
$MigrationPath = if ([System.IO.Path]::IsPathRooted($MigrationDirectory)) {
  $MigrationDirectory
} else {
  Join-Path $RepoRoot $MigrationDirectory
}

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw "DatabaseUrl is required."
}
if (-not (Test-Path -LiteralPath $RunnerPath -PathType Leaf)) {
  throw "Canonical migration runner not found: $RunnerPath"
}
if (-not (Test-Path -LiteralPath $MigrationPath -PathType Container)) {
  throw "Migration directory not found: $MigrationPath"
}
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "psql is required to test service migrations."
}
if (-not (Get-Command pwsh -ErrorAction SilentlyContinue)) {
  throw "pwsh is required to test service migrations."
}

$SafeServiceKey = ($ServiceKey -replace "[^a-zA-Z0-9_]", "_").ToLowerInvariant()
$SentinelTable = "ci_migration_sentinel_$SafeServiceKey"
$ProbeOneTable = "ci_migration_probe_${SafeServiceKey}_one"
$ProbeTwoTable = "ci_migration_probe_${SafeServiceKey}_two"
$ProbePrefix = "ci-$ServiceKey-probe"
$ProbeOneFile = "$ProbePrefix-991_base.sql"
$ProbeTwoFile = "$ProbePrefix-992_followup.sql"

function ConvertTo-SqlLiteral {
  param([Parameter(Mandatory = $true)][string]$Value)
  return $Value.Replace("'", "''")
}

function Invoke-DatabaseSql {
  param(
    [Parameter(Mandatory = $true)][string]$Sql,
    [switch]$TuplesOnly
  )

  $arguments = @($DatabaseUrl, "-X", "-q", "-v", "ON_ERROR_STOP=1")
  if ($TuplesOnly) { $arguments += "-tA" }
  $output = $Sql | & psql @arguments 2>&1
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    $message = (($output | ForEach-Object { "$_" }) -join "`n").Trim()
    throw "PostgreSQL verification command failed (exit $exitCode).`n$message"
  }
  return (($output | ForEach-Object { "$_" }) -join "`n").Trim()
}

function Invoke-RunnerProcess {
  param(
    [Parameter(Mandatory = $true)][string]$Directory,
    [Parameter(Mandatory = $true)][bool]$ExpectSuccess,
    [string]$RunnerServiceKey = $ServiceKey
  )

  $output = & pwsh -NoProfile -ExecutionPolicy Bypass -File $RunnerPath `
    -ServiceKey $RunnerServiceKey `
    -MigrationDirectory $Directory `
    -DatabaseUrl $DatabaseUrl 2>&1
  $exitCode = $LASTEXITCODE

  if ($ExpectSuccess -and $exitCode -ne 0) {
    $message = (($output | ForEach-Object { "$_" }) -join "`n").Trim()
    throw "Migration runner unexpectedly failed for '$RunnerServiceKey' (exit $exitCode).`n$message"
  }
  if (-not $ExpectSuccess -and $exitCode -eq 0) {
    throw "Migration runner unexpectedly succeeded for the required failure probe '$RunnerServiceKey'."
  }

  if ($ExpectSuccess) {
    foreach ($line in $output) { Write-Host "$line" }
  }
}

$canonicalFiles = @(Get-ChildItem -LiteralPath $MigrationPath -File -Filter "*.sql" |
  Sort-Object { $_.Name.ToLowerInvariant() }, Name)
if ($canonicalFiles.Count -eq 0) {
  throw "No canonical migrations found for '$ServiceKey'."
}

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) "bthwani-migration-$ServiceKey-$([guid]::NewGuid().ToString('N'))"
$driftDirectory = Join-Path $temporaryRoot "checksum-drift"
$partialDirectory = Join-Path $temporaryRoot "partial-failure"
New-Item -ItemType Directory -Path $driftDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $partialDirectory -Force | Out-Null

try {
  Write-Host "--- ${ServiceKey}: fresh non-empty database ---"
  Invoke-DatabaseSql -Sql @"
CREATE TABLE IF NOT EXISTS $SentinelTable (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL
);
INSERT INTO $SentinelTable (id, payload)
VALUES (1, 'preexisting-data')
ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload;
"@ | Out-Null

  Invoke-RunnerProcess -Directory $MigrationPath -ExpectSuccess $true

  $sentinelCount = Invoke-DatabaseSql -TuplesOnly -Sql "SELECT count(*) FROM $SentinelTable WHERE id = 1 AND payload = 'preexisting-data';"
  if ($sentinelCount -ne "1") {
    throw "Pre-existing data was not preserved while applying '$ServiceKey' migrations."
  }

  Write-Host "--- ${ServiceKey}: deterministic re-execution ---"
  Invoke-RunnerProcess -Directory $MigrationPath -ExpectSuccess $true
  $ledgerCount = Invoke-DatabaseSql -TuplesOnly -Sql "SELECT count(*) FROM runtime_schema_migrations;"
  if ([int]$ledgerCount -ne $canonicalFiles.Count) {
    throw "Migration ledger count mismatch for '$ServiceKey': expected=$($canonicalFiles.Count) actual=$ledgerCount"
  }

  Write-Host "--- ${ServiceKey}: checksum immutability ---"
  Copy-Item -Path (Join-Path $MigrationPath "*") -Destination $driftDirectory -Recurse -Force
  $driftFile = Get-ChildItem -LiteralPath $driftDirectory -File -Filter "*.sql" |
    Sort-Object { $_.Name.ToLowerInvariant() }, Name |
    Select-Object -First 1
  Add-Content -LiteralPath $driftFile.FullName -Value "`n-- intentional checksum drift probe"
  Invoke-RunnerProcess -Directory $driftDirectory -ExpectSuccess $false
  Invoke-RunnerProcess -Directory $MigrationPath -ExpectSuccess $true

  Write-Host "--- ${ServiceKey}: partial failure rollback and roll-forward ---"
  Set-Content -LiteralPath (Join-Path $partialDirectory $ProbeOneFile) -Value @"
CREATE TABLE $ProbeOneTable (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL
);
INSERT INTO $ProbeOneTable (id, payload) VALUES (1, 'first-committed');
"@
  Set-Content -LiteralPath (Join-Path $partialDirectory $ProbeTwoFile) -Value @"
CREATE TABLE $ProbeTwoTable (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL
);
INSERT INTO $ProbeTwoTable (id, payload) VALUES (1, 'must-rollback');
SELECT 1 / 0;
"@

  Invoke-RunnerProcess -Directory $partialDirectory -ExpectSuccess $false -RunnerServiceKey "$ServiceKey-partial-probe"

  $firstApplied = Invoke-DatabaseSql -TuplesOnly -Sql "SELECT count(*) FROM $ProbeOneTable WHERE id = 1 AND payload = 'first-committed';"
  if ($firstApplied -ne "1") {
    throw "The successful migration before the partial failure was not retained."
  }
  $secondRolledBack = Invoke-DatabaseSql -TuplesOnly -Sql "SELECT CASE WHEN to_regclass('public.$ProbeTwoTable') IS NULL THEN '1' ELSE '0' END;"
  if ($secondRolledBack -ne "1") {
    throw "The failed migration left a partial table behind."
  }
  $probeTwoNameSql = ConvertTo-SqlLiteral $ProbeTwoFile
  $failedLedgerCount = Invoke-DatabaseSql -TuplesOnly -Sql "SELECT count(*) FROM runtime_schema_migrations WHERE migration_name = '$probeTwoNameSql';"
  if ($failedLedgerCount -ne "0") {
    throw "The failed migration was recorded in the immutable ledger."
  }

  Set-Content -LiteralPath (Join-Path $partialDirectory $ProbeTwoFile) -Value @"
CREATE TABLE $ProbeTwoTable (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL
);
INSERT INTO $ProbeTwoTable (id, payload) VALUES (1, 'recovered');
"@
  Invoke-RunnerProcess -Directory $partialDirectory -ExpectSuccess $true -RunnerServiceKey "$ServiceKey-partial-probe"

  $recovered = Invoke-DatabaseSql -TuplesOnly -Sql "SELECT count(*) FROM $ProbeTwoTable WHERE id = 1 AND payload = 'recovered';"
  if ($recovered -ne "1") {
    throw "Roll-forward after the partial failure did not recover the second migration."
  }

  $probeOneNameSql = ConvertTo-SqlLiteral $ProbeOneFile
  Invoke-DatabaseSql -Sql @"
DROP TABLE IF EXISTS $ProbeTwoTable;
DROP TABLE IF EXISTS $ProbeOneTable;
DROP TABLE IF EXISTS $SentinelTable;
DELETE FROM runtime_schema_migrations
WHERE migration_name IN ('$probeOneNameSql', '$probeTwoNameSql');
"@ | Out-Null

  $finalLedgerCount = Invoke-DatabaseSql -TuplesOnly -Sql "SELECT count(*) FROM runtime_schema_migrations;"
  if ([int]$finalLedgerCount -ne $canonicalFiles.Count) {
    throw "Canonical migration ledger changed after probe cleanup for '$ServiceKey'."
  }

  Write-Host "$ServiceKey migration safety contracts: PASS"
} finally {
  if (Test-Path -LiteralPath $temporaryRoot) {
    Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
  }
}
