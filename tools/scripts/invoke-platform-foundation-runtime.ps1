[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("up", "down", "migrate", "smoke", "status")]
  [string]$Action
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
  $PSNativeCommandUseErrorActionPreference = $false
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location -LiteralPath $RepoRoot

$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$MigrationScript = Join-Path $RepoRoot "infra/docker/scripts/invoke-runtime-database-migrations.ps1"
$ComposeArgs = @(
  "compose",
  "--env-file", $EnvFile,
  "-f", $ComposeFile,
  "--profile", "identity",
  "--profile", "providers",
  "--profile", "platform"
)

foreach ($requiredFile in @($ComposeFile, $EnvFile, $MigrationScript)) {
  if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
    throw "Required platform foundation runtime file is missing: $requiredFile"
  }
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Required command is unavailable: docker"
}

function Invoke-Compose {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  $global:LASTEXITCODE = 0
  & docker @ComposeArgs @Arguments
  $exitCode = if ($null -eq $global:LASTEXITCODE) { 0 } else { [int]$global:LASTEXITCODE }
  if ($exitCode -ne 0) {
    throw "docker compose failed with exit code ${exitCode}: $($Arguments -join ' ')"
  }
}

function Wait-Postgres {
  for ($attempt = 1; $attempt -le 45; $attempt++) {
    $global:LASTEXITCODE = 0
    & docker @ComposeArgs exec -T postgres sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' *> $null
    if ($LASTEXITCODE -eq 0) { return }
    Start-Sleep -Seconds 2
  }
  throw "PostgreSQL did not become ready for platform foundation migrations."
}

function Ensure-PlatformDatabases {
  Invoke-Compose exec -T postgres sh /docker-entrypoint-initdb.d/001_create_runtime_databases.sh
}

function Wait-HttpReady {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Url
  )
  for ($attempt = 1; $attempt -le 60; $attempt++) {
    try {
      $response = Invoke-RestMethod -Uri $Url -TimeoutSec 5 -ErrorAction Stop
      if ($null -ne $response) {
        Write-Host "$Name: ready"
        return
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  throw "$Name did not become ready: $Url"
}

function Invoke-PlatformFoundationMigrations {
  Invoke-Compose up -d postgres
  Wait-Postgres
  Ensure-PlatformDatabases

  foreach ($service in @("providers", "platform-control")) {
    & pwsh -NoProfile -ExecutionPolicy Bypass -File $MigrationScript -Service $service
    if ($LASTEXITCODE -ne 0) {
      throw "Governed migration failed for $service with exit code $LASTEXITCODE"
    }
  }
}

function Wait-PlatformFoundationServices {
  Wait-HttpReady -Name "Identity API" -Url "http://localhost:58082/identity/readiness"
  Wait-HttpReady -Name "Providers API" -Url "http://localhost:58087/providers/readiness"
  Wait-HttpReady -Name "Platform Control API" -Url "http://localhost:58088/platform/readiness"
}

switch ($Action) {
  "migrate" {
    Invoke-PlatformFoundationMigrations
    Write-Host "Platform foundation migrations: PASS"
  }
  "up" {
    docker info | Out-Null
    Invoke-PlatformFoundationMigrations
    Invoke-Compose up -d identity-api providers-api platform-control-api
    Wait-PlatformFoundationServices
    Write-Host "Platform foundation runtime up: PASS"
  }
  "smoke" {
    Wait-PlatformFoundationServices
    $providers = Invoke-RestMethod -Uri "http://localhost:58087/providers/readiness" -TimeoutSec 10 -ErrorAction Stop
    $platform = Invoke-RestMethod -Uri "http://localhost:58088/platform/readiness" -TimeoutSec 10 -ErrorAction Stop
    if ($null -eq $providers -or $null -eq $platform) {
      throw "Platform foundation readiness responses must not be empty."
    }
    Write-Host "Platform foundation runtime smoke: PASS"
  }
  "status" {
    Invoke-Compose ps postgres identity-api providers-api platform-control-api
  }
  "down" {
    # Stop and remove only the two foundation services owned by this adapter.
    # Shared identity and PostgreSQL remain owned by the central full-runtime command.
    Invoke-Compose stop providers-api platform-control-api
    Invoke-Compose rm -f providers-api platform-control-api
    Write-Host "Platform foundation services stopped without deleting volumes."
  }
}
