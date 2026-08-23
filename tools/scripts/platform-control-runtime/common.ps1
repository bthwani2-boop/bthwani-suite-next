$ErrorActionPreference = "Stop"
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
Set-Location -LiteralPath $script:RepoRoot

$script:ComposeFile = Join-Path $script:RepoRoot "infra/docker/compose.runtime.yml"
$script:FinancialComposeFile = Join-Path $script:RepoRoot "infra/docker/compose.financial-simulators.yml"
$script:EnvFile = Join-Path $script:RepoRoot "infra/docker/env/runtime.env.example"
$script:MigrationRunner = Join-Path $script:RepoRoot "tools/scripts/invoke-service-migrations.ps1"
$script:ComposeArgs = @(
  "--env-file", $script:EnvFile,
  "-f", $script:ComposeFile,
  "-f", $script:FinancialComposeFile,
  "--profile", "platform",
  "--profile", "providers",
  "--profile", "wlt",
  "--profile", "dsh",
  "--profile", "media",
  "--profile", "financial-simulators"
)
$script:PostgresAdminUser = if ($env:BTHWANI_POSTGRES_USER) { $env:BTHWANI_POSTGRES_USER } else { "bthwani_runtime" }
$script:PostgresAdminDatabase = if ($env:BTHWANI_POSTGRES_DB) { $env:BTHWANI_POSTGRES_DB } else { "bthwani_runtime" }
$script:PostgresPort = if ($env:BTHWANI_POSTGRES_PORT) { $env:BTHWANI_POSTGRES_PORT } else { "55432" }

function Invoke-PlatformCompose {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  docker compose @script:ComposeArgs @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose failed: $($Arguments -join ' ') (exit $LASTEXITCODE)"
  }
}

function Wait-PlatformPostgres {
  for ($attempt = 1; $attempt -le 45; $attempt++) {
    docker compose @script:ComposeArgs exec -T postgres pg_isready -U $script:PostgresAdminUser -d $script:PostgresAdminDatabase *> $null
    if ($LASTEXITCODE -eq 0) { return }
    Start-Sleep -Seconds 2
  }
  throw "platform-control runtime PostgreSQL did not become ready"
}

function Ensure-PlatformDatabases {
  docker compose @script:ComposeArgs exec -T postgres sh /docker-entrypoint-initdb.d/001_create_runtime_databases.sh
  if ($LASTEXITCODE -ne 0) { throw "failed to ensure platform runtime databases" }
}

function Invoke-PlatformServiceMigrations {
  param(
    [Parameter(Mandatory = $true)][string]$ServiceKey,
    [Parameter(Mandatory = $true)][string]$User,
    [Parameter(Mandatory = $true)][string]$Password,
    [Parameter(Mandatory = $true)][string]$Database,
    [Parameter(Mandatory = $true)][string]$MigrationDirectory
  )

  if (-not (Test-Path -LiteralPath $script:MigrationRunner -PathType Leaf)) {
    throw "governed migration runner not found: $script:MigrationRunner"
  }
  if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw "psql is required to apply governed platform runtime migrations"
  }

  $databaseUrl = "postgresql://${User}:${Password}@127.0.0.1:$($script:PostgresPort)/${Database}?sslmode=disable"
  & pwsh -NoProfile -ExecutionPolicy Bypass -File $script:MigrationRunner `
    -ServiceKey $ServiceKey `
    -MigrationDirectory $MigrationDirectory `
    -DatabaseUrl $databaseUrl
  if ($LASTEXITCODE -ne 0) {
    throw "governed migrations failed for service '$ServiceKey' (exit $LASTEXITCODE)"
  }
}

function Invoke-PlatformMigrations {
  Invoke-PlatformCompose up -d postgres
  Wait-PlatformPostgres
  Ensure-PlatformDatabases
  Invoke-PlatformServiceMigrations -ServiceKey "identity" -User "identity_runtime" -Password "identity_runtime_password" -Database "identity_runtime" -MigrationDirectory "core/identity/database/migrations"
  Invoke-PlatformServiceMigrations -ServiceKey "providers" -User "providers_runtime" -Password "providers_runtime_password" -Database "providers_runtime" -MigrationDirectory "core/providers/database/migrations"
  Invoke-PlatformServiceMigrations -ServiceKey "wlt" -User "wlt_runtime" -Password "wlt_runtime_password" -Database "wlt_runtime" -MigrationDirectory "services/wlt/database/migrations"
  Invoke-PlatformServiceMigrations -ServiceKey "dsh" -User "dsh_runtime" -Password "dsh_runtime_password" -Database "dsh_runtime" -MigrationDirectory "services/dsh/database/migrations"
  Invoke-PlatformServiceMigrations -ServiceKey "platform-control" -User "platform_control_runtime" -Password "platform_control_runtime_password" -Database "platform_control_runtime" -MigrationDirectory "core/platform-control/database/migrations"
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

function Start-PlatformP3Runtime {
  Invoke-PlatformMigrations
  Invoke-PlatformCompose up -d wiremock-financial-provider minio identity-api providers-api wlt-api dsh-api platform-control-api
  Wait-PlatformHttpReady "http://localhost:58090/__admin/mappings"
  Wait-PlatformHttpReady "http://localhost:18082/identity/health"
  Wait-PlatformHttpReady "http://localhost:58087/providers/readiness"
  Wait-PlatformHttpReady "http://localhost:58083/wlt/health"
  Wait-PlatformHttpReady "http://localhost:58080/dsh/health"
  Wait-PlatformHttpReady "http://localhost:58088/platform/health"
  Wait-PlatformHttpReady "http://localhost:58088/platform/readiness"
}
