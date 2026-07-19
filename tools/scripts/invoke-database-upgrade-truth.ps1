[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9-]+$')][string]$ServiceName,
  [Parameter(Mandatory = $true)][string]$MigrationDirectory,
  [Parameter(Mandatory = $true)][string]$DatabaseUrl,
  [string]$TestsDirectory = "",
  [string]$SourceCommitSha = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location -LiteralPath $RepoRoot

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "psql is required for database upgrade truth."
}

$migrationPath = (Resolve-Path -LiteralPath $MigrationDirectory).Path
$migrationFiles = @(Get-ChildItem -LiteralPath $migrationPath -Filter "*.sql" -File | Sort-Object Name)
if ($migrationFiles.Count -eq 0) {
  throw "No migrations found for '$ServiceName' in '$migrationPath'."
}

if ([string]::IsNullOrWhiteSpace($SourceCommitSha)) {
  if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_SHA)) {
    $SourceCommitSha = $env:GITHUB_SHA
  } else {
    $SourceCommitSha = (& git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($SourceCommitSha)) {
      throw "Unable to resolve source commit SHA."
    }
  }
}

. (Join-Path $RepoRoot "infra/docker/scripts/schema-migration-runner.ps1")

$executeBatch = {
  param([string]$Sql)
  $Sql | & psql $DatabaseUrl -X -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) {
    throw "Governed migration batch failed for '$ServiceName' with exit code $LASTEXITCODE."
  }
}

$executeStatement = {
  param([string]$Sql)
  $Sql | & psql $DatabaseUrl -X -q -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) {
    throw "Governed migration statement failed for '$ServiceName' with exit code $LASTEXITCODE."
  }
}

function Invoke-ScalarQuery {
  param([Parameter(Mandatory = $true)][string]$Sql)
  $result = & psql $DatabaseUrl -X -qAt -v ON_ERROR_STOP=1 -c $Sql
  if ($LASTEXITCODE -ne 0) {
    throw "Scalar database query failed for '$ServiceName'."
  }
  return (($result -join "`n").Trim())
}

Write-Host "--- $ServiceName clean migration install ---"
Invoke-BthwaniGovernedMigrations `
  -ServiceName $ServiceName `
  -MigrationFiles $migrationFiles `
  -SourceCommitSha $SourceCommitSha `
  -ExecuteBatch $executeBatch `
  -ExecuteStatement $executeStatement

$serviceLiteral = "'" + $ServiceName.Replace("'", "''") + "'"
$firstCount = [int](Invoke-ScalarQuery "SELECT COUNT(*) FROM schema_migrations WHERE service_name = $serviceLiteral AND success AND NOT dirty;")
$firstFingerprint = Invoke-ScalarQuery @"
SELECT md5(COALESCE(string_agg(migration_id || ':' || checksum_sha256 || ':' || source_commit_sha, '|' ORDER BY migration_id), ''))
FROM schema_migrations
WHERE service_name = $serviceLiteral AND success AND NOT dirty;
"@
if ($firstCount -ne $migrationFiles.Count) {
  throw "Ledger coverage mismatch for '$ServiceName': expected $($migrationFiles.Count), recorded $firstCount."
}

Write-Host "--- $ServiceName idempotent runner verification ---"
Invoke-BthwaniGovernedMigrations `
  -ServiceName $ServiceName `
  -MigrationFiles $migrationFiles `
  -SourceCommitSha $SourceCommitSha `
  -ExecuteBatch $executeBatch `
  -ExecuteStatement $executeStatement

$secondCount = [int](Invoke-ScalarQuery "SELECT COUNT(*) FROM schema_migrations WHERE service_name = $serviceLiteral AND success AND NOT dirty;")
$secondFingerprint = Invoke-ScalarQuery @"
SELECT md5(COALESCE(string_agg(migration_id || ':' || checksum_sha256 || ':' || source_commit_sha, '|' ORDER BY migration_id), ''))
FROM schema_migrations
WHERE service_name = $serviceLiteral AND success AND NOT dirty;
"@
$dirtyCount = [int](Invoke-ScalarQuery "SELECT COUNT(*) FROM schema_migrations WHERE service_name = $serviceLiteral AND (dirty OR NOT success);")

if ($secondCount -ne $firstCount -or $secondFingerprint -ne $firstFingerprint) {
  throw "Idempotent runner changed the governed migration ledger for '$ServiceName'."
}
if ($dirtyCount -ne 0) {
  throw "Dirty migration rows remain for '$ServiceName'."
}

if (-not [string]::IsNullOrWhiteSpace($TestsDirectory) -and (Test-Path -LiteralPath $TestsDirectory)) {
  $testFiles = @(Get-ChildItem -LiteralPath $TestsDirectory -Filter "*.sql" -File | Sort-Object Name)
  foreach ($testFile in $testFiles) {
    Write-Host "INVARIANT $($testFile.Name)"
    & psql $DatabaseUrl -X -v ON_ERROR_STOP=1 -f $testFile.FullName
    if ($LASTEXITCODE -ne 0) {
      throw "Database invariant failed for '$ServiceName': $($testFile.Name)."
    }
  }
}

$result = [ordered]@{
  service = $ServiceName
  commitSha = $SourceCommitSha
  migrations = $migrationFiles.Count
  ledgerRows = $secondCount
  dirtyRows = $dirtyCount
  fingerprint = $secondFingerprint
  state = "PASS"
}
$result | ConvertTo-Json -Depth 4
