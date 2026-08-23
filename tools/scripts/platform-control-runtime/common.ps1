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
  param([Parameter(Mandatory = $true)][string]$Url)

  for ($attempt = 1; $attempt -le 60; $attempt++) {
    try {
      Invoke-RestMethod $Url -TimeoutSec 5 -ErrorAction Stop | Out-Null
      return
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  throw "endpoint did not become ready: $Url"
}

function Invoke-PlatformMigrations {
  Invoke-CanonicalPlatformRuntime -Action migrate
}

function Start-PlatformP3Runtime {
  Invoke-CanonicalPlatformRuntime -Action up

  foreach ($url in @(
    "http://localhost:18090/__admin/mappings",
    "http://localhost:18082/identity/health",
    "http://localhost:18087/providers/readiness",
    "http://localhost:18083/wlt/health",
    "http://localhost:18080/dsh/health",
    "http://localhost:18088/platform/health",
    "http://localhost:18088/platform/readiness"
  )) {
    Wait-PlatformHttpReady $url
  }
}