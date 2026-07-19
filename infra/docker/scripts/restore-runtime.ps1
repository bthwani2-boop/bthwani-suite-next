#!/usr/bin/env pwsh
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "High")]
param(
  [Parameter(Mandatory = $true)]
  [string]$BackupDir,
  [string]$EnvFile = "",
  [switch]$Force
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
  if ($Value -notmatch '^[a-z_][a-z0-9_]*$') {
    throw "$Label contains an unsafe PostgreSQL identifier: $Value"
  }
}

$BackupDir = (Resolve-Path -LiteralPath $BackupDir).Path
$ManifestPath = Join-Path $BackupDir "backup-manifest.json"
$ManifestChecksumPath = Join-Path $BackupDir "backup-manifest.sha256"
if (-not (Test-Path -LiteralPath $ManifestPath)) {
  throw "Governed backup manifest is missing: $ManifestPath. Legacy database-cluster.sql backups are intentionally rejected because they cannot prove complete restoration."
}
if (-not (Test-Path -LiteralPath $ManifestChecksumPath)) {
  throw "Backup manifest checksum is missing: $ManifestChecksumPath"
}

$ExpectedManifestChecksum = ((Get-Content -LiteralPath $ManifestChecksumPath -Raw).Trim().Split()[0]).ToLowerInvariant()
$ActualManifestChecksum = (Get-FileHash -LiteralPath $ManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($ExpectedManifestChecksum -ne $ActualManifestChecksum) {
  throw "Backup manifest checksum mismatch."
}

$Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
if ($Manifest.schemaVersion -ne 2) { throw "Unsupported backup schemaVersion: $($Manifest.schemaVersion)" }
$Databases = @($Manifest.databases)
if ($Databases.Count -ne 6) { throw "Backup must contain exactly six sovereign databases; found $($Databases.Count)." }

$ExpectedDatabaseNames = @(
  "identity_runtime",
  "dsh_runtime",
  "wlt_runtime",
  "workforce_runtime",
  "providers_runtime",
  "platform_control_runtime"
)
$ActualDatabaseNames = @($Databases | ForEach-Object { $_.name })
foreach ($Expected in $ExpectedDatabaseNames) {
  if ($ActualDatabaseNames -notcontains $Expected) { throw "Backup omits sovereign database: $Expected" }
}
if (($ActualDatabaseNames | Select-Object -Unique).Count -ne $Databases.Count) {
  throw "Backup manifest contains duplicate database names."
}

foreach ($Database in $Databases) {
  Assert-SafeIdentifier -Value $Database.name -Label "database name"
  Assert-SafeIdentifier -Value $Database.owner -Label "database owner"
  $DumpPath = Join-Path $BackupDir $Database.relativePath
  if (-not (Test-Path -LiteralPath $DumpPath)) { throw "Database dump is missing: $DumpPath" }
  $DumpFile = Get-Item -LiteralPath $DumpPath
  if ($DumpFile.Length -ne [int64]$Database.sizeBytes) { throw "Database dump size mismatch: $($Database.name)" }
  $Checksum = (Get-FileHash -LiteralPath $DumpPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($Checksum -ne "$($Database.sha256)".ToLowerInvariant()) { throw "Database dump checksum mismatch: $($Database.name)" }
}

if ($Manifest.minio.included) {
  $MinioBackupPath = Join-Path $BackupDir $Manifest.minio.relativePath
  if (-not (Test-Path -LiteralPath $MinioBackupPath)) { throw "MinIO backup is missing: $MinioBackupPath" }
  $MinioChecksum = (Get-FileHash -LiteralPath $MinioBackupPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($MinioChecksum -ne "$($Manifest.minio.sha256)".ToLowerInvariant()) { throw "MinIO backup checksum mismatch." }
}

$EnvFile = Resolve-RuntimeEnvFile -Requested $EnvFile
Import-RuntimeEnv -Path $EnvFile
$PostgresContainer = Get-EnvOrDefault "BTHWANI_POSTGRES_CONTAINER" "bthwani-postgres-runtime"
$PostgresUser = Get-EnvOrDefault "BTHWANI_POSTGRES_USER" "bthwani_runtime"
$PostgresPassword = [Environment]::GetEnvironmentVariable("BTHWANI_POSTGRES_PASSWORD")
$ProjectName = Get-EnvOrDefault "COMPOSE_PROJECT_NAME" "bthwani-runtime"
Assert-SafeIdentifier -Value $PostgresUser -Label "PostgreSQL administrator"

$Running = docker ps --filter "name=^/${PostgresContainer}$" --filter "status=running" -q
if ([string]::IsNullOrWhiteSpace(($Running -join ""))) {
  throw "Postgres container '$PostgresContainer' is not running."
}

if (-not $Force -and -not $PSCmdlet.ShouldProcess("six sovereign runtime databases", "destructive restore from $BackupDir")) {
  return
}

$DockerEnv = @()
if (-not [string]::IsNullOrWhiteSpace($PostgresPassword)) {
  $DockerEnv += @("-e", "PGPASSWORD=$PostgresPassword")
}

foreach ($Database in $Databases) {
  $RoleExists = docker exec @DockerEnv $PostgresContainer psql -U $PostgresUser -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$($Database.owner)';"
  if ($LASTEXITCODE -ne 0 -or (($RoleExists -join "").Trim()) -ne "1") {
    throw "Required database owner role is missing: $($Database.owner)"
  }
}

foreach ($Database in $Databases) {
  Write-Host "Restoring database: $($Database.name)"
  $TerminateSql = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$($Database.name)' AND pid <> pg_backend_pid();"
  docker exec @DockerEnv $PostgresContainer psql -U $PostgresUser -d postgres -v ON_ERROR_STOP=1 -c $TerminateSql | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not terminate connections for $($Database.name)" }

  docker exec @DockerEnv $PostgresContainer psql -U $PostgresUser -d postgres -v ON_ERROR_STOP=1 `
    -c "DROP DATABASE IF EXISTS $($Database.name);" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not drop $($Database.name)" }

  docker exec @DockerEnv $PostgresContainer psql -U $PostgresUser -d postgres -v ON_ERROR_STOP=1 `
    -c "CREATE DATABASE $($Database.name) OWNER $($Database.owner);" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not create $($Database.name)" }

  $DumpPath = (Resolve-Path -LiteralPath (Join-Path $BackupDir $Database.relativePath)).Path
  $ContainerDump = "/tmp/bthwani-restore-$($Database.name).dump"
  docker cp $DumpPath "${PostgresContainer}:${ContainerDump}"
  if ($LASTEXITCODE -ne 0) { throw "Could not copy dump for $($Database.name)" }
  try {
    docker exec @DockerEnv $PostgresContainer pg_restore -U $Database.owner -d $Database.name `
      --no-owner --no-privileges --exit-on-error $ContainerDump
    if ($LASTEXITCODE -ne 0) { throw "pg_restore failed for $($Database.name)" }
  } finally {
    docker exec $PostgresContainer rm -f $ContainerDump | Out-Null
  }

  $TableCount = docker exec @DockerEnv $PostgresContainer psql -U $PostgresUser -d $Database.name -tAc `
    "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';"
  if ($LASTEXITCODE -ne 0) { throw "Could not verify restored database $($Database.name)" }
  if ([int](($TableCount -join "").Trim()) -ne [int]$Database.publicTableCount) {
    throw "Restored public table count differs for $($Database.name)."
  }
  Write-Host "Database restore PASS: $($Database.name)"
}

if ($Manifest.minio.included) {
  $MinioVolumeName = "$($Manifest.minio.volumeName)"
  if ([string]::IsNullOrWhiteSpace($MinioVolumeName)) {
    $MinioVolumeName = "${ProjectName}_bthwani-minio-runtime-data"
  }
  $VolumeExists = docker volume ls --filter "name=^${MinioVolumeName}$" -q
  if ([string]::IsNullOrWhiteSpace(($VolumeExists -join ""))) {
    throw "Target MinIO volume does not exist: $MinioVolumeName"
  }

  $BackupDirResolved = $BackupDir
  docker run --rm -v "${MinioVolumeName}:/volume-data" alpine:3.21 sh -c "rm -rf /volume-data/* /volume-data/.[!.]* /volume-data/..?* 2>/dev/null || true"
  if ($LASTEXITCODE -ne 0) { throw "Could not clear MinIO volume." }
  docker run --rm -v "${MinioVolumeName}:/volume-data" -v "${BackupDirResolved}:/backup-src:ro" alpine:3.21 `
    tar -xzf "/backup-src/$($Manifest.minio.relativePath)" -C /volume-data
  if ($LASTEXITCODE -ne 0) { throw "MinIO restore failed." }
  Write-Host "MinIO restore PASS"
}

Write-Host "Governed runtime restore completed successfully."
