<#
.SYNOPSIS
  Thin DSH database adapter for governed migration, seed, and assertion tools.

.DESCRIPTION
  This script owns no migration ordering, checksum policy, migration ledger,
  seed discovery, seed transaction, or seed ledger. Both Docker and URL/CI
  transports delegate writes to repository-wide canonical runners. Direct psql
  execution is retained only for isolated database assertion files.
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

  # Runtime-generated actor identifiers used by governed local seed templates.
  # The canonical seed runner validates and substitutes this JSON map.
  [string]$PlaceholderFile = "",

  [string]$ComposeFile = "infra/docker/compose.runtime.yml",
  [string]$EnvFile = "infra/docker/env/runtime.env.example",
  [string]$SourceCommitSha = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "../../../..")).Path
Set-Location -LiteralPath $RepoRoot

$MigrationDir = Join-Path $RepoRoot "services/dsh/database/migrations"
$SeedDir = Join-Path $RepoRoot "services/dsh/database/seeds/local"
$TestRoot = Join-Path $RepoRoot "services/dsh/database/tests"
$ComposeFilePath = if ([System.IO.Path]::IsPathRooted($ComposeFile)) { $ComposeFile } else { Join-Path $RepoRoot $ComposeFile }
$EnvFilePath = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $RepoRoot $EnvFile }
$RuntimeOrchestrator = Join-Path $RepoRoot "infra/docker/scripts/runtime.ps1"
$RuntimeMigrationRunner = Join-Path $RepoRoot "infra/docker/scripts/invoke-runtime-database-migrations.ps1"
$ServiceMigrationRunner = Join-Path $RepoRoot "tools/scripts/invoke-service-migrations.ps1"
$ServiceSeedRunner = Join-Path $RepoRoot "tools/scripts/invoke-service-seeds.ps1"

foreach ($requiredFile in @($RuntimeOrchestrator, $RuntimeMigrationRunner, $ServiceMigrationRunner, $ServiceSeedRunner)) {
  if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
    throw "Required governed database authority not found: $requiredFile"
  }
}

if ($Transport -eq "auto") {
  $Transport = if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) { "docker" } else { "url" }
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

if ($Transport -eq "url") {
  if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
    throw "DatabaseUrl is required when Transport=url."
  }
  if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw "psql is required when Transport=url."
  }
} else {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "docker is required when Transport=docker."
  }
  foreach ($requiredFile in @($ComposeFilePath, $EnvFilePath)) {
    if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
      throw "Required Docker runtime file not found: $requiredFile"
    }
  }
}

function Get-DockerComposeBaseArguments {
  return @("compose", "--env-file", $EnvFilePath, "-f", $ComposeFilePath)
}

function Ensure-DockerDshPostgres {
  & $RuntimeOrchestrator -Action ensure-db -Profiles dsh

  if ($LASTEXITCODE -ne 0) {
    throw "Canonical Docker database lifecycle failed (exit $LASTEXITCODE)."
  }
}

function Invoke-DshTestSql {
  param([Parameter(Mandatory = $true)][string]$Sql)

  if ($Transport -eq "url") {
    $Sql | & psql $DatabaseUrl -X -q -v ON_ERROR_STOP=1 --single-transaction
  } else {
    $arguments = @(Get-DockerComposeBaseArguments) + @(
      "exec", "-T", "postgres", "psql",
      "-U", "dsh_runtime", "-d", "dsh_runtime",
      "-X", "-q", "-v", "ON_ERROR_STOP=1", "--single-transaction"
    )
    $Sql | & docker @arguments
  }
  if ($LASTEXITCODE -ne 0) {
    throw "DSH database assertion failed using transport '$Transport' (exit $LASTEXITCODE)."
  }
}

function Get-TestFiles {
  param([Parameter(Mandatory = $true)][string]$Directory)

  if (-not (Test-Path -LiteralPath $Directory -PathType Container)) {
    throw "Database test directory not found: $Directory"
  }
  $files = @(Get-ChildItem -LiteralPath $Directory -File -Filter "*.sql" | Sort-Object Name)
  if ($files.Count -eq 0) {
    throw "No database tests found in $Directory"
  }
  return $files
}

function Invoke-GovernedDshMigrations {
  if ($Transport -eq "docker") {
    Ensure-DockerDshPostgres
    & $RuntimeMigrationRunner -Service dsh -SourceCommitSha $SourceCommitSha
  } else {
    & $ServiceMigrationRunner `
      -ServiceKey dsh `
      -MigrationDirectory $MigrationDir `
      -DatabaseUrl $DatabaseUrl `
      -SourceCommitSha $SourceCommitSha
  }
  if ($LASTEXITCODE -ne 0) {
    throw "Governed DSH migrations failed (exit $LASTEXITCODE)."
  }
  Write-Host "DSH migrations: PASS ledger=schema_migrations"
}

function Invoke-GovernedDshSeeds {
  if (-not $AllowLocalSeeds) {
    throw "Local DSH seeds require -AllowLocalSeeds."
  }

  if ($Transport -eq "docker") {
    Ensure-DockerDshPostgres
  }
  Invoke-GovernedDshMigrations

  $seedParameters = @{
    ServiceKey = "dsh"
    SeedDirectory = $SeedDir
    Transport = $Transport
    SourceCommitSha = $SourceCommitSha
    AllowLocalSeeds = $true
  }
  if (-not [string]::IsNullOrWhiteSpace($PlaceholderFile)) {
    $seedParameters.PlaceholderFile = $PlaceholderFile
  }
  if ($Transport -eq "url") {
    $seedParameters.DatabaseUrl = $DatabaseUrl
  } else {
    $seedParameters.DockerUser = "dsh_runtime"
    $seedParameters.DockerDatabase = "dsh_runtime"
    $seedParameters.ComposeFile = $ComposeFilePath
    $seedParameters.EnvFile = $EnvFilePath
  }

  & $ServiceSeedRunner @seedParameters
  if ($LASTEXITCODE -ne 0) {
    throw "Governed DSH local seeds failed (exit $LASTEXITCODE)."
  }
  Write-Host "DSH local seeds: PASS ledger=runtime_seed_history authority=invoke-service-seeds.ps1"
}

function Invoke-DshDatabaseTests {
  if ($Transport -eq "docker") {
    Ensure-DockerDshPostgres
  }

  $directories = @()
  if ($TestSuite -in @("schema", "all")) {
    $directories += (Join-Path $TestRoot "schema")
  }
  if ($TestSuite -in @("seed", "all")) {
    $directories += (Join-Path $TestRoot "seed")
  }

  Write-Host "`n--- Running DSH database assertions: $TestSuite ($Transport) ---"
  foreach ($directory in $directories) {
    foreach ($file in Get-TestFiles -Directory $directory) {
      Write-Host "  Testing: $($file.FullName.Substring($TestRoot.Length + 1))"
      Invoke-DshTestSql -Sql (Get-Content -Raw -LiteralPath $file.FullName)
      Write-Host "  $($file.Name): PASS"
    }
  }
  Write-Host "DSH database tests ($TestSuite): PASS"
}

switch ($Action) {
  "migrate" { Invoke-GovernedDshMigrations }
  "seed" { Invoke-GovernedDshSeeds }
  "test" { Invoke-DshDatabaseTests }
}
