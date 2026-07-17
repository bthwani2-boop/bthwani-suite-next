param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("up", "down", "reset", "status", "logs", "migrate", "smoke")]
  [string]$Action
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location -LiteralPath $RepoRoot

$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$ComposeArgs = @("--env-file", $EnvFile, "-f", $ComposeFile, "--profile", "platform")

function Invoke-Compose {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  docker compose @ComposeArgs @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose failed: $($Arguments -join ' ') (exit $LASTEXITCODE)"
  }
}

function Wait-Postgres {
  for ($attempt = 1; $attempt -le 30; $attempt++) {
    docker compose @ComposeArgs exec -T postgres pg_isready -U bthwani_runtime -d bthwani_runtime *> $null
    if ($LASTEXITCODE -eq 0) { return }
    Start-Sleep -Seconds 2
  }
  throw "platform-control runtime PostgreSQL did not become ready"
}

function Ensure-PlatformDatabase {
  $sql = @'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'platform_control_runtime') THEN
    CREATE ROLE platform_control_runtime LOGIN PASSWORD 'platform_control_runtime_password';
  END IF;
END
$$;
SELECT 'CREATE DATABASE platform_control_runtime OWNER platform_control_runtime'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'platform_control_runtime')\gexec
'@
  $sql | docker compose @ComposeArgs exec -T postgres psql -U bthwani_runtime -d bthwani_runtime -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw "failed to ensure platform_control_runtime database" }
}

function Invoke-PlatformPsql {
  param([Parameter(Mandatory = $true)][string]$Sql)
  $result = $Sql | docker compose @ComposeArgs exec -T postgres `
    psql -U platform_control_runtime -d platform_control_runtime -v ON_ERROR_STOP=1 -tA
  if ($LASTEXITCODE -ne 0) { throw "platform-control psql failed" }
  return ($result -join "`n").Trim()
}

function Invoke-PlatformMigrate {
  Invoke-Compose up -d postgres
  Wait-Postgres
  Ensure-PlatformDatabase

  $migrationDir = Join-Path $RepoRoot "core/platform-control/database/migrations"
  $migrationFiles = Get-ChildItem -LiteralPath $migrationDir -Filter "*.sql" | Sort-Object Name
  if ($migrationFiles.Count -eq 0) { throw "no platform-control migrations found" }

  Invoke-PlatformPsql @'
CREATE TABLE IF NOT EXISTS runtime_schema_migrations (
  migration_name TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
'@ | Out-Null

  foreach ($file in $migrationFiles) {
    $checksum = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    $recorded = Invoke-PlatformPsql "SELECT checksum FROM runtime_schema_migrations WHERE migration_name = '$($file.Name)';"
    if ($recorded -eq $checksum) {
      Write-Host "Skipping applied platform migration: $($file.Name)"
      continue
    }
    if ($recorded -ne "") {
      throw "platform migration checksum mismatch: $($file.Name)"
    }
    Get-Content -LiteralPath $file.FullName -Raw | docker compose @ComposeArgs exec -T postgres `
      psql -U platform_control_runtime -d platform_control_runtime -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "platform migration failed: $($file.Name)" }
    Invoke-PlatformPsql "INSERT INTO runtime_schema_migrations (migration_name, checksum) VALUES ('$($file.Name)', '$checksum');" | Out-Null
    Write-Host "Applied platform migration: $($file.Name)"
  }
}

function Wait-HttpReady {
  param([Parameter(Mandatory = $true)][string]$Url)
  for ($attempt = 1; $attempt -le 30; $attempt++) {
    try {
      Invoke-RestMethod $Url -TimeoutSec 5 -ErrorAction Stop | Out-Null
      return
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  throw "endpoint did not become ready: $Url"
}

function Start-PlatformRuntime {
  Invoke-Compose up -d postgres identity-api
  Wait-Postgres
  Ensure-PlatformDatabase
  Invoke-PlatformMigrate
  Invoke-Compose up -d platform-control-api
  Wait-HttpReady "http://localhost:58088/platform/health"
  Wait-HttpReady "http://localhost:58088/platform/readiness"
}

function Invoke-PlatformSmoke {
  Start-PlatformRuntime
  $health = Invoke-RestMethod "http://localhost:58088/platform/health" -TimeoutSec 10
  if ($health.status -ne "healthy") { throw "platform health is not healthy" }
  $readiness = Invoke-RestMethod "http://localhost:58088/platform/readiness" -TimeoutSec 10
  if ($readiness.status -ne "ready") { throw "platform readiness is not ready" }

  $password = if ($env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD) { $env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD } else { "123456" }
  $loginBody = @{
    username = "operator"
    password = $password
    deviceFingerprint = "platform-control-runtime-smoke"
  } | ConvertTo-Json
  $login = Invoke-RestMethod "http://localhost:58082/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -TimeoutSec 10
  if ([string]::IsNullOrWhiteSpace($login.accessToken)) { throw "operator login did not return an access token" }
  $headers = @{ Authorization = "Bearer $($login.accessToken)" }
  $snapshot = Invoke-RestMethod "http://localhost:58088/platform/v1/runtime-config" -Headers $headers -TimeoutSec 10
  if ($snapshot.status -ne "OPERATIONAL") { throw "platform runtime snapshot is not OPERATIONAL: $($snapshot.status)" }
  $variables = Invoke-RestMethod "http://localhost:58088/platform/v1/variables" -Headers $headers -TimeoutSec 10
  if ($null -eq $variables.variables) { throw "platform variables response is missing variables" }
  Write-Host "Platform-control runtime smoke: PASS"
}

switch ($Action) {
  "up"      { Start-PlatformRuntime }
  "down"    { Invoke-Compose stop platform-control-api identity-api postgres }
  "reset"   { Invoke-Compose down -v; Start-PlatformRuntime }
  "status"  { Invoke-Compose ps postgres identity-api platform-control-api }
  "logs"    { Invoke-Compose logs --tail=150 platform-control-api identity-api postgres }
  "migrate" { Invoke-PlatformMigrate }
  "smoke"   { Invoke-PlatformSmoke }
}
