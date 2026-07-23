<#
.SYNOPSIS
  Canonical DSH database runner for local Docker and CI PostgreSQL.

.DESCRIPTION
  Owns DSH migration, local seed, and schema-test execution. Every migration
  and seed file is applied atomically. Migration history is immutable and
  protected by SHA-256 checksums. Local seeds are explicitly opt-in and are
  audited separately from schema migrations.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("migrate", "seed", "test")]
  [string]$Action,

  [ValidateSet("auto", "url", "docker")]
  [string]$Transport = "auto",

  [string]$DatabaseUrl = $env:DATABASE_URL,

  [ValidateSet("schema", "seed", "all")]
  [string]$TestSuite = "schema",

  [switch]$AllowLocalSeeds,

  [string]$ComposeFile = "infra/docker/compose.runtime.yml",

  [string]$EnvFile = "infra/docker/env/runtime.env.example"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "../../../..")).Path
Set-Location -LiteralPath $RepoRoot

$MigrationDir = Join-Path $RepoRoot "services/dsh/database/migrations"
$SeedDir = Join-Path $RepoRoot "services/dsh/database/seeds/local"
$TestRoot = Join-Path $RepoRoot "services/dsh/database/tests"
$ComposeFilePath = if ([System.IO.Path]::IsPathRooted($ComposeFile)) { $ComposeFile } else { Join-Path $RepoRoot $ComposeFile }
$EnvFilePath = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $RepoRoot $EnvFile }

if ($Transport -eq "auto") {
  $Transport = if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) { "docker" } else { "url" }
}

if ($Transport -eq "url") {
  if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
    throw "DatabaseUrl is required when Transport=url."
  }
  if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw "psql is required when Transport=url."
  }
}

if ($Transport -eq "docker") {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "docker is required when Transport=docker."
  }
  if (-not (Test-Path -LiteralPath $ComposeFilePath)) {
    throw "Compose file not found: $ComposeFilePath"
  }
  if (-not (Test-Path -LiteralPath $EnvFilePath)) {
    throw "Runtime env file not found: $EnvFilePath"
  }
}

function ConvertTo-SqlLiteral {
  param([Parameter(Mandatory = $true)][string]$Value)
  return $Value.Replace("'", "''")
}

function Invoke-DshPsql {
  param(
    [Parameter(Mandatory = $true)][string]$Sql,
    [switch]$TuplesOnly,
    [switch]$SingleTransaction
  )

  if ($Transport -eq "url") {
    $arguments = @($DatabaseUrl, "-X", "-q", "-v", "ON_ERROR_STOP=1")
    if ($TuplesOnly) { $arguments += "-tA" }
    if ($SingleTransaction) { $arguments += "--single-transaction" }
    $output = $Sql | & psql @arguments
  } else {
    $arguments = @(
      "compose", "--env-file", $EnvFilePath, "-f", $ComposeFilePath,
      "exec", "-T", "postgres", "psql",
      "-U", "dsh_runtime", "-d", "dsh_runtime",
      "-X", "-q", "-v", "ON_ERROR_STOP=1"
    )
    if ($TuplesOnly) { $arguments += "-tA" }
    if ($SingleTransaction) { $arguments += "--single-transaction" }
    $output = $Sql | & docker @arguments
  }

  if ($LASTEXITCODE -ne 0) {
    throw "DSH psql command failed using transport '$Transport' (exit $LASTEXITCODE)."
  }

  return (($output | ForEach-Object { "$_" }) -join "`n").Trim()
}

function Get-OrderedSqlFiles {
  param(
    [Parameter(Mandatory = $true)][string]$Directory,
    [Parameter(Mandatory = $true)][string]$Description
  )

  if (-not (Test-Path -LiteralPath $Directory)) {
    throw "$Description directory not found: $Directory"
  }

  $files = @(Get-ChildItem -LiteralPath $Directory -File -Filter "*.sql" | Sort-Object Name)
  if ($files.Count -eq 0) {
    throw "No $Description SQL files found in $Directory"
  }

  $duplicates = $files |
    Group-Object { $_.Name.ToLowerInvariant() } |
    Where-Object Count -gt 1
  if ($duplicates) {
    throw "Duplicate $Description filenames detected: $($duplicates.Name -join ', ')"
  }

  return $files
}

function Initialize-DshDatabaseLedgers {
  Invoke-DshPsql -Sql @"
CREATE TABLE IF NOT EXISTS runtime_schema_migrations (
  migration_name TEXT        PRIMARY KEY,
  checksum       TEXT        NOT NULL,
  applied_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS runtime_seed_runs (
  seed_name   TEXT        PRIMARY KEY,
  checksum    TEXT        NOT NULL,
  run_count   BIGINT      NOT NULL DEFAULT 1 CHECK (run_count > 0),
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"@ | Out-Null
}

function Invoke-DshMigrations {
  $files = Get-OrderedSqlFiles -Directory $MigrationDir -Description "migration"
  Initialize-DshDatabaseLedgers

  Write-Host "`n--- Applying canonical DSH migrations ($Transport) ---"
  foreach ($file in $files) {
    $checksum = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    $nameSql = ConvertTo-SqlLiteral $file.Name
    $recorded = Invoke-DshPsql -TuplesOnly -Sql "SELECT checksum FROM runtime_schema_migrations WHERE migration_name = '$nameSql';"

    if ($recorded -eq $checksum) {
      Write-Host "  Skipping (already applied): $($file.Name)"
      continue
    }
    if (-not [string]::IsNullOrWhiteSpace($recorded)) {
      throw "Migration checksum mismatch for $($file.Name): recorded=$recorded current=$checksum. Applied migrations are immutable; add a new migration."
    }

    $migrationSql = Get-Content -Raw -LiteralPath $file.FullName
    if ($migrationSql -match '(?im)^\s*CREATE\s+(UNIQUE\s+)?INDEX\s+CONCURRENTLY\b') {
      throw "Migration $($file.Name) uses CREATE INDEX CONCURRENTLY, which is incompatible with the required atomic transaction. Use a separately governed online migration procedure."
    }

    $payload = @"
$migrationSql

INSERT INTO runtime_schema_migrations (migration_name, checksum)
VALUES ('$nameSql', '$checksum');
"@

    Write-Host "  Applying atomically: $($file.Name)"
    Invoke-DshPsql -Sql $payload -SingleTransaction | Out-Null

    $verified = Invoke-DshPsql -TuplesOnly -Sql "SELECT checksum FROM runtime_schema_migrations WHERE migration_name = '$nameSql';"
    if ($verified -ne $checksum) {
      throw "Migration ledger verification failed for $($file.Name)."
    }
    Write-Host "  $($file.Name): PASS"
  }

  Write-Host "DSH migrations: PASS"
}

function Assert-LocalSeedEnvironment {
  if (-not $AllowLocalSeeds) {
    throw "Local DSH seeds are opt-in. Re-run with -AllowLocalSeeds only for local development or isolated CI databases."
  }

  $environmentName = @($env:BTHWANI_ENVIRONMENT, $env:APP_ENV, $env:NODE_ENV) |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    Select-Object -First 1

  if ($environmentName) {
    $allowed = @("local", "development", "dev", "test", "ci")
    if ($allowed -notcontains $environmentName.ToLowerInvariant()) {
      throw "Local DSH seeds are forbidden in environment '$environmentName'. Allowed: $($allowed -join ', ')."
    }
  }
}

function Invoke-DshLocalSeeds {
  Assert-LocalSeedEnvironment
  $files = Get-OrderedSqlFiles -Directory $SeedDir -Description "local seed"
  Initialize-DshDatabaseLedgers

  Write-Host "`n--- Applying local-only DSH seeds atomically ($Transport) ---"
  foreach ($file in $files) {
    $checksum = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    $nameSql = ConvertTo-SqlLiteral $file.Name
    $previous = Invoke-DshPsql -TuplesOnly -Sql "SELECT checksum FROM runtime_seed_runs WHERE seed_name = '$nameSql';"
    if ($previous -and $previous -ne $checksum) {
      Write-Warning "Local seed content changed since its previous run: $($file.Name). This is permitted for local fixtures and recorded in runtime_seed_runs."
    }

    $seedSql = Get-Content -Raw -LiteralPath $file.FullName
    $payload = @"
$seedSql

INSERT INTO runtime_seed_runs (seed_name, checksum, run_count, applied_at)
VALUES ('$nameSql', '$checksum', 1, NOW())
ON CONFLICT (seed_name) DO UPDATE SET
  checksum = EXCLUDED.checksum,
  run_count = runtime_seed_runs.run_count + 1,
  applied_at = NOW();
"@

    Write-Host "  Seeding atomically: $($file.Name)"
    Invoke-DshPsql -Sql $payload -SingleTransaction | Out-Null
    Write-Host "  $($file.Name): PASS"
  }

  $ledgerCount = [int](Invoke-DshPsql -TuplesOnly -Sql "SELECT COUNT(*) FROM runtime_seed_runs;")
  if ($ledgerCount -lt $files.Count) {
    throw "Seed ledger is incomplete: expected at least $($files.Count), recorded $ledgerCount."
  }

  Write-Host "DSH local seeds: PASS"
}

function Invoke-DshDatabaseTests {
  $directories = switch ($TestSuite) {
    "schema" { @(Join-Path $TestRoot "schema") }
    "seed" { @(Join-Path $TestRoot "seed") }
    "all" { @(Join-Path $TestRoot "schema"), @(Join-Path $TestRoot "seed") }
  }

  Write-Host "`n--- Running DSH database tests: $TestSuite ($Transport) ---"
  foreach ($directory in $directories) {
    $suiteName = Split-Path -Leaf $directory
    $files = Get-OrderedSqlFiles -Directory $directory -Description "$suiteName test"
    foreach ($file in $files) {
      Write-Host "  Testing: $suiteName/$($file.Name)"
      $sql = Get-Content -Raw -LiteralPath $file.FullName
      Invoke-DshPsql -Sql $sql -SingleTransaction | Out-Null
      Write-Host "  $suiteName/$($file.Name): PASS"
    }
  }

  Write-Host "DSH database tests ($TestSuite): PASS"
}

switch ($Action) {
  "migrate" { Invoke-DshMigrations }
  "seed" { Invoke-DshLocalSeeds }
  "test" { Invoke-DshDatabaseTests }
}
