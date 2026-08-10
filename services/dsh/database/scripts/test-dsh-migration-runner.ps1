<#
.SYNOPSIS
  Isolated verification for the canonical governed DSH migration authority.

.DESCRIPTION
  Proves that governed checksum drift is rejected through schema_migrations and
  that a failing manifest-registered migration rolls back both schema effects
  and its ledger row before a corrected roll-forward succeeds.
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
if (-not (Get-Command pwsh -ErrorAction SilentlyContinue)) {
  throw "pwsh is required for migration-runner verification."
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "../../../..")).Path
$DshRunner = Join-Path $ScriptDir "invoke-dsh-database.ps1"
$ServiceRunner = Join-Path $RepoRoot "tools/scripts/invoke-service-migrations.ps1"
$GovernedRunner = Join-Path $RepoRoot "infra/docker/scripts/schema-migration-runner.ps1"
$MigrationDir = Join-Path $RepoRoot "services/dsh/database/migrations"

foreach ($requiredFile in @($DshRunner, $ServiceRunner, $GovernedRunner)) {
  if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
    throw "Required governed migration authority not found: $requiredFile"
  }
}

. $GovernedRunner

function Invoke-ProbePsql {
  param([Parameter(Mandatory = $true)][string]$Sql)

  $output = $Sql | & psql $DatabaseUrl -X -q -v ON_ERROR_STOP=1 -tA 2>&1
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    $message = (($output | ForEach-Object { "$_" }) -join "`n").Trim()
    throw "Probe psql command failed (exit $exitCode).`n$message"
  }
  return (($output | ForEach-Object { "$_" }) -join "`n").Trim()
}

function Invoke-RunnerProcess {
  param(
    [Parameter(Mandatory = $true)][string]$RunnerPath,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [Parameter(Mandatory = $true)][bool]$ExpectSuccess,
    [string]$ExpectedFailurePattern = ""
  )

  $output = & pwsh -NoProfile -ExecutionPolicy Bypass -File $RunnerPath @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $message = (($output | ForEach-Object { "$_" }) -join "`n").Trim()
  foreach ($line in $output) { Write-Host "$line" }

  if ($ExpectSuccess -and $exitCode -ne 0) {
    throw "Migration runner unexpectedly failed (exit $exitCode).`n$message"
  }
  if (-not $ExpectSuccess -and $exitCode -eq 0) {
    throw "Migration runner unexpectedly succeeded for a required failure probe."
  }
  if (-not $ExpectSuccess -and -not [string]::IsNullOrWhiteSpace($ExpectedFailurePattern) -and
      $message -notmatch $ExpectedFailurePattern) {
    throw "Migration runner failed for an unexpected reason. Expected pattern '$ExpectedFailurePattern'.`n$message"
  }

  return $message
}

function ConvertTo-SqlLiteralValue {
  param([Parameter(Mandatory = $true)][string]$Value)
  return $Value.Replace("'", "''")
}

function Write-ProbeManifest {
  param(
    [Parameter(Mandatory = $true)][string]$Directory,
    [Parameter(Mandatory = $true)][string]$ServiceName,
    [Parameter(Mandatory = $true)][System.IO.FileInfo]$MigrationFile
  )

  $checksum = (Get-BthwaniPortableSqlChecksums -File $MigrationFile).Canonical
  $manifest = [ordered]@{
    schemaVersion = 1
    service = $ServiceName
    ordering = "explicit"
    orderingSource = "ci-generated"
    cutover = $MigrationFile.Name
    migrations = @(
      [ordered]@{
        ordinal = 1
        file = $MigrationFile.Name
        sha256 = $checksum
        historicalPrefix = "ci-001"
        state = "ACTIVE"
      }
    )
  }
  $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $Directory "manifest.json") -Encoding utf8NoBOM
}

$firstMigration = Get-ChildItem -LiteralPath $MigrationDir -File -Filter "*.sql" |
  Sort-Object { $_.Name.ToLowerInvariant() }, Name |
  Select-Object -First 1
if (-not $firstMigration) {
  throw "No DSH migration is available for checksum verification."
}

$escapedFirstName = ConvertTo-SqlLiteralValue $firstMigration.Name
$originalChecksum = Invoke-ProbePsql @"
SELECT checksum_sha256
FROM schema_migrations
WHERE service_name = 'dsh' AND migration_id = '$escapedFirstName';
"@
if ([string]::IsNullOrWhiteSpace($originalChecksum)) {
  throw "Canonical schema_migrations ledger does not contain $($firstMigration.Name)."
}

Write-Host "--- Verifying governed checksum drift rejection ---"
try {
  Invoke-ProbePsql @"
UPDATE schema_migrations
SET checksum_sha256 = repeat('0', 64)
WHERE service_name = 'dsh' AND migration_id = '$escapedFirstName';
"@ | Out-Null

  Invoke-RunnerProcess `
    -RunnerPath $DshRunner `
    -Arguments @("-Action", "migrate", "-Transport", "url", "-DatabaseUrl", $DatabaseUrl) `
    -ExpectSuccess $false `
    -ExpectedFailurePattern "GOVERNED_MIGRATION_LEDGER_CONFLICT|MIGRATION_CHECKSUM_MISMATCH" | Out-Null
} finally {
  $escapedChecksum = ConvertTo-SqlLiteralValue $originalChecksum
  Invoke-ProbePsql @"
UPDATE schema_migrations
SET checksum_sha256 = '$escapedChecksum'
WHERE service_name = 'dsh' AND migration_id = '$escapedFirstName';
"@ | Out-Null
}
Write-Host "Checksum drift rejection: PASS"

Write-Host "--- Verifying atomic migration rollback and roll-forward ---"
$ProbeService = "dsh-ci-atomicity-probe"
$ProbeServiceSql = ConvertTo-SqlLiteralValue $ProbeService
$ProbeFileName = "ci-atomicity-001.sql"
$ProbeFileNameSql = ConvertTo-SqlLiteralValue $ProbeFileName
$ProbeTable = "dsh_ci_atomicity_probe_table"
$TemporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) "bthwani-dsh-atomicity-$([guid]::NewGuid().ToString('N'))"
$ProbePath = Join-Path $TemporaryRoot $ProbeFileName
New-Item -ItemType Directory -Path $TemporaryRoot -Force | Out-Null

try {
  Invoke-ProbePsql @"
DROP TABLE IF EXISTS $ProbeTable;
DELETE FROM schema_migrations WHERE service_name = '$ProbeServiceSql';
"@ | Out-Null

  @"
CREATE TABLE $ProbeTable (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL
);
INSERT INTO $ProbeTable (id, payload) VALUES (1, 'must-rollback');
SELECT 1 / 0;
"@ | Set-Content -LiteralPath $ProbePath -Encoding utf8NoBOM
  Write-ProbeManifest -Directory $TemporaryRoot -ServiceName $ProbeService -MigrationFile (Get-Item -LiteralPath $ProbePath)

  Invoke-RunnerProcess `
    -RunnerPath $ServiceRunner `
    -Arguments @("-ServiceKey", $ProbeService, "-MigrationDirectory", $TemporaryRoot, "-DatabaseUrl", $DatabaseUrl) `
    -ExpectSuccess $false `
    -ExpectedFailurePattern "division by zero|MIGRATION_EXECUTION_FAILED|Governed migration execution failed" | Out-Null

  $tableExistsAfterFailure = Invoke-ProbePsql "SELECT CASE WHEN to_regclass('public.$ProbeTable') IS NULL THEN '0' ELSE '1' END;"
  $ledgerRowsAfterFailure = Invoke-ProbePsql @"
SELECT count(*)
FROM schema_migrations
WHERE service_name = '$ProbeServiceSql' AND migration_id = '$ProbeFileNameSql';
"@
  if ($tableExistsAfterFailure -ne "0") {
    throw "Atomic rollback failed: $ProbeTable still exists."
  }
  if ($ledgerRowsAfterFailure -ne "0") {
    throw "Atomic rollback failed: the failed probe was recorded in schema_migrations."
  }

  @"
CREATE TABLE $ProbeTable (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL
);
INSERT INTO $ProbeTable (id, payload) VALUES (1, 'recovered');
"@ | Set-Content -LiteralPath $ProbePath -Encoding utf8NoBOM
  Write-ProbeManifest -Directory $TemporaryRoot -ServiceName $ProbeService -MigrationFile (Get-Item -LiteralPath $ProbePath)

  Invoke-RunnerProcess `
    -RunnerPath $ServiceRunner `
    -Arguments @("-ServiceKey", $ProbeService, "-MigrationDirectory", $TemporaryRoot, "-DatabaseUrl", $DatabaseUrl) `
    -ExpectSuccess $true | Out-Null

  $recoveredData = Invoke-ProbePsql "SELECT count(*) FROM $ProbeTable WHERE id = 1 AND payload = 'recovered';"
  $recoveredLedger = Invoke-ProbePsql @"
SELECT count(*)
FROM schema_migrations
WHERE service_name = '$ProbeServiceSql'
  AND migration_id = '$ProbeFileNameSql'
  AND success
  AND NOT dirty;
"@
  if ($recoveredData -ne "1" -or $recoveredLedger -ne "1") {
    throw "Roll-forward verification failed for the governed atomicity probe."
  }
} finally {
  Remove-Item -LiteralPath $TemporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
  Invoke-ProbePsql @"
DROP TABLE IF EXISTS $ProbeTable;
DELETE FROM schema_migrations WHERE service_name = '$ProbeServiceSql';
"@ | Out-Null
}
Write-Host "Atomic migration rollback and roll-forward: PASS"

Invoke-RunnerProcess `
  -RunnerPath $DshRunner `
  -Arguments @("-Action", "migrate", "-Transport", "url", "-DatabaseUrl", $DatabaseUrl) `
  -ExpectSuccess $true | Out-Null
Write-Host "Canonical migration runner verification: PASS"
