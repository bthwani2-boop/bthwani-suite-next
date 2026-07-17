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
$PostgresAdminUser = if ($env:BTHWANI_POSTGRES_USER) { $env:BTHWANI_POSTGRES_USER } else { "bthwani_runtime" }
$PostgresAdminDatabase = if ($env:BTHWANI_POSTGRES_DB) { $env:BTHWANI_POSTGRES_DB } else { "bthwani_runtime" }

function Invoke-Compose {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  docker compose @ComposeArgs @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose failed: $($Arguments -join ' ') (exit $LASTEXITCODE)"
  }
}

function Wait-Postgres {
  for ($attempt = 1; $attempt -le 30; $attempt++) {
    docker compose @ComposeArgs exec -T postgres pg_isready -U $PostgresAdminUser -d $PostgresAdminDatabase *> $null
    if ($LASTEXITCODE -eq 0) { return }
    Start-Sleep -Seconds 2
  }
  throw "platform-control runtime PostgreSQL did not become ready"
}

function Ensure-RuntimeDatabases {
  $sql = @'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'identity_runtime') THEN
    CREATE ROLE identity_runtime LOGIN PASSWORD 'identity_runtime_password';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'platform_control_runtime') THEN
    CREATE ROLE platform_control_runtime LOGIN PASSWORD 'platform_control_runtime_password';
  END IF;
END
$$;
SELECT 'CREATE DATABASE identity_runtime OWNER identity_runtime'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'identity_runtime')\gexec
SELECT 'CREATE DATABASE platform_control_runtime OWNER platform_control_runtime'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'platform_control_runtime')\gexec
'@
  $sql | docker compose @ComposeArgs exec -T postgres psql -U $PostgresAdminUser -d $PostgresAdminDatabase -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw "failed to ensure identity and platform-control databases" }
}

function Invoke-DatabasePsql {
  param(
    [Parameter(Mandatory = $true)][string]$User,
    [Parameter(Mandatory = $true)][string]$Database,
    [Parameter(Mandatory = $true)][string]$Sql
  )
  $result = $Sql | docker compose @ComposeArgs exec -T postgres `
    psql -U $User -d $Database -v ON_ERROR_STOP=1 -tA
  if ($LASTEXITCODE -ne 0) { throw "psql failed for database $Database" }
  return ($result -join "`n").Trim()
}

function Invoke-DatabaseMigrate {
  param(
    [Parameter(Mandatory = $true)][string]$User,
    [Parameter(Mandatory = $true)][string]$Database,
    [Parameter(Mandatory = $true)][string]$MigrationDirectory
  )
  $migrationDir = Join-Path $RepoRoot $MigrationDirectory
  $migrationFiles = Get-ChildItem -LiteralPath $migrationDir -Filter "*.sql" | Sort-Object Name
  if ($migrationFiles.Count -eq 0) { throw "no migrations found in $MigrationDirectory" }

  Invoke-DatabasePsql -User $User -Database $Database -Sql @'
CREATE TABLE IF NOT EXISTS runtime_schema_migrations (
  migration_name TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
'@ | Out-Null

  foreach ($file in $migrationFiles) {
    $checksum = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    $recorded = Invoke-DatabasePsql -User $User -Database $Database -Sql "SELECT checksum FROM runtime_schema_migrations WHERE migration_name = '$($file.Name)';"
    if ($recorded -eq $checksum) {
      Write-Host "Skipping applied migration in ${Database}: $($file.Name)"
      continue
    }
    if ($recorded -ne "") {
      throw "migration checksum mismatch in ${Database}: $($file.Name)"
    }
    Get-Content -LiteralPath $file.FullName -Raw | docker compose @ComposeArgs exec -T postgres `
      psql -U $User -d $Database -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "migration failed in ${Database}: $($file.Name)" }
    Invoke-DatabasePsql -User $User -Database $Database -Sql "INSERT INTO runtime_schema_migrations (migration_name, checksum) VALUES ('$($file.Name)', '$checksum');" | Out-Null
    Write-Host "Applied migration in ${Database}: $($file.Name)"
  }
}

function Invoke-PlatformMigrate {
  Invoke-Compose up -d postgres
  Wait-Postgres
  Ensure-RuntimeDatabases
  Invoke-DatabaseMigrate -User "identity_runtime" -Database "identity_runtime" -MigrationDirectory "core/identity/database/migrations"
  Invoke-DatabaseMigrate -User "platform_control_runtime" -Database "platform_control_runtime" -MigrationDirectory "core/platform-control/database/migrations"
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
  Invoke-PlatformMigrate
  Invoke-Compose up -d identity-api platform-control-api
  Wait-HttpReady "http://localhost:58082/identity/health"
  Wait-HttpReady "http://localhost:58088/platform/health"
  Wait-HttpReady "http://localhost:58088/platform/readiness"
}

function Login-LocalActor {
  param(
    [Parameter(Mandatory = $true)][string]$Username,
    [Parameter(Mandatory = $true)][string]$Password,
    [Parameter(Mandatory = $true)][string]$DeviceFingerprint
  )
  $body = @{
    username = $Username
    password = $Password
    deviceFingerprint = $DeviceFingerprint
  } | ConvertTo-Json
  $login = Invoke-RestMethod "http://localhost:58082/auth/login" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 10
  if ([string]::IsNullOrWhiteSpace($login.accessToken)) { throw "$Username login did not return an access token" }
  return $login.accessToken
}

function New-AuthHeaders {
  param(
    [Parameter(Mandatory = $true)][string]$AccessToken,
    [Parameter(Mandatory = $true)][string]$CorrelationId
  )
  return @{
    Authorization = "Bearer $AccessToken"
    "X-Correlation-ID" = $CorrelationId
  }
}

function Assert-HttpFailureStatus {
  param(
    [Parameter(Mandatory = $true)][scriptblock]$Operation,
    [Parameter(Mandatory = $true)][int]$ExpectedStatus
  )
  try {
    & $Operation | Out-Null
    throw "expected HTTP $ExpectedStatus but request succeeded"
  } catch {
    $status = [int]$_.Exception.Response.StatusCode
    if ($status -ne $ExpectedStatus) { throw }
  }
}

function Invoke-PlatformSmoke {
  Start-PlatformRuntime
  $health = Invoke-RestMethod "http://localhost:58088/platform/health" -TimeoutSec 10
  if ($health.status -ne "healthy") { throw "platform health is not healthy" }
  $readiness = Invoke-RestMethod "http://localhost:58088/platform/readiness" -TimeoutSec 10
  if ($readiness.status -ne "ready") { throw "platform readiness is not ready" }

  $password = if ($env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD) { $env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD } else { "123456" }
  $correlationId = "platform-smoke-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
  $operatorToken = Login-LocalActor -Username "operator" -Password $password -DeviceFingerprint "$correlationId-operator"
  $approverToken = Login-LocalActor -Username "platform-approver" -Password $password -DeviceFingerprint "$correlationId-approver"
  $applierToken = Login-LocalActor -Username "platform-applier" -Password $password -DeviceFingerprint "$correlationId-applier"
  $operatorHeaders = New-AuthHeaders -AccessToken $operatorToken -CorrelationId $correlationId
  $approverHeaders = New-AuthHeaders -AccessToken $approverToken -CorrelationId $correlationId
  $applierHeaders = New-AuthHeaders -AccessToken $applierToken -CorrelationId $correlationId

  $snapshot = Invoke-RestMethod "http://localhost:58088/platform/v1/runtime-config" -Headers $operatorHeaders -TimeoutSec 10
  if ($snapshot.status -ne "OPERATIONAL") { throw "platform runtime snapshot is not OPERATIONAL: $($snapshot.status)" }

  $key = "PLATFORM_RUNTIME_SMOKE_$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
  $createBody = @{
    title = "Platform runtime smoke"
    reason = "Prove the complete governed HTTP workflow"
    impactAssessment = "Temporary global internal test variable"
    rollbackPlan = "Delete the newly created variable from its captured empty state"
    items = @(
      @{
        targetType = "variable"
        targetKey = $key
        ownerService = "platform-control"
        scopeType = "global"
        valueType = "json"
        classification = "internal"
        expectedRevision = 0
        proposedValue = @{ smoke = $true; correlationId = $correlationId }
      }
    )
  } | ConvertTo-Json -Depth 8
  $created = Invoke-RestMethod "http://localhost:58088/platform/v1/change-sets" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $createBody -TimeoutSec 10
  $changeSetId = $created.changeSet.id
  if ([string]::IsNullOrWhiteSpace($changeSetId) -or $created.changeSet.status -ne "draft") { throw "change-set creation readback is invalid" }

  $validated = Invoke-RestMethod "http://localhost:58088/platform/v1/change-sets/$changeSetId/validate" -Method Post -Headers $operatorHeaders -TimeoutSec 10
  if ($validated.changeSet.status -ne "validated") { throw "change set was not validated" }
  $submitted = Invoke-RestMethod "http://localhost:58088/platform/v1/change-sets/$changeSetId/submit" -Method Post -Headers $operatorHeaders -TimeoutSec 10
  if ($submitted.changeSet.status -ne "submitted") { throw "change set was not submitted" }

  Assert-HttpFailureStatus -ExpectedStatus 403 -Operation {
    Invoke-RestMethod "http://localhost:58088/platform/v1/change-sets/$changeSetId/approve" -Method Post -Headers $operatorHeaders -TimeoutSec 10
  }
  $approved = Invoke-RestMethod "http://localhost:58088/platform/v1/change-sets/$changeSetId/approve" -Method Post -Headers $approverHeaders -TimeoutSec 10
  if ($approved.changeSet.status -ne "approved") { throw "change set was not approved" }
  $applied = Invoke-RestMethod "http://localhost:58088/platform/v1/change-sets/$changeSetId/apply" -Method Post -Headers $applierHeaders -TimeoutSec 10
  if ($applied.changeSet.status -ne "applied") { throw "change set was not applied" }

  $variable = Invoke-RestMethod "http://localhost:58088/platform/v1/variables/$key?scopeType=global&scopeId=" -Headers $operatorHeaders -TimeoutSec 10
  if ($variable.variable.key -ne $key -or $variable.variable.revision -ne "1" -or -not $variable.variable.value.smoke) {
    throw "applied variable readback is invalid"
  }

  $rolledBack = Invoke-RestMethod "http://localhost:58088/platform/v1/change-sets/$changeSetId/rollback" -Method Post -Headers $applierHeaders -TimeoutSec 10
  if ($rolledBack.changeSet.status -ne "rolled_back") { throw "change set was not rolled back" }
  Assert-HttpFailureStatus -ExpectedStatus 404 -Operation {
    Invoke-RestMethod "http://localhost:58088/platform/v1/variables/$key?scopeType=global&scopeId=" -Headers $operatorHeaders -TimeoutSec 10
  }
  $audit = Invoke-RestMethod "http://localhost:58088/platform/v1/audit-events" -Headers $approverHeaders -TimeoutSec 10
  $journeyEvents = @($audit.events | Where-Object { $_.correlationId -eq $correlationId })
  if ($journeyEvents.Count -ne 6) { throw "expected six persisted workflow audit events, got $($journeyEvents.Count)" }
  Write-Host "Platform-control governed runtime smoke: PASS"
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
