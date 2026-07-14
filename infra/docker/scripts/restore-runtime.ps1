#!/usr/bin/env pwsh
# restore-runtime.ps1
# ─────────────────────────────────────────────────────────────────────────────
# Restores the database cluster (psql restore) and MinIO volume data.
# Usage: .\infra\docker\scripts\restore-runtime.ps1 -BackupDir <path> [-EnvFile <env-path>]
# ─────────────────────────────────────────────────────────────────────────────

param(
  [Parameter(Mandatory = $true)]
  [string]$BackupDir,
  [string]$EnvFile = ""
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))

if (-not (Test-Path -LiteralPath $BackupDir)) {
  throw "Backup directory does not exist: $BackupDir"
}

$DbBackupFile = Join-Path $BackupDir "database-cluster.sql"
$MinioBackupFile = Join-Path $BackupDir "minio-volume.tar.gz"

if (-not (Test-Path -LiteralPath $DbBackupFile)) {
  throw "Database dump not found in backup: $DbBackupFile"
}

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

# Verify postgres is running
$PostgresRunning = docker ps --filter "name=$PostgresContainer" --filter "status=running" -q
if (-not $PostgresRunning) {
  throw "Postgres container '$PostgresContainer' is not running. Stack must be UP."
}

# ── 2. Drop existing user databases to avoid conflicts ────────────────────────
Write-Host "Cleaning up existing user databases..."

# List of databases we expect to manage
$DatabasesToDrop = @(
  "identity_runtime", "identity_prod",
  "dsh_runtime", "dsh_prod", "dsh_local",
  "wlt_runtime", "wlt_prod",
  "workforce_runtime", "workforce_prod",
  "providers_runtime", "providers_prod"
)

$EnvVars = @()
if ($PostgresPassword) {
  $EnvVars += "-e"
  $EnvVars += "PGPASSWORD=$PostgresPassword"
}

# Run drop DB queries
foreach ($db in $DatabasesToDrop) {
  Write-Host "Dropping database if exists: $db"
  # Terminate active connections first
  $termSql = "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$db' AND pid <> pg_backend_pid();"
  docker exec @EnvVars $PostgresContainer psql -U $PostgresUser -d postgres -c "$termSql" | Out-Null
  
  $dropSql = "DROP DATABASE IF EXISTS $db;"
  docker exec @EnvVars $PostgresContainer psql -U $PostgresUser -d postgres -c "$dropSql" | Out-Null
}

# ── 3. Database Restore ────────────────────────────────────────────────────────
Write-Host "Restoring Database Cluster..."

# We execute the cluster-wide SQL backup file
# Using exec -T allows piping the SQL content directly
Get-Content -LiteralPath $DbBackupFile -Raw | docker exec -i @EnvVars $PostgresContainer psql -U $PostgresUser -d postgres
if ($LASTEXITCODE -ne 0) {
  throw "Database restore failed."
}
Write-Host "Database restore: PASS"

# ── 4. MinIO Volume Restore ────────────────────────────────────────────────────
if (Test-Path -LiteralPath $MinioBackupFile) {
  Write-Host "Restoring MinIO Volume..."
  
  $MinioVolumeName = "bthwani-minio-runtime-data"
  $ProjectName = [System.Environment]::GetEnvironmentVariable("COMPOSE_PROJECT_NAME")
  if ($ProjectName) {
    $MinioVolumeName = "${ProjectName}_bthwani-minio-runtime-data"
  }

  # Verify volume exists
  $VolumeExists = docker volume ls --filter "name=$MinioVolumeName" -q
  if (-not $VolumeExists) {
    $MinioVolumeName = "bthwani-minio-runtime-data"
    $VolumeExists = docker volume ls --filter "name=$MinioVolumeName" -q
  }

  if (-not $VolumeExists) {
    Write-Warning "MinIO volume not found. Skipping restore."
  } else {
    # Clean the volume first
    Write-Host "Cleaning MinIO Volume..."
    docker run --rm -v "${MinioVolumeName}:/volume-data" alpine sh -c "rm -rf /volume-data/*" | Out-Null
    
    # Restore MinIO data from the tarball
    $BackupDirResolved = (Resolve-Path $BackupDir).Path
    docker run --rm -v "${MinioVolumeName}:/volume-data" -v "${BackupDirResolved}:/backup-src" alpine `
      tar -xzf /backup-src/minio-volume.tar.gz -C /volume-data
    if ($LASTEXITCODE -ne 0) {
      throw "MinIO restore failed."
    }
    Write-Host "MinIO restore: PASS"
  }
} else {
  Write-Host "No MinIO backup file found. Skipping MinIO restore."
}

Write-Host "`nRestore completed successfully."
