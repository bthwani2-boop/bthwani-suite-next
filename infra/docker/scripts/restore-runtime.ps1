#!/usr/bin/env pwsh
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "High")]
param(
  [Parameter(Mandatory = $true)][string]$BackupDir,
  [string]$EnvFile = "",
  [switch]$Force,
  [switch]$RequireQuiesced
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
      $Parts = $Line.Split("=", 2); $Key = $Parts[0].Trim(); $Value = $Parts[1].Trim()
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

$ExpectedDatabases = @(
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_IDENTITY_DB_NAME" "identity_runtime"; owner = Get-EnvOrDefault "BTHWANI_IDENTITY_DB_USER" "identity_runtime" },
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_DSH_DB_NAME" "dsh_runtime"; owner = Get-EnvOrDefault "BTHWANI_DSH_DB_USER" "dsh_runtime" },
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_WLT_DB_NAME" "wlt_runtime"; owner = Get-EnvOrDefault "BTHWANI_WLT_DB_USER" "wlt_runtime" },
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_WORKFORCE_DB_NAME" "workforce_runtime"; owner = Get-EnvOrDefault "BTHWANI_WORKFORCE_DB_USER" "workforce_runtime" },
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_PROVIDERS_DB_NAME" "providers_runtime"; owner = Get-EnvOrDefault "BTHWANI_PROVIDERS_DB_USER" "providers_runtime" },
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_PLATFORM_CONTROL_DB_NAME" "platform_control_runtime"; owner = Get-EnvOrDefault "BTHWANI_PLATFORM_CONTROL_DB_USER" "platform_control_runtime" }
)
foreach ($Expected in $ExpectedDatabases) { Assert-SafeIdentifier $Expected.name "database name"; Assert-SafeIdentifier $Expected.owner "database owner" }

$BackupDir = (Resolve-Path -LiteralPath $BackupDir).Path
$ManifestPath = Join-Path $BackupDir "backup-manifest.json"
$ManifestChecksumPath = Join-Path $BackupDir "backup-manifest.sha256"
if (-not (Test-Path -LiteralPath $ManifestPath)) { throw "Governed backup manifest is missing. Legacy cluster SQL backups are rejected." }
if (-not (Test-Path -LiteralPath $ManifestChecksumPath)) { throw "Backup manifest checksum is missing." }
$ExpectedManifestChecksum = ((Get-Content -LiteralPath $ManifestChecksumPath -Raw).Trim().Split()[0]).ToLowerInvariant()
$ActualManifestChecksum = (Get-FileHash -LiteralPath $ManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($ExpectedManifestChecksum -ne $ActualManifestChecksum) { throw "Backup manifest checksum mismatch." }

$Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
if ($Manifest.schemaVersion -ne 3) { throw "Unsupported backup schemaVersion: $($Manifest.schemaVersion)" }
if ($RequireQuiesced -and $Manifest.consistencyMode -ne "Quiesced") { throw "Closure restore requires a Quiesced backup." }
$Databases = @($Manifest.databases)
if ($Databases.Count -ne $ExpectedDatabases.Count) { throw "Backup does not contain all sovereign databases." }
foreach ($Expected in $ExpectedDatabases) {
  $Match = @($Databases | Where-Object { $_.name -eq $Expected.name -and $_.owner -eq $Expected.owner })
  if ($Match.Count -ne 1) { throw "Backup omits or mis-owns sovereign database: $($Expected.name)" }
}
if ((@($Databases | ForEach-Object { $_.name } | Select-Object -Unique)).Count -ne $Databases.Count) { throw "Backup manifest contains duplicate database names." }

foreach ($Database in $Databases) {
  Assert-SafeIdentifier $Database.name "database name"; Assert-SafeIdentifier $Database.owner "database owner"
  $DumpPath = Join-Path $BackupDir $Database.relativePath
  if (-not (Test-Path -LiteralPath $DumpPath)) { throw "Database dump is missing: $DumpPath" }
  $DumpFile = Get-Item -LiteralPath $DumpPath
  if ($DumpFile.Length -ne [int64]$Database.sizeBytes) { throw "Database dump size mismatch: $($Database.name)" }
  $Checksum = (Get-FileHash -LiteralPath $DumpPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($Checksum -ne ("$($Database.sha256)".ToLowerInvariant())) { throw "Database dump checksum mismatch: $($Database.name)" }
}
if ($Manifest.minio.included) {
  $MinioBackupPath = Join-Path $BackupDir $Manifest.minio.relativePath
  if (-not (Test-Path -LiteralPath $MinioBackupPath)) { throw "MinIO backup is missing." }
  $MinioChecksum = (Get-FileHash -LiteralPath $MinioBackupPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($MinioChecksum -ne ("$($Manifest.minio.sha256)".ToLowerInvariant())) { throw "MinIO backup checksum mismatch." }
} elseif ($RequireQuiesced) { throw "Closure restore requires a MinIO backup." }

$Running = docker ps --filter "name=^/${PostgresContainer}$" --filter "status=running" -q
if ([string]::IsNullOrWhiteSpace(($Running -join ""))) { throw "Postgres container '$PostgresContainer' is not running." }
if (-not $Force -and -not $PSCmdlet.ShouldProcess("six sovereign databases and MinIO", "restore from $BackupDir")) { return }

$DockerEnv = @(); if ($PostgresPassword) { $DockerEnv += @("-e", "PGPASSWORD=$PostgresPassword") }
foreach ($Database in $Databases) {
  $RoleExists = docker exec @DockerEnv $PostgresContainer psql -U $PostgresUser -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$($Database.owner)';"
  if ($LASTEXITCODE -ne 0 -or (($RoleExists -join "").Trim()) -ne "1") { throw "Required owner role is missing: $($Database.owner)" }
}

foreach ($Database in $Databases) {
  Write-Host "Restoring database: $($Database.name)"
  $TerminateSql = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$($Database.name)' AND pid <> pg_backend_pid();"
  docker exec @DockerEnv $PostgresContainer psql -U $PostgresUser -d postgres -v ON_ERROR_STOP=1 -c $TerminateSql | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not terminate connections for $($Database.name)" }
  docker exec @DockerEnv $PostgresContainer psql -U $PostgresUser -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $($Database.name);" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not drop $($Database.name)" }
  docker exec @DockerEnv $PostgresContainer psql -U $PostgresUser -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $($Database.name) OWNER $($Database.owner);" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not create $($Database.name)" }

  $DumpPath = (Resolve-Path -LiteralPath (Join-Path $BackupDir $Database.relativePath)).Path
  $ContainerDump = "/tmp/bthwani-restore-$($Database.name).dump"
  docker cp $DumpPath "${PostgresContainer}:${ContainerDump}"
  if ($LASTEXITCODE -ne 0) { throw "Could not copy dump for $($Database.name)" }
  try {
    docker exec @DockerEnv $PostgresContainer pg_restore -U $PostgresUser --role=$($Database.owner) -d $Database.name --no-owner --no-privileges --exit-on-error $ContainerDump
    if ($LASTEXITCODE -ne 0) { throw "pg_restore failed for $($Database.name)" }
  } finally { docker exec $PostgresContainer rm -f $ContainerDump | Out-Null }

  $TableCount = docker exec @DockerEnv $PostgresContainer psql -U $PostgresUser -d $Database.name -tAc "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';"
  if ($LASTEXITCODE -ne 0 -or [int](($TableCount -join "").Trim()) -ne [int]$Database.publicTableCount) { throw "Restored table count differs for $($Database.name)." }
  Write-Host "Database restore PASS: $($Database.name)"
}

if ($Manifest.minio.included) {
  $MinioVolumeName = "$($Manifest.minio.volumeName)"
  if ([string]::IsNullOrWhiteSpace($MinioVolumeName)) { $MinioVolumeName = "${ProjectName}_bthwani-minio-runtime-data" }
  $VolumeExists = docker volume ls --filter "name=^${MinioVolumeName}$" -q
  if ([string]::IsNullOrWhiteSpace(($VolumeExists -join ""))) { throw "Target MinIO volume does not exist: $MinioVolumeName" }
  $MinioWasRunning = -not [string]::IsNullOrWhiteSpace(((docker ps --filter "name=^/${MinioContainer}$" --filter "status=running" -q) -join ""))
  if ($MinioWasRunning) { docker stop $MinioContainer | Out-Null; if ($LASTEXITCODE -ne 0) { throw "Could not stop MinIO." } }
  try {
    docker run --rm -v "${MinioVolumeName}:/volume-data" alpine:3.21 sh -c "rm -rf /volume-data/* /volume-data/.[!.]* /volume-data/..?* 2>/dev/null || true"
    if ($LASTEXITCODE -ne 0) { throw "Could not clear MinIO volume." }
    docker run --rm -v "${MinioVolumeName}:/volume-data" -v "${BackupDir}:/backup-src:ro" alpine:3.21 tar -xzf "/backup-src/$($Manifest.minio.relativePath)" -C /volume-data
    if ($LASTEXITCODE -ne 0) { throw "MinIO restore failed." }
  } finally {
    if ($MinioWasRunning) { docker start $MinioContainer | Out-Null; if ($LASTEXITCODE -ne 0) { throw "Could not restart MinIO." } }
  }
  Write-Host "MinIO restore PASS"
}
Write-Host "Governed runtime restore completed successfully."
