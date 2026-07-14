#!/usr/bin/env pwsh
# backup-runtime.ps1
# ─────────────────────────────────────────────────────────────────────────────
# Backs up the running database cluster (pg_dumpall) and MinIO volume data.
# Usage: .\infra\docker\scripts\backup-runtime.ps1 [-BackupDir <path>] [-EnvFile <env-path>]
# ─────────────────────────────────────────────────────────────────────────────

param(
  [string]$BackupDir = "",
  [string]$EnvFile = ""
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))

# ── 1. Resolve Env File and Load Variables ─────────────────────────────────────
if ($EnvFile -eq "") {
  if (Test-Path -LiteralPath "infra\docker\env\runtime.local-production.env") {
    $EnvFile = "infra\docker\env\runtime.local-production.env"
  } elseif (Test-Path -LiteralPath "infra\docker\env\runtime.env") {
    $EnvFile = "infra\docker\env\runtime.env"
  } else {
    $EnvFile = "infra\docker\env\runtime.env.example"
  }
}

Write-Host "Loading env file: $EnvFile"
Get-Content -LiteralPath $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
    $parts = $line.Split("=", 2)
    $key = $parts[0].Trim()
    $val = $parts[1].Trim()
    if ($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length - 2) }
    elseif ($val.StartsWith("'") -and $val.EndsWith("'")) { $val = $val.Substring(1, $val.Length - 2) }
    [System.Environment]::SetEnvironmentVariable($key, $val)
  }
}

# Resolve container names and database credentials
$PostgresContainer = [System.Environment]::GetEnvironmentVariable("BTHWANI_POSTGRES_CONTAINER")
if (-not $PostgresContainer) { $PostgresContainer = "bthwani-postgres-runtime" }

$PostgresUser = [System.Environment]::GetEnvironmentVariable("BTHWANI_POSTGRES_USER")
if (-not $PostgresUser) { $PostgresUser = "bthwani_runtime" }

$PostgresPassword = [System.Environment]::GetEnvironmentVariable("BTHWANI_POSTGRES_PASSWORD")

$MinioContainer = [System.Environment]::GetEnvironmentVariable("BTHWANI_MINIO_CONTAINER")
if (-not $MinioContainer) { $MinioContainer = "bthwani-minio-runtime" }

# ── 2. Create Backup Directory ─────────────────────────────────────────────────
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
if ($BackupDir -eq "") {
  $BackupDir = Join-Path "infra\data-plane\backups" "backup-$Timestamp"
}
$BackupDir = (Resolve-Path (New-Item -ItemType Directory -Path $BackupDir -Force)).Path
Write-Host "Backing up to: $BackupDir"

# ── 3. Database Cluster Backup (pg_dumpall) ────────────────────────────────────
Write-Host "Backing up Database Cluster..."
$DbBackupFile = Join-Path $BackupDir "database-cluster.sql"

# Check if postgres container is running
$PostgresRunning = docker ps --filter "name=$PostgresContainer" --filter "status=running" -q
if (-not $PostgresRunning) {
  throw "Postgres container '$PostgresContainer' is not running. Stack must be UP to perform hot backup."
}

# Run pg_dumpall inside postgres container using the main user
# We pass PGUSER and PGPASSWORD to make it completely non-interactive
$EnvVars = @()
if ($PostgresPassword) {
  $EnvVars += "-e"
  $EnvVars += "PGPASSWORD=$PostgresPassword"
}

docker exec @EnvVars $PostgresContainer pg_dumpall -U $PostgresUser > $DbBackupFile
if ($LASTEXITCODE -ne 0) {
  throw "Database backup failed."
}
Write-Host "Database backup: PASS ($( (Get-Item $DbBackupFile).Length ) bytes)"

# ── 4. MinIO Volume Backup ─────────────────────────────────────────────────────
# We spin up a temporary lightweight alpine container mounting the MinIO volume
# to archive the contents. This is portable and independent of host OS.
Write-Host "Backing up MinIO Volume..."
$MinioBackupFile = Join-Path $BackupDir "minio-volume.tar.gz"

$MinioVolumeName = "bthwani-minio-runtime-data"
# Determine actual volume name in case of prefixing
$ProjectName = [System.Environment]::GetEnvironmentVariable("COMPOSE_PROJECT_NAME")
if ($ProjectName) {
  $MinioVolumeName = "${ProjectName}_bthwani-minio-runtime-data"
}

# Verify volume exists
$VolumeExists = docker volume ls --filter "name=$MinioVolumeName" -q
if (-not $VolumeExists) {
  # Fallback to check default volume if compose project name doesn't match volume name exactly
  $MinioVolumeName = "bthwani-minio-runtime-data"
  $VolumeExists = docker volume ls --filter "name=$MinioVolumeName" -q
}

if (-not $VolumeExists) {
  Write-Warning "MinIO volume '$MinioVolumeName' not found. Skipping media backup."
} else {
  # Zip the volume using docker
  # Use temporary volume mount to host path via stdout redirection or tar creation
  $BackupDirResolved = (Resolve-Path $BackupDir).Path
  docker run --rm -v "${MinioVolumeName}:/volume-data" -v "${BackupDirResolved}:/backup-dest" alpine `
    tar -czf /backup-dest/minio-volume.tar.gz -C /volume-data .
  if ($LASTEXITCODE -ne 0) {
    throw "MinIO backup failed."
  }
  Write-Host "MinIO backup: PASS ($( (Get-Item $MinioBackupFile).Length ) bytes)"
}

Write-Host "`nBackup completed successfully: $BackupDir"
