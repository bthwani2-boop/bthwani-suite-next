$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
Set-Location -LiteralPath $script:RepoRoot

$script:RuntimeOrchestrator = Join-Path $script:RepoRoot "infra/docker/scripts/runtime.ps1"
$script:PlatformProfiles = "identity,providers,wlt,dsh,platform,financial-simulators,media-storage"
$script:PostgresContainer = "bthwani-postgres-runtime"

if (-not (Test-Path -LiteralPath $script:RuntimeOrchestrator -PathType Leaf)) {
  throw "Canonical runtime authority not found: $script:RuntimeOrchestrator"
}

function Get-ConfiguredRuntimePort {
  param(
    [Parameter(Mandatory = $true)][string]$EnvironmentName,
    [Parameter(Mandatory = $true)][int]$DefaultPort
  )

  $raw = [Environment]::GetEnvironmentVariable($EnvironmentName)
  if ([string]::IsNullOrWhiteSpace($raw)) { return $DefaultPort }
  $port = 0
  if (-not [int]::TryParse($raw, [ref]$port) -or $port -lt 1 -or $port -gt 65535) {
    throw "$EnvironmentName must be a TCP port between 1 and 65535."
  }
  return $port
}

function Invoke-CanonicalPlatformRuntime {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("up", "down", "reset", "status", "logs", "migrate", "smoke")]
    [string]$Action,
    [string]$Service = "",
    [switch]$Force
  )

  $parameters = @{
    Action = $Action
    Profiles = $script:PlatformProfiles
  }
  if (-not [string]::IsNullOrWhiteSpace($Service)) {
    $parameters.Service = $Service
  }
  if ($Force) {
    $parameters.Force = $true
  }

  & $script:RuntimeOrchestrator @parameters
}

function Invoke-PlatformDatabasePsql {
  param(
    [Parameter(Mandatory = $true)][string]$User,
    [Parameter(Mandatory = $true)][string]$Database,
    [Parameter(Mandatory = $true)][string]$Sql
  )

  foreach ($identifier in @($User, $Database)) {
    if ($identifier -notmatch '^[a-z][a-z0-9_]*$') {
      throw "Unsafe platform smoke database identifier: $identifier"
    }
  }

  $output = @(
    & docker exec $script:PostgresContainer `
      psql -U $User -d $Database -X -v ON_ERROR_STOP=1 -tAc $Sql 2>&1
  )
  $exitCode = $LASTEXITCODE

  if ($exitCode -ne 0) {
    throw "Platform database query failed for $Database (exit $exitCode): $($output -join "`n")"
  }

  return (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
}

function Wait-PlatformHttpReady {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [string]$ExpectedStatus = ""
  )

  for ($attempt = 1; $attempt -le 60; $attempt++) {
    try {
      $response = Invoke-RestMethod $Url -TimeoutSec 5 -ErrorAction Stop
      if ([string]::IsNullOrWhiteSpace($ExpectedStatus) -or [string]$response.status -eq $ExpectedStatus) {
        return
      }
    } catch {
    }
    Start-Sleep -Seconds 2
  }

  if ([string]::IsNullOrWhiteSpace($ExpectedStatus)) {
    throw "endpoint did not become ready: $Url"
  }
  throw "endpoint did not report status '$ExpectedStatus': $Url"
}

function Invoke-PlatformMigrations {
  Invoke-CanonicalPlatformRuntime -Action migrate
}

function Start-PlatformP3Runtime {
  Invoke-CanonicalPlatformRuntime -Action up

  $wiremockFinancialPort = Get-ConfiguredRuntimePort -EnvironmentName "BTHWANI_WIREMOCK_FINANCIAL_PORT" -DefaultPort 18090
  $identityApiHostPort = Get-ConfiguredRuntimePort -EnvironmentName "BTHWANI_IDENTITY_API_HOST_PORT" -DefaultPort 18082
  $providersApiHostPort = Get-ConfiguredRuntimePort -EnvironmentName "BTHWANI_PROVIDERS_API_HOST_PORT" -DefaultPort 18087
  $wltApiHostPort = Get-ConfiguredRuntimePort -EnvironmentName "BTHWANI_WLT_API_HOST_PORT" -DefaultPort 18083
  $dshApiHostPort = Get-ConfiguredRuntimePort -EnvironmentName "BTHWANI_DSH_API_HOST_PORT" -DefaultPort 18080
  $platformApiHostPort = Get-ConfiguredRuntimePort -EnvironmentName "BTHWANI_PLATFORM_CONTROL_API_HOST_PORT" -DefaultPort 18088

  foreach ($url in @(
    "http://localhost:$wiremockFinancialPort/__admin/mappings",
    "http://localhost:$identityApiHostPort/identity/health",
    "http://localhost:$providersApiHostPort/providers/readiness",
    "http://localhost:$wltApiHostPort/wlt/health",
    "http://localhost:$dshApiHostPort/dsh/health",
    "http://localhost:$platformApiHostPort/platform/health"
  )) {
    Wait-PlatformHttpReady $url
  }
  Wait-PlatformHttpReady "http://localhost:$platformApiHostPort/platform/readiness" "HEALTHY"
}
