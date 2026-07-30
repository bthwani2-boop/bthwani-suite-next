[CmdletBinding()]
param(
  [string]$EnvFile = "infra/docker/env/runtime.env.example",
  [string]$BackupDir = "",
  [switch]$KeepBackup
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location -LiteralPath $RepoRoot

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
function Invoke-AdminSql {
  param([string]$Database, [string]$Sql, [switch]$Scalar)
  $Args = @("exec")
  if ($PostgresPassword) { $Args += @("-e", "PGPASSWORD=$PostgresPassword") }
  $Args += @($PostgresContainer, "psql", "-U", $PostgresUser, "-d", $Database, "-v", "ON_ERROR_STOP=1")
  if ($Scalar) { $Args += @("-tAc", $Sql) } else { $Args += @("-c", $Sql) }
  $Result = & docker @Args
  if ($LASTEXITCODE -ne 0) { throw "SQL failed in $Database" }
  if ($Scalar) { return ($Result -join "").Trim() }
}
function Wait-Status {
  param([string]$Name, [string]$Url, [string]$Expected)
  for ($Attempt = 1; $Attempt -le 40; $Attempt++) {
    try {
      $Response = Invoke-RestMethod -Uri $Url -TimeoutSec 5 -ErrorAction Stop
      if ($Response.status -eq $Expected) { Write-Host "$Name restored: $Expected"; return }
    } catch { }
    Start-Sleep -Seconds 2
  }
  throw "$Name did not recover at $Url"
}
function Start-ContainerIfStopped {
  param([string]$Name)
  $Running = docker ps --filter "name=^/${Name}$" --filter "status=running" -q
  if ([string]::IsNullOrWhiteSpace(($Running -join ""))) {
    docker start $Name | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not start container: $Name" }
  }
}

Import-RuntimeEnv -Path $EnvFile
$PostgresContainer = Get-EnvOrDefault "BTHWANI_POSTGRES_CONTAINER" "bthwani-postgres-runtime"
$PostgresUser = Get-EnvOrDefault "BTHWANI_POSTGRES_USER" "bthwani_runtime"
$PostgresPassword = [Environment]::GetEnvironmentVariable("BTHWANI_POSTGRES_PASSWORD")
$MinioContainer = Get-EnvOrDefault "BTHWANI_MINIO_CONTAINER" "bthwani-minio-runtime"
$WriterContainers = @(
  (Get-EnvOrDefault "BTHWANI_IDENTITY_API_CONTAINER" "bthwani-identity-api-runtime"),
  (Get-EnvOrDefault "BTHWANI_WORKFORCE_API_CONTAINER" "bthwani-workforce-api-runtime"),
  (Get-EnvOrDefault "BTHWANI_DSH_API_CONTAINER" "bthwani-dsh-api-runtime"),
  (Get-EnvOrDefault "BTHWANI_WLT_API_CONTAINER" "bthwani-wlt-api-runtime"),
  (Get-EnvOrDefault "BTHWANI_PROVIDERS_API_CONTAINER" "bthwani-providers-api-runtime"),
  (Get-EnvOrDefault "BTHWANI_PLATFORM_CONTROL_API_CONTAINER" "bthwani-platform-control-api-runtime")
)
$Databases = @(
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_IDENTITY_DB_NAME" "identity_runtime"; owner = Get-EnvOrDefault "BTHWANI_IDENTITY_DB_USER" "identity_runtime" },
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_DSH_DB_NAME" "dsh_runtime"; owner = Get-EnvOrDefault "BTHWANI_DSH_DB_USER" "dsh_runtime" },
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_WLT_DB_NAME" "wlt_runtime"; owner = Get-EnvOrDefault "BTHWANI_WLT_DB_USER" "wlt_runtime" },
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_WORKFORCE_DB_NAME" "workforce_runtime"; owner = Get-EnvOrDefault "BTHWANI_WORKFORCE_DB_USER" "workforce_runtime" },
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_PROVIDERS_DB_NAME" "providers_runtime"; owner = Get-EnvOrDefault "BTHWANI_PROVIDERS_DB_USER" "providers_runtime" },
  [ordered]@{ name = Get-EnvOrDefault "BTHWANI_PLATFORM_CONTROL_DB_NAME" "platform_control_runtime"; owner = Get-EnvOrDefault "BTHWANI_PLATFORM_CONTROL_DB_USER" "platform_control_runtime" }
)

$Probe = "dr_" + [guid]::NewGuid().ToString("N")
$CorruptProbe = "corrupt_" + [guid]::NewGuid().ToString("N")
if ([string]::IsNullOrWhiteSpace($BackupDir)) {
  $Base = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { Join-Path $RepoRoot ".tmp" }
  $BackupDir = Join-Path $Base "lian-dr-$Probe"
}
$BackupDir = (New-Item -ItemType Directory -Path $BackupDir -Force).FullName
$Succeeded = $false
$QuiescedContainers = @()

try {
  foreach ($Database in $Databases) {
    $Sql = @"
CREATE TABLE IF NOT EXISTS runtime_dr_probe (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  probe_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE runtime_dr_probe OWNER TO $($Database.owner);
INSERT INTO runtime_dr_probe (singleton, probe_value)
VALUES (TRUE, '$Probe')
ON CONFLICT (singleton) DO UPDATE SET probe_value = EXCLUDED.probe_value, updated_at = NOW();
"@
    Invoke-AdminSql -Database $Database.name -Sql $Sql
  }

  foreach ($Container in @($WriterContainers + $MinioContainer)) {
    $Running = docker ps --filter "name=^/${Container}$" --filter "status=running" -q
    if ([string]::IsNullOrWhiteSpace(($Running -join ""))) { throw "Required runtime container was not running before DR test: $Container" }
    docker stop $Container | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not quiesce container: $Container" }
    $QuiescedContainers += $Container
  }

  & pwsh -NoProfile -ExecutionPolicy Bypass -File infra/docker/scripts/backup-runtime.ps1 `
    -BackupDir $BackupDir -EnvFile $EnvFile -ConsistencyMode Quiesced
  if ($LASTEXITCODE -ne 0) { throw "Governed quiesced backup failed." }
  $Manifest = Get-Content -LiteralPath (Join-Path $BackupDir "backup-manifest.json") -Raw | ConvertFrom-Json
  if ($Manifest.schemaVersion -ne 3 -or $Manifest.consistencyMode -ne "Quiesced") { throw "Backup did not attest quiesced schema v3 consistency." }

  foreach ($Database in $Databases) {
    Invoke-AdminSql -Database $Database.name -Sql "UPDATE runtime_dr_probe SET probe_value = '$CorruptProbe', updated_at = NOW();"
    $Changed = Invoke-AdminSql -Database $Database.name -Sql "SELECT probe_value FROM runtime_dr_probe WHERE singleton = TRUE;" -Scalar
    if ($Changed -ne $CorruptProbe) { throw "Could not mutate DR probe in $($Database.name)" }
  }

  & pwsh -NoProfile -ExecutionPolicy Bypass -File infra/docker/scripts/restore-runtime.ps1 `
    -BackupDir $BackupDir -EnvFile $EnvFile -Force -RequireQuiesced
  if ($LASTEXITCODE -ne 0) { throw "Governed restore failed." }

  foreach ($Database in $Databases) {
    $Restored = Invoke-AdminSql -Database $Database.name -Sql "SELECT probe_value FROM runtime_dr_probe WHERE singleton = TRUE;" -Scalar
    if ($Restored -ne $Probe) { throw "DR probe was not restored for $($Database.name): expected $Probe, got $Restored" }
  }

  foreach ($Container in $QuiescedContainers) { Start-ContainerIfStopped -Name $Container }
  & pwsh -NoProfile -ExecutionPolicy Bypass -File infra/docker/scripts/restore-verify-runtime.ps1 -EnvFile $EnvFile -BackupDir $BackupDir -RequireMinio
  if ($LASTEXITCODE -ne 0) { throw "Post-restore integrity verification failed." }

  Wait-Status "identity" "http://127.0.0.1:58082/identity/health" "healthy"
  Wait-Status "workforce" "http://127.0.0.1:58086/workforce/health" "healthy"
  Wait-Status "dsh" "http://127.0.0.1:58080/dsh/health" "healthy"
  Wait-Status "wlt" "http://127.0.0.1:58083/wlt/health" "healthy"
  Wait-Status "platform-control" "http://127.0.0.1:58088/platform/health" "healthy"
  $Providers = Invoke-RestMethod -Uri "http://127.0.0.1:58087/providers/health" -TimeoutSec 10
  if (@($Providers.providers).Count -lt 8) { throw "Providers did not recover its governed health matrix after restore." }

  [ordered]@{
    state = "PASS"; probe = $Probe; consistencyMode = $Manifest.consistencyMode; backupDirectory = $BackupDir
    databasesRestored = @($Databases | ForEach-Object { $_.name })
    servicesRecovered = @("identity", "workforce", "dsh", "wlt", "providers", "platform-control")
    minioRestored = $true
  } | ConvertTo-Json -Depth 8
  Write-Host "Quiesced six-database and MinIO backup/restore round trip: PASS"
  $Succeeded = $true
} finally {
  foreach ($Container in $QuiescedContainers) {
    try { Start-ContainerIfStopped -Name $Container } catch { Write-Warning $_ }
  }
  if ($Succeeded -and -not $KeepBackup -and (Test-Path -LiteralPath $BackupDir)) { Remove-Item -LiteralPath $BackupDir -Recurse -Force }
}
