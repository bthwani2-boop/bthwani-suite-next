#!/usr/bin/env pwsh
# restore-verify-runtime.ps1
# ─────────────────────────────────────────────────────────────────────────────
# Verifies database and storage integrity after a restore.
# Usage: .\infra\docker\scripts\restore-verify-runtime.ps1 [-EnvFile <env-path>]
# ─────────────────────────────────────────────────────────────────────────────

param(
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

# Verify postgres is running
$PostgresRunning = docker ps --filter "name=$PostgresContainer" --filter "status=running" -q
if (-not $PostgresRunning) {
  throw "Postgres container '$PostgresContainer' is not running."
}

# Determine database names based on environment variables
$IdentityDb = [System.Environment]::GetEnvironmentVariable("BTHWANI_IDENTITY_DB_NAME")
if (-not $IdentityDb) { $IdentityDb = "identity_runtime" }

$DshDb = [System.Environment]::GetEnvironmentVariable("BTHWANI_DSH_DB_NAME")
if (-not $DshDb) { $DshDb = "dsh_runtime" }

$WltDb = [System.Environment]::GetEnvironmentVariable("BTHWANI_WLT_DB_NAME")
if (-not $WltDb) { $WltDb = "wlt_runtime" }

$WorkforceDb = [System.Environment]::GetEnvironmentVariable("BTHWANI_WORKFORCE_DB_NAME")
if (-not $WorkforceDb) { $WorkforceDb = "workforce_runtime" }

$DatabasesToVerify = @($IdentityDb, $DshDb, $WltDb, $WorkforceDb)

$EnvVars = @()
if ($PostgresPassword) {
  $EnvVars += "-e"
  $EnvVars += "PGPASSWORD=$PostgresPassword"
}

Write-Host "Verifying database integrity..."
$VerificationPassed = $true

foreach ($db in $DatabasesToVerify) {
  Write-Host "Checking database: $db"
  
  # 1. Check if database exists
  $checkDbSql = "SELECT 1 FROM pg_database WHERE datname = '$db';"
  $dbExists = docker exec @EnvVars $PostgresContainer psql -U $PostgresUser -d postgres -tAc "$checkDbSql"
  if ($dbExists.Trim() -ne "1") {
    Write-Error "Database '$db' does not exist."
    $VerificationPassed = $false
    continue
  }

  # 2. Count tables in the public schema
  $countTablesSql = "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';"
  $tableCount = docker exec @EnvVars $PostgresContainer psql -U $PostgresUser -d $db -tAc "$countTablesSql"

  
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to query database '$db'."
    $VerificationPassed = $false
    continue
  }

  $tc = 0
  [int]::TryParse($tableCount.Trim(), [ref]$tc) | Out-Null
  Write-Host "  -> Public schema tables count: $tc"
  
  if ($tc -eq 0) {
    Write-Error "Database '$db' is empty (has 0 tables)."
    $VerificationPassed = $false
  }
}

# ── 2. Check MinIO integrity ───────────────────────────────────────────────────
Write-Host "`nVerifying MinIO storage integrity..."
$MinioVolumeName = "bthwani-minio-runtime-data"
$ProjectName = [System.Environment]::GetEnvironmentVariable("COMPOSE_PROJECT_NAME")
if ($ProjectName) {
  $MinioVolumeName = "${ProjectName}_bthwani-minio-runtime-data"
}

$VolumeExists = docker volume ls --filter "name=$MinioVolumeName" -q
if (-not $VolumeExists) {
  $MinioVolumeName = "bthwani-minio-runtime-data"
  $VolumeExists = docker volume ls --filter "name=$MinioVolumeName" -q
}

if (-not $VolumeExists) {
  Write-Warning "MinIO volume '$MinioVolumeName' not found or inactive."
} else {
  # Inspect volume files
  $lsMinio = docker run --rm -v "${MinioVolumeName}:/volume-data" alpine ls -la /volume-data
  Write-Host "MinIO root directory contents:"
  Write-Host $lsMinio
}

if ($VerificationPassed) {
  Write-Host "`n[restore-verify]: INTEGRITY CHECK PASS"
} else {
  throw "[restore-verify]: INTEGRITY CHECK FAIL"
}
