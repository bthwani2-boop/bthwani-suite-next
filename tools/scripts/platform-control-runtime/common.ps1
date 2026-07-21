$ErrorActionPreference = "Stop"
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
Set-Location -LiteralPath $script:RepoRoot

$script:ComposeFile = Join-Path $script:RepoRoot "infra/docker/compose.runtime.yml"
$script:FinancialComposeFile = Join-Path $script:RepoRoot "infra/docker/compose.financial-simulators.yml"
$script:EnvFile = Join-Path $script:RepoRoot "infra/docker/env/runtime.env.example"
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

function Invoke-PlatformDatabasePsql {
  param(
    [Parameter(Mandatory = $true)][string]$User,
    [Parameter(Mandatory = $true)][string]$Database,
    [Parameter(Mandatory = $true)][string]$Sql
  )
  $result = $Sql | docker compose @script:ComposeArgs exec -T postgres psql -U $User -d $Database -v ON_ERROR_STOP=1 -tA
  if ($LASTEXITCODE -ne 0) { throw "psql failed for database $Database" }
  return ($result -join "`n").Trim()
}

function Invoke-PlatformDatabaseMigrate {
  param(
    [Parameter(Mandatory = $true)][string]$User,
    [Parameter(Mandatory = $true)][string]$Database,
    [Parameter(Mandatory = $true)][string]$MigrationDirectory
  )
  $migrationDir = Join-Path $script:RepoRoot $MigrationDirectory
  $migrationFiles = @(Get-ChildItem -LiteralPath $migrationDir -Filter "*.sql" | Sort-Object Name)
  if ($migrationFiles.Count -eq 0) { throw "no migrations found in $MigrationDirectory" }

  Invoke-PlatformDatabasePsql -User $User -Database $Database -Sql @'
CREATE TABLE IF NOT EXISTS runtime_schema_migrations (
  migration_name TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
'@ | Out-Null

  foreach ($file in $migrationFiles) {
    $checksum = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    $recorded = Invoke-PlatformDatabasePsql -User $User -Database $Database -Sql "SELECT checksum FROM runtime_schema_migrations WHERE migration_name = '$($file.Name)';"
    if ($recorded -eq $checksum) {
      Write-Host "Skipping applied migration in ${Database}: $($file.Name)"
      continue
    }
    if ($recorded -ne "") { throw "migration checksum mismatch in ${Database}: $($file.Name)" }
    Get-Content -LiteralPath $file.FullName -Raw | docker compose @script:ComposeArgs exec -T postgres psql -U $User -d $Database -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "migration failed in ${Database}: $($file.Name)" }
    Invoke-PlatformDatabasePsql -User $User -Database $Database -Sql "INSERT INTO runtime_schema_migrations (migration_name, checksum) VALUES ('$($file.Name)', '$checksum');" | Out-Null
    Write-Host "Applied migration in ${Database}: $($file.Name)"
  }
}

function Invoke-PlatformMigrations {
  Invoke-PlatformCompose up -d postgres
  Wait-PlatformPostgres
  Ensure-PlatformDatabases
  Invoke-PlatformDatabaseMigrate -User "identity_runtime" -Database "identity_runtime" -MigrationDirectory "core/identity/database/migrations"
  Invoke-PlatformDatabaseMigrate -User "providers_runtime" -Database "providers_runtime" -MigrationDirectory "core/providers/database/migrations"
  Invoke-PlatformDatabaseMigrate -User "wlt_runtime" -Database "wlt_runtime" -MigrationDirectory "services/wlt/database/migrations"
  Invoke-PlatformDatabaseMigrate -User "dsh_runtime" -Database "dsh_runtime" -MigrationDirectory "services/dsh/database/migrations"
  Invoke-PlatformDatabaseMigrate -User "platform_control_runtime" -Database "platform_control_runtime" -MigrationDirectory "core/platform-control/database/migrations"
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
  Wait-PlatformHttpReady "http://localhost:58082/identity/health"
  Wait-PlatformHttpReady "http://localhost:58087/providers/health"
  Wait-PlatformHttpReady "http://localhost:58083/wlt/health"
  Wait-PlatformHttpReady "http://localhost:58080/dsh/health"
  Wait-PlatformHttpReady "http://localhost:58088/platform/health"
  Wait-PlatformHttpReady "http://localhost:58088/platform/readiness"
}
