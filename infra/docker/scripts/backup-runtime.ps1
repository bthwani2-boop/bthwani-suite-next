#!/usr/bin/env pwsh
[CmdletBinding()]
param(
  [string]$BackupDir = "",
  [string]$EnvFile = "",
  [ValidateSet("HotPerDatabase", "Quiesced")]
  [string]$ConsistencyMode = "HotPerDatabase"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
Set-Location -LiteralPath $RepoRoot

function Resolve-RuntimeEnvFile {
  param([string]$Requested)
  if (-not [string]::IsNullOrWhiteSpace($Requested)) { return $Requested }
  foreach ($Candidate in @("infra/docker/env/runtime.local-production.env", "infra/docker/env/runtime.env", "infra/docker/env/runtime.env.example")) {
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
$ProjectName = Get-EnvOrDefault "COMPOSE_PROJECT_NAME" "bthwani-runtime"

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
Assert-SafeIdentifier -Value $PostgresUser -Label "PostgreSQL administrator"

if ($ConsistencyMode -eq "Quiesced") {
  $WriterContainers = @(
    (Get-EnvOrDefault "BTHWANI_IDENTITY_API_CONTAINER" "bthwani-identity-api-runtime"),
    (Get-EnvOrDefault "BTHWANI_WORKFORCE_API_CONTAINER" "bthwani-workforce-api-runtime"),
    (Get-EnvOrDefault "BTHWANI_DSH_API_CONTAINER" "bthwani-dsh-api-runtime"),
    (Get-EnvOrDefault "BTHWANI_WLT_API_CONTAINER" "bthwani-wlt-api-runtime"),
    (Get-EnvOrDefault "BTHWANI_PROVIDERS_API_CONTAINER" "bthwani-providers-api-runtime"),
    (Get-EnvOrDefault "BTHWANI_PLATFORM_CONTROL_API_CONTAINER" "bthwani-platform-control-api-runtime")
  )
  $StillRunning = @()
  foreach ($Container in $WriterContainers) {
    $Running = docker ps --filter "name=^/${Container}$" --filter "status=running" -q
    if (-not [string]::IsNullOrWhiteSpace(($Running -join ""))) { $StillRunning += $Container }
  }
  if ($StillRunning.Count -gt 0) { throw "Quiesced backup refused because writer containers are still running: $($StillRunning -join ', ')" }
}

if ([string]::IsNullOrWhiteSpace($BackupDir)) {
  $BackupDir = Join-Path "infra/data-plane/backups" ("backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
}
$BackupDir = (New-Item -ItemType Directory -Path $BackupDir -Force).FullName
$DatabaseDirectory = (New-Item -ItemType Directory -Path (Join-Path $BackupDir "databases") -Force).FullName
$PostgresRunning = docker ps --filter "name=^/${PostgresContainer}$" --filter "status=running" -q
if ([string]::IsNullOrWhiteSpace(($PostgresRunning -join ""))) { throw "Postgres container '$PostgresContainer' is not running." }

$DockerEnv = @()
if (-not [string]::IsNullOrWhiteSpace($PostgresPassword)) { $DockerEnv += @("-e", "PGPASSWORD=$PostgresPassword") }
$Manifest = [ordered]@{
  schemaVersion = 3
  createdAt = [DateTimeOffset]::UtcNow.ToString("o")
  sourceCommitSha = if ($env:GITHUB_SHA) { $env:GITHUB_SHA } else { "LOCAL_UNPINNED" }
  consistencyMode = $ConsistencyMode
  postgresImage = (docker inspect --format '{{.Config.Image}}' $PostgresContainer).Trim()
  databases = @()
  minio = [ordered]@{ included = $false }
}

foreach ($Database in $ManagedDatabases) {
  $Exists = docker exec @DockerEnv $PostgresContainer psql -U $PostgresUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$($Database.name)';"
  if ($LASTEXITCODE -ne 0 -or (($Exists -join "").Trim()) -ne "1") { throw "Managed database is missing: $($Database.name)" }
  $TableCountRaw = docker exec @DockerEnv $PostgresContainer psql -U $PostgresUser -d $Database.name -tAc "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';"
  if ($LASTEXITCODE -ne 0) { throw "Could not inspect database $($Database.name)" }
  $TableCount = [int](($TableCountRaw -join "").Trim())
  if ($TableCount -eq 0) { throw "Managed database $($Database.name) has zero public tables; refusing incomplete backup." }

  $ContainerDump = "/tmp/bthwani-$($Database.name).dump"
  $HostDump = Join-Path $DatabaseDirectory "$($Database.name).dump"
  docker exec @DockerEnv $PostgresContainer pg_dump -U $PostgresUser -d $Database.name -Fc --no-owner --no-privileges -f $ContainerDump
  if ($LASTEXITCODE -ne 0) { throw "pg_dump failed for $($Database.name)" }
  docker cp "${PostgresContainer}:${ContainerDump}" $HostDump
  if ($LASTEXITCODE -ne 0) { throw "docker cp failed for $($Database.name)" }
  docker exec $PostgresContainer rm -f $ContainerDump | Out-Null

  $File = Get-Item -LiteralPath $HostDump
  if ($File.Length -le 0) { throw "Database dump is empty: $HostDump" }
  $Manifest.databases += [ordered]@{
    name = $Database.name
    owner = $Database.owner
    relativePath = "databases/$($Database.name).dump"
    sha256 = (Get-FileHash -LiteralPath $HostDump -Algorithm SHA256).Hash.ToLowerInvariant()
    sizeBytes = $File.Length
    publicTableCount = $TableCount
  }
  Write-Host "Database backup PASS: $($Database.name) ($($File.Length) bytes, $TableCount tables)"
}

$CandidateVolumes = @("${ProjectName}_bthwani-minio-runtime-data", "bthwani-minio-runtime-data")
$MinioVolumeName = $null
foreach ($Candidate in $CandidateVolumes) {
  $Found = docker volume ls --filter "name=^${Candidate}$" -q
  if (-not [string]::IsNullOrWhiteSpace(($Found -join ""))) { $MinioVolumeName = $Candidate; break }
}
if ($MinioVolumeName) {
  $MinioBackupFile = Join-Path $BackupDir "minio-volume.tar.gz"
  docker run --rm -v "${MinioVolumeName}:/volume-data:ro" -v "${BackupDir}:/backup-dest" alpine:3.21 tar -czf /backup-dest/minio-volume.tar.gz -C /volume-data .
  if ($LASTEXITCODE -ne 0) { throw "MinIO backup failed." }
  $MinioFile = Get-Item -LiteralPath $MinioBackupFile
  $Manifest.minio = [ordered]@{
    included = $true
    relativePath = "minio-volume.tar.gz"
    sha256 = (Get-FileHash -LiteralPath $MinioBackupFile -Algorithm SHA256).Hash.ToLowerInvariant()
    sizeBytes = $MinioFile.Length
    volumeName = $MinioVolumeName
  }
  Write-Host "MinIO backup PASS: $($MinioFile.Length) bytes"
} elseif ($ConsistencyMode -eq "Quiesced") {
  throw "Quiesced backup requires the governed MinIO data volume."
}

$ManifestPath = Join-Path $BackupDir "backup-manifest.json"
$Manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ManifestPath -Encoding utf8
$ManifestChecksum = (Get-FileHash -LiteralPath $ManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath (Join-Path $BackupDir "backup-manifest.sha256") -Value "$ManifestChecksum  backup-manifest.json" -Encoding ascii
Write-Host "Runtime backup completed: $BackupDir"
Write-Output $BackupDir
