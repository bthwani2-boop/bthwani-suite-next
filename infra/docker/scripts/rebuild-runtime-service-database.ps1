[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("identity", "workforce", "dsh", "wlt", "providers", "platform-control")]
  [string]$Service,

  [Parameter(Mandatory = $true)]
  [string]$ComposeFile,

  [Parameter(Mandatory = $true)]
  [string]$EnvFile,

  [Parameter(Mandatory = $true)]
  [string]$Reason,

  [switch]$AllowLocalDevelopmentRebuild
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if (-not $AllowLocalDevelopmentRebuild) {
  throw "Service database rebuild requires the explicit -AllowLocalDevelopmentRebuild switch."
}

$environmentValues = @($env:NODE_ENV, $env:ENVIRONMENT, $env:BTHWANI_ENVIRONMENT) |
  Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
  ForEach-Object { $_.Trim().ToLowerInvariant() }
if ($environmentValues -contains "production") {
  throw "Service database rebuild is forbidden in production."
}
if (-not (Test-Path -LiteralPath $ComposeFile -PathType Leaf)) {
  throw "Compose file not found: $ComposeFile"
}
if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) {
  throw "Runtime env file not found: $EnvFile"
}

$serviceMap = @{
  "identity" = @{ Database = "identity_runtime"; Owner = "identity_runtime"; ApiService = "identity-api"; Extensions = @() }
  "workforce" = @{ Database = "workforce_runtime"; Owner = "workforce_runtime"; ApiService = "workforce-api"; Extensions = @() }
  "dsh" = @{ Database = "dsh_runtime"; Owner = "dsh_runtime"; ApiService = "dsh-api"; Extensions = @("postgis") }
  "wlt" = @{ Database = "wlt_runtime"; Owner = "wlt_runtime"; ApiService = "wlt-api"; Extensions = @() }
  "providers" = @{ Database = "providers_runtime"; Owner = "providers_runtime"; ApiService = "providers-api"; Extensions = @() }
  "platform-control" = @{ Database = "platform_control_runtime"; Owner = "platform_control_runtime"; ApiService = "platform-control-api"; Extensions = @() }
}
$config = $serviceMap[$Service]
$databaseName = [string]$config.Database
$databaseOwner = [string]$config.Owner
$apiService = [string]$config.ApiService

foreach ($identifier in @($databaseName, $databaseOwner)) {
  if ($identifier -notmatch '^[a-z][a-z0-9_]*$') {
    throw "Unsafe governed database identifier: $identifier"
  }
}

function Get-RuntimeEnvironmentValue {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$DefaultValue
  )

  $processValue = [System.Environment]::GetEnvironmentVariable($Name, "Process")
  if (-not [string]::IsNullOrWhiteSpace($processValue)) {
    return $processValue.Trim()
  }

  foreach ($rawLine in Get-Content -LiteralPath $EnvFile) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { continue }
    $parts = $line.Split("=", 2)
    if ($parts[0].Trim() -ne $Name) { continue }
    $value = $parts[1].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    if (-not [string]::IsNullOrWhiteSpace($value)) { return $value }
  }
  return $DefaultValue
}

function Invoke-ComposeCommand {
  param([Parameter(Mandatory = $true)][string[]]$CommandArguments)

  & docker compose --env-file $EnvFile -f $ComposeFile @CommandArguments
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose failed: $($CommandArguments -join ' ') (exit $LASTEXITCODE)"
  }
}

function Invoke-AdminPsql {
  param(
    [Parameter(Mandatory = $true)][string]$Database,
    [Parameter(Mandatory = $true)][string]$Sql
  )

  $adminUser = Get-RuntimeEnvironmentValue -Name "BTHWANI_POSTGRES_USER" -DefaultValue "bthwani_runtime"
  $arguments = @(
    "compose", "--env-file", $EnvFile, "-f", $ComposeFile,
    "exec", "-T", "postgres", "psql",
    "-U", $adminUser, "-d", $Database,
    "-X", "-v", "ON_ERROR_STOP=1"
  )
  $output = @($Sql | & docker @arguments 2>&1)
  $exitCode = $LASTEXITCODE
  foreach ($line in $output) { Write-Host ([string]$line) }
  if ($exitCode -ne 0) {
    throw "Runtime administrator psql failed for '$Database' with exit code $exitCode."
  }
}

Write-Warning "Rebuilding governed local-development database for service '$Service'. Reason: $Reason"

$runningServices = @(
  & docker compose --env-file $EnvFile -f $ComposeFile ps --services --status running 2>$null |
    ForEach-Object { ([string]$_).Trim() } |
    Where-Object { $_ }
)
if ($LASTEXITCODE -ne 0) {
  throw "Unable to determine running compose services."
}
$apiServiceWasStopped = $false
if ($runningServices -contains $apiService) {
  Write-Host "Stopping $apiService before rebuilding $databaseName..."
  Invoke-ComposeCommand -CommandArguments @("stop", $apiService)
  $apiServiceWasStopped = $true
}

$recreateSql = @"
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$databaseName'
  AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS "$databaseName";
CREATE DATABASE "$databaseName" OWNER "$databaseOwner" TEMPLATE template0 ENCODING 'UTF8';
"@

try {
  Invoke-AdminPsql -Database "postgres" -Sql $recreateSql

  foreach ($extension in @($config.Extensions)) {
    if ([string]$extension -notmatch '^[a-z][a-z0-9_]*$') {
      throw "Unsafe governed extension identifier: $extension"
    }
    Invoke-AdminPsql -Database $databaseName -Sql "CREATE EXTENSION IF NOT EXISTS `"$extension`";"
  }
} finally {
  # A service this script stopped must never be left down, including when the
  # rebuild itself fails. Leaving it stopped is how a governed ledger conflict
  # turned into a runtime whose API never came back and whose start-only local
  # bootstrap therefore never ran again.
  #
  # A restart failure must not mask the rebuild failure that caused it, so it is
  # reported as a warning and the original error keeps propagating.
  if ($apiServiceWasStopped) {
    Write-Host "Restarting $apiService after rebuilding $databaseName..."
    try {
      Invoke-ComposeCommand -CommandArguments @("up", "-d", $apiService)
    } catch {
      Write-Warning "Could not restart '$apiService' after the database rebuild: $($_.Exception.Message)"
    }
  }
}

Write-Host "Governed local-development database rebuild: PASS service=$Service database=$databaseName"
