#!/usr/bin/env pwsh
[CmdletBinding()]
param(
  [string]$EnvFile = "",
  [string]$BackupDir = "",
  [switch]$RequireMinio
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
Set-Location -LiteralPath $RepoRoot

function Resolve-RuntimeEnvFile {
  param([string]$Requested)
  if (-not [string]::IsNullOrWhiteSpace($Requested)) { return $Requested }
  foreach ($Candidate in @(
    "infra/docker/env/runtime.local-production.env",
    "infra/docker/env/runtime.env",
    "infra/docker/env/runtime.env.example"
  )) {
    if (Test-Path -LiteralPath $Candidate) { return $Candidate }
  }
  throw "No runtime environment file exists."
}

function Import-RuntimeEnv {
  param([string]$Path)
  Get-Content -LiteralPath $Path | ForEach-Object {
    $Line = $_.Trim()
    if ($Line -and -not $Line.StartsWith("#") -and $Line.Contains("=")) {
      $Parts = $Line.Split("=", 2)
      $Key = $Parts[0].Trim()
      $Value = $Parts[1].Trim()
      if ($Value.StartsWith('"') -and $Value.EndsWith('"')) { $Value = $Value.Substring(1, $Value.Length - 2) }
      elseif ($Value.StartsWith("'") -and $Value.EndsWith("'")) { $Value = $Value.Substring(1, $Value.Length - 2) }
      [Environment]::SetEnvironmentVariable($Key, $Value)
    }
  }
}

function Get-EnvOrDefault {
  param([string]$Name, [string]$Default)
  $Value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($Value)) { return $Default }
  return $Value
}

function Assert-SafeIdentifier {
  param([string]$Value, [string]$Label)
  if ($Value -notmatch '^[a-z_][a-z0-9_]*$') { throw "$Label contains an unsafe PostgreSQL identifier: $Value" }
}

$EnvFile = Resolve-RuntimeEnvFile -Requested $EnvFile
Import-RuntimeEnv -Path $EnvFile
$PostgresContainer = Get-EnvOrDefault "BTHWANI_POSTGRES_CONTAINER" "bthwani-postgres-runtime"
$PostgresUser = Get-EnvOrDefault "BTHWANI_POSTGRES_USER" "bthwani_runtime"
$PostgresPassword = [Environment]::GetEnvironmentVariable("BTHWANI_POSTGRES_PASSWORD")
$MinioContainer = Get-EnvOrDefault "BTHWANI_MINIO_CONTAINER" "bthwani-minio-runtime"
$ProjectName = Get-EnvOrDefault "COMPOSE_PROJECT_NAME" "bthwani-runtime"
Assert-SafeIdentifier -Value $PostgresUser -Label "PostgreSQL administrator"

$ManagedDatabases = @(
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_IDENTITY_DB_NAME" "identity_runtime"; owner = Get-EnvOrDefault "BTHWANI_IDENTITY_DB_USER" "identity_runtime" },
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_DSH_DB_NAME" "dsh_runtime"; owner = Get-EnvOrDefault "BTHWANI_DSH_DB_USER" "dsh_runtime" },
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_WLT_DB_NAME" "wlt_runtime"; owner = Get-EnvOrDefault "BTHWANI_WLT_DB_USER" "wlt_runtime" },
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_WORKFORCE_DB_NAME" "workforce_runtime"; owner = Get-EnvOrDefault "BTHWANI_WORKFORCE_DB_USER" "workforce_runtime" },
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_PROVIDERS_DB_NAME" "providers_runtime"; owner = Get-EnvOrDefault "BTHWANI_PROVIDERS_DB_USER" "providers_runtime" },
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_PLATFORM_CONTROL_DB_NAME" "platform_control_runtime"; owner = Get-EnvOrDefault "BTHWANI_PLATFORM_CONTROL_DB_USER" "platform_control_runtime" }
)
foreach ($Database in $ManagedDatabases) {
  Assert-SafeIdentifier -Value $Database.name -Label "database name"
  Assert-SafeIdentifier -Value $Database.owner -Label "database owner"
}

$Manifest = $null
if (-not [string]::IsNullOrWhiteSpace($BackupDir)) {
  $BackupDir = (Resolve-Path -LiteralPath $BackupDir).Path
  $ManifestPath = Join-Path $BackupDir "backup-manifest.json"
  if (-not (Test-Path -LiteralPath $ManifestPath)) { throw "Backup manifest is missing: $ManifestPath" }
  $Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
}

$Running = docker ps --filter "name=^/${PostgresContainer}$" --filter "status=running" -q
if ([string]::IsNullOrWhiteSpace(($Running -join ""))) { throw "Postgres container '$PostgresContainer' is not running." }

$DockerEnv = @()
if (-not [string]::IsNullOrWhiteSpace($PostgresPassword)) { $DockerEnv += @("-e", "PGPASSWORD=$PostgresPassword") }
$Results = @()

foreach ($Database in $ManagedDatabases) {
  $Exists = docker exec @DockerEnv $PostgresContainer psql -U $PostgresUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$($Database.name)';"
  if ($LASTEXITCODE -ne 0 -or (($Exists -join "").Trim()) -ne "1") { throw "Database does not exist: $($Database.name)" }

  $Owner = docker exec @DockerEnv $PostgresContainer psql -U $PostgresUser -d postgres -tAc `
    "SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname = '$($Database.name)';"
  if ($LASTEXITCODE -ne 0) { throw "Could not inspect database owner: $($Database.name)" }
  if ((($Owner -join "").Trim()) -ne $Database.owner) {
    throw "Database owner mismatch for $($Database.name): expected $($Database.owner), got $(($Owner -join '').Trim())"
  }

  $TableCountRaw = docker exec @DockerEnv $PostgresContainer psql -U $PostgresUser -d $Database.name -tAc `
    "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';"
  if ($LASTEXITCODE -ne 0) { throw "Could not query database: $($Database.name)" }
  $TableCount = [int](($TableCountRaw -join "").Trim())
  if ($TableCount -le 0) { throw "Database has no public tables: $($Database.name)" }

  if ($Manifest) {
    $Expected = @($Manifest.databases | Where-Object { $_.name -eq $Database.name })
    if ($Expected.Count -ne 1) { throw "Backup manifest does not uniquely describe $($Database.name)" }
    if ($TableCount -ne [int]$Expected[0].publicTableCount) {
      throw "Restored table count mismatch for $($Database.name): expected $($Expected[0].publicTableCount), got $TableCount"
    }
  }

  $Results += [ordered]@{ database = $Database.name; owner = $Database.owner; publicTableCount = $TableCount; state = "PASS" }
  Write-Host "Database integrity PASS: $($Database.name) ($TableCount tables)"
}

$MinioRunning = docker ps --filter "name=^/${MinioContainer}$" --filter "status=running" -q
if ($RequireMinio -and [string]::IsNullOrWhiteSpace(($MinioRunning -join ""))) { throw "MinIO is required but is not running." }
if (-not [string]::IsNullOrWhiteSpace(($MinioRunning -join ""))) {
  $CandidateVolumes = @("${ProjectName}_bthwani-minio-runtime-data", "bthwani-minio-runtime-data")
  $MinioVolume = $null
  foreach ($Candidate in $CandidateVolumes) {
    $Found = docker volume ls --filter "name=^${Candidate}$" -q
    if (-not [string]::IsNullOrWhiteSpace(($Found -join ""))) { $MinioVolume = $Candidate; break }
  }
  if (-not $MinioVolume) { throw "MinIO is running but its volume is missing." }
  $ObjectCountRaw = docker run --rm -v "${MinioVolume}:/volume-data:ro" alpine:3.21 sh -c `
    "find /volume-data -type f | wc -l"
  if ($LASTEXITCODE -ne 0) { throw "Could not inspect MinIO volume." }
  $ObjectCount = [int](($ObjectCountRaw -join "").Trim())
  if ($RequireMinio -and $ObjectCount -le 0) { throw "MinIO volume contains no files." }
  Write-Host "MinIO integrity PASS: $ObjectCount files"
}

[ordered]@{
  state = "PASS"
  verifiedAt = [DateTimeOffset]::UtcNow.ToString("o")
  databases = $Results
  minioRequired = [bool]$RequireMinio
} | ConvertTo-Json -Depth 8
Write-Host "[restore-verify]: INTEGRITY CHECK PASS"
