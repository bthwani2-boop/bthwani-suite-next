#!/usr/bin/env pwsh
[CmdletBinding()]
param(
  [ValidateSet("Static", "Runtime", "Full")]
  [string]$Mode = "Runtime",
  [ValidateSet("Local", "LiveLike")]
  [string]$Posture = "Local",
  [switch]$ForceDisasterRecovery,
  [switch]$Cleanup,
  [string]$EvidencePath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location -LiteralPath $RepoRoot

$CatalogPath = Join-Path $RepoRoot "infra/data-plane/jrn-042-runtime-governance.json"
$ComposePath = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$ObservabilityComposePath = Join-Path $RepoRoot "infra/docker/compose.observability.yml"
$EnvPath = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$MigrationCommand = Join-Path $RepoRoot "infra/docker/scripts/invoke-runtime-database-migrations.ps1"
$DisasterRecoveryCommand = Join-Path $RepoRoot "tools/scripts/test-runtime-backup-restore.ps1"

foreach ($RequiredPath in @($CatalogPath, $ComposePath, $ObservabilityComposePath, $EnvPath, $MigrationCommand, $DisasterRecoveryCommand)) {
  if (-not (Test-Path -LiteralPath $RequiredPath)) { throw "Required JRN-042 path is missing: $RequiredPath" }
}

$Catalog = Get-Content -LiteralPath $CatalogPath -Raw | ConvertFrom-Json
$Services = @($Catalog.services)
if ($Services.Count -ne 6) { throw "JRN-042 requires exactly six sovereign services; catalog contains $($Services.Count)." }
if ((@($Services.id | Select-Object -Unique)).Count -ne 6) { throw "JRN-042 service ids must be unique." }
if ((@($Services.database | Select-Object -Unique)).Count -ne 6) { throw "JRN-042 databases must be isolated and unique." }
if ((@($Services.owner | Select-Object -Unique)).Count -ne 6) { throw "JRN-042 database owners must be isolated and unique." }

function Resolve-ExactCommitSha {
  if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_SHA)) { return $env:GITHUB_SHA.Trim() }
  $Sha = (& git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or $Sha -notmatch '^[0-9a-f]{40}$') { throw "JRN-042 requires an exact immutable commit SHA." }
  return $Sha
}

function Resolve-ExactRef {
  foreach ($Value in @($env:GITHUB_HEAD_REF, $env:GITHUB_REF_NAME)) {
    if (-not [string]::IsNullOrWhiteSpace($Value)) { return $Value.Trim() }
  }
  $Ref = (& git branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($Ref)) { throw "JRN-042 requires a resolved branch or ref." }
  return $Ref
}

function Import-RuntimeEnvironment {
  Get-Content -LiteralPath $EnvPath | ForEach-Object {
    $Line = $_.Trim()
    if ($Line -and -not $Line.StartsWith("#") -and $Line.Contains("=")) {
      $Parts = $Line.Split("=", 2)
      $Key = $Parts[0].Trim()
      $Value = $Parts[1].Trim().Trim('"').Trim("'")
      if (-not (Get-Item -Path "Env:$Key" -ErrorAction SilentlyContinue)) {
        [Environment]::SetEnvironmentVariable($Key, $Value)
      }
    }
  }
}

function Get-EnvOrDefault {
  param([Parameter(Mandatory = $true)][string]$Name, [Parameter(Mandatory = $true)][string]$Default)
  $Value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($Value)) { return $Default }
  return $Value.Trim()
}

function Assert-SecretPosture {
  $ForbiddenLiveLikeValues = @(
    "bthwani_runtime_password",
    "bthwani_minio_password",
    "123456",
    "dev-only-dsh-wlt-shared-secret",
    "dev-only-payout-destination-encryption-key",
    "LOCAL_ONLY_replace_with_32_plus_byte_activation_hmac_secret",
    "LOCAL_ONLY_replace_with_workforce_internal_service_token"
  )
  if ($Posture -eq "LiveLike") {
    $Names = @(
      "BTHWANI_POSTGRES_PASSWORD",
      "BTHWANI_MINIO_ROOT_PASSWORD",
      "IDENTITY_LOCAL_BOOTSTRAP_PASSWORD",
      "WLT_DSH_SERVICE_TOKEN",
      "DSH_WLT_SERVICE_TOKEN",
      "WLT_PAYOUT_ENCRYPTION_KEY",
      "IDENTITY_ACTIVATION_HMAC_SECRET",
      "IDENTITY_WORKFORCE_SERVICE_TOKEN"
    )
    $Weak = @()
    foreach ($Name in $Names) {
      $Value = [Environment]::GetEnvironmentVariable($Name)
      if ([string]::IsNullOrWhiteSpace($Value) -or $ForbiddenLiveLikeValues -contains $Value -or $Value -match '^(LOCAL_ONLY|dev-only)') {
        $Weak += $Name
      }
    }
    if ($Weak.Count -gt 0) { throw "LiveLike posture refused weak, missing, or placeholder secrets: $($Weak -join ', ')" }
    if ($env:WLT_FINANCIAL_PROVIDER_MODE -eq "mock") { throw "LiveLike posture refuses WLT_FINANCIAL_PROVIDER_MODE=mock." }
  }
}

function Invoke-Compose {
  param([Parameter(Mandatory = $true)][string[]]$Arguments, [switch]$Observability)
  $Base = @("compose", "--env-file", $EnvPath, "-f", $ComposePath)
  if ($Observability) { $Base += @("-f", $ObservabilityComposePath) }
  & docker @Base @Arguments
  if ($LASTEXITCODE -ne 0) { throw "docker compose failed: $($Arguments -join ' ')" }
}

function Invoke-AdminSql {
  param([Parameter(Mandatory = $true)][string]$Database, [Parameter(Mandatory = $true)][string]$Sql)
  $Result = docker compose --env-file $EnvPath -f $ComposePath exec -T postgres `
    psql -U $PostgresAdminUser -d $Database -X -qAt -v ON_ERROR_STOP=1 -c $Sql
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL verification failed in $Database." }
  return ($Result -join "").Trim()
}

function Wait-Postgres {
  for ($Attempt = 1; $Attempt -le 40; $Attempt++) {
    docker compose --env-file $EnvPath -f $ComposePath exec -T postgres `
      pg_isready -U $PostgresAdminUser -d $PostgresAdminDatabase *> $null
    if ($LASTEXITCODE -eq 0) { return }
    Start-Sleep -Seconds 2
  }
  throw "PostgreSQL did not become ready."
}

function Wait-JsonStatus {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$ExpectedStatus
  )
  for ($Attempt = 1; $Attempt -le 40; $Attempt++) {
    try {
      $Response = Invoke-RestMethod -Uri $Url -TimeoutSec 5 -ErrorAction Stop
      if ($Response.status -eq $ExpectedStatus) {
        return [ordered]@{ url = $Url; status = $ExpectedStatus; attempts = $Attempt; state = "PASS" }
      }
    } catch { }
    Start-Sleep -Seconds 2
  }
  throw "$Name did not report '$ExpectedStatus' at $Url."
}

function Wait-ProvidersHealth {
  $Url = "http://127.0.0.1:58087/providers/health"
  $RequiredKinds = @("sms", "maps", "payment", "push", "email", "storage", "search", "fraud")
  for ($Attempt = 1; $Attempt -le 40; $Attempt++) {
    try {
      $Response = Invoke-RestMethod -Uri $Url -TimeoutSec 5 -ErrorAction Stop
      $Items = @($Response.providers)
      $Kinds = @($Items | ForEach-Object { $_.kind })
      $Missing = @($RequiredKinds | Where-Object { $Kinds -notcontains $_ })
      $Invalid = @($Items | Where-Object { $_.status -notin @("healthy", "degraded", "down", "not_configured") })
      if ($Missing.Count -eq 0 -and $Invalid.Count -eq 0) {
        return [ordered]@{ url = $Url; providerKinds = $Kinds; attempts = $Attempt; state = "PASS" }
      }
    } catch { }
    Start-Sleep -Seconds 2
  }
  throw "Providers health matrix is incomplete or invalid."
}

function Test-StaticRuntimeControls {
  $RequiredWorkerPaths = @($Catalog.asynchronousDelivery.dshWorkers) + @($Catalog.asynchronousDelivery.wltWorkers)
  foreach ($WorkerPath in $RequiredWorkerPaths) {
    $Absolute = Join-Path $RepoRoot $WorkerPath
    if (-not (Test-Path -LiteralPath $Absolute)) { throw "Required outbox worker is missing: $WorkerPath" }
    $PackageDirectory = Split-Path -Parent $Absolute
    $Source = (Get-ChildItem -LiteralPath $PackageDirectory -Filter "*.go" -File | Sort-Object Name | ForEach-Object {
      Get-Content -LiteralPath $_.FullName -Raw
    }) -join "`n"
    if ($Source -notmatch '(?i)(retry|attempt|backoff|next)') { throw "Outbox package lacks bounded retry semantics: $WorkerPath" }
    if ($Source -notmatch '(?i)(failed|dead|exhaust|last.?error)') { throw "Outbox package lacks terminal failure semantics: $WorkerPath" }
  }

  $BackupSource = Get-Content -LiteralPath (Join-Path $RepoRoot $Catalog.backupRestore.backupCommand) -Raw
  $RestoreSource = Get-Content -LiteralPath (Join-Path $RepoRoot $Catalog.backupRestore.restoreCommand) -Raw
  if ($BackupSource -notmatch 'sha256' -or $BackupSource -notmatch 'ConsistencyMode') { throw "Backup command lacks checksummed consistency evidence." }
  if ($RestoreSource -notmatch 'SupportsShouldProcess' -or $RestoreSource -notmatch 'Force') { throw "Restore command is not explicitly destructive and gated." }

  $ObservabilitySource = Get-Content -LiteralPath $ObservabilityComposePath -Raw
  if ($ObservabilitySource -match '(?m)image:\s*[^\r\n]+:latest\s*$') { throw "Observability compose uses a floating latest image." }
  if ($ObservabilitySource -notmatch '127\.0\.0\.1:') { throw "Observability ports must bind to loopback for the governed local runtime." }
}

Import-RuntimeEnvironment
Assert-SecretPosture
$PostgresAdminUser = Get-EnvOrDefault -Name "BTHWANI_POSTGRES_USER" -Default "bthwani_runtime"
$PostgresAdminDatabase = Get-EnvOrDefault -Name "BTHWANI_POSTGRES_DB" -Default "bthwani_runtime"
$ResolvedCommitSha = Resolve-ExactCommitSha
$ResolvedRef = Resolve-ExactRef

if ([string]::IsNullOrWhiteSpace($EvidencePath)) {
  $EvidencePath = Join-Path $RepoRoot "artifacts/jrn-042-runtime-data-evidence.json"
}
$EvidenceDirectory = Split-Path -Parent $EvidencePath
New-Item -ItemType Directory -Path $EvidenceDirectory -Force | Out-Null
$Evidence = [ordered]@{
  schemaVersion = 1
  journeyId = "JRN-042"
  repository = "bthwani2-boop/bthwani-suite-next"
  branch = $ResolvedRef
  commitSha = $ResolvedCommitSha
  mode = $Mode
  posture = $Posture
  startedAt = [DateTimeOffset]::UtcNow.ToString("o")
  state = "RUNNING"
  static = [ordered]@{ state = "NOT_RUN" }
  services = [ordered]@{}
  databases = [ordered]@{}
  outbox = [ordered]@{}
  observability = [ordered]@{ state = "NOT_RUN" }
  disasterRecovery = [ordered]@{ state = "NOT_RUN" }
}

function Save-Evidence {
  param([string]$State, [string]$Failure = "")
  $Evidence.state = $State
  $Evidence.completedAt = [DateTimeOffset]::UtcNow.ToString("o")
  if ($Failure) { $Evidence.failure = $Failure }
  $Evidence | ConvertTo-Json -Depth 14 | Set-Content -LiteralPath $EvidencePath -Encoding utf8
}

$Profiles = @("--profile", "identity", "--profile", "workforce", "--profile", "dsh", "--profile", "wlt", "--profile", "providers", "--profile", "platform", "--profile", "media")
$ComposeServices = @($Services | ForEach-Object { $_.composeService })

try {
  Test-StaticRuntimeControls
  $Evidence.static = [ordered]@{ state = "PASS"; catalog = $CatalogPath; serviceCount = $Services.Count }

  Invoke-Compose -Arguments @($Profiles + @("config", "--quiet"))
  Invoke-Compose -Arguments @($Profiles + @("config", "--quiet")) -Observability

  if ($Mode -ne "Static") {
    docker info | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Docker daemon is unavailable." }

    Invoke-Compose -Arguments @($Profiles + @("up", "-d", "postgres", "minio", "minio-init"))
    Wait-Postgres

    foreach ($Service in $Services) {
      & pwsh -NoProfile -ExecutionPolicy Bypass -File $MigrationCommand `
        -Service $Service.id -SourceCommitSha $ResolvedCommitSha
      if ($LASTEXITCODE -ne 0) { throw "Governed migrations failed for $($Service.id)." }
    }

    Invoke-Compose -Arguments @($Profiles + @("up", "-d", "--build") + $ComposeServices)

    foreach ($Service in $Services) {
      $BaseUrl = "http://127.0.0.1:$($Service.hostPort)"
      if ($Service.id -eq "providers") {
        $Evidence.services[$Service.id] = [ordered]@{
          health = Wait-ProvidersHealth
          readiness = Wait-JsonStatus -Name "providers readiness" -Url "$BaseUrl$($Service.readinessPath)" -ExpectedStatus "ready"
          state = "PASS"
        }
      } else {
        $Evidence.services[$Service.id] = [ordered]@{
          health = Wait-JsonStatus -Name "$($Service.id) health" -Url "$BaseUrl$($Service.healthPath)" -ExpectedStatus "healthy"
          readiness = Wait-JsonStatus -Name "$($Service.id) readiness" -Url "$BaseUrl$($Service.readinessPath)" -ExpectedStatus "ready"
          state = "PASS"
        }
      }

      $Owner = Invoke-AdminSql -Database $PostgresAdminDatabase -Sql "SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname = '$($Service.database)';"
      if ($Owner -ne $Service.owner) { throw "Database owner mismatch for $($Service.database): expected $($Service.owner), got $Owner" }
      $MigrationFileCount = @(Get-ChildItem -LiteralPath (Join-Path $RepoRoot $Service.migrationDirectory) -Filter "*.sql" -File).Count
      $Ledger = Invoke-AdminSql -Database $Service.database -Sql "SELECT COUNT(*) || ':' || COUNT(*) FILTER (WHERE dirty OR NOT success) FROM schema_migrations WHERE service_name = '$($Service.id)';"
      $LedgerParts = $Ledger.Split(":")
      if ($LedgerParts.Count -ne 2 -or [int]$LedgerParts[0] -ne $MigrationFileCount -or [int]$LedgerParts[1] -ne 0) {
        throw "Migration ledger mismatch for $($Service.id): files=$MigrationFileCount ledger=$Ledger"
      }
      $Evidence.databases[$Service.id] = [ordered]@{
        database = $Service.database
        owner = $Owner
        migrationFiles = $MigrationFileCount
        ledgerRows = [int]$LedgerParts[0]
        dirtyRows = [int]$LedgerParts[1]
        state = "PASS"
      }
    }

    foreach ($ServiceId in @("identity", "dsh", "wlt")) {
      $Service = $Services | Where-Object { $_.id -eq $ServiceId }
      $TableCount = [int](Invoke-AdminSql -Database $Service.database -Sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%outbox%';")
      if ($TableCount -le 0) { throw "$ServiceId has no durable outbox table after migrations." }
      $Evidence.outbox[$ServiceId] = [ordered]@{ outboxTables = $TableCount; state = "PASS" }
    }

    Invoke-Compose -Arguments @("--profile", "observability", "up", "-d", "jaeger") -Observability
    for ($Attempt = 1; $Attempt -le 30; $Attempt++) {
      try {
        Invoke-WebRequest -Uri "http://127.0.0.1:16686" -TimeoutSec 5 -UseBasicParsing | Out-Null
        $Evidence.observability = [ordered]@{ state = "PASS"; jaeger = "http://127.0.0.1:16686"; attempts = $Attempt }
        break
      } catch {
        if ($Attempt -eq 30) { throw "Observability runtime did not become healthy." }
        Start-Sleep -Seconds 2
      }
    }
  }

  if ($Mode -eq "Full") {
    if (-not $ForceDisasterRecovery) { throw "Full mode requires -ForceDisasterRecovery because the governed drill intentionally mutates and restores runtime data." }
    if ($Posture -ne "Local") { throw "Automated JRN-042 disaster-recovery drill is restricted to an isolated Local runtime." }

    & pwsh -NoProfile -ExecutionPolicy Bypass -File $DisasterRecoveryCommand -EnvFile $EnvPath
    if ($LASTEXITCODE -ne 0) { throw "Six-database and MinIO disaster-recovery drill failed." }
    $Evidence.disasterRecovery = [ordered]@{
      state = "PASS"
      command = $DisasterRecoveryCommand
      consistencyMode = "Quiesced"
      databases = 6
      minio = true
    }
  }

  Save-Evidence -State "PASS"
  Write-Host "JRN-042 runtime, data, migrations and backup verification: PASS"
  Write-Host "Evidence: $EvidencePath"
} catch {
  Save-Evidence -State "FAIL" -Failure $_.Exception.Message
  throw
} finally {
  if ($Cleanup -and $Mode -ne "Static") {
    try { Invoke-Compose -Arguments @("--profile", "observability", "down", "--remove-orphans") -Observability } catch { Write-Warning $_ }
    try { Invoke-Compose -Arguments @($Profiles + @("down", "--remove-orphans")) } catch { Write-Warning $_ }
  }
}
