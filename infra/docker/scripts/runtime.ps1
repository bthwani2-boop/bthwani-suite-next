<#
.SYNOPSIS
  Canonical Docker runtime orchestrator for bthwani-suite-next.

.DESCRIPTION
  Owns lifecycle, readiness, local-only bootstrap, smoke, and diagnostics.
  Database migrations, SQL seeds, and MinIO policy creation are delegated to
  their canonical governed implementations; this file does not reimplement them.
#>

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("up", "down", "reset", "status", "logs", "migrate", "seed", "smoke", "doctor", "all", "bootstrap-dev", "verify-catalog")]
  [string]$Action,

  [string]$Profiles = "",
  [string]$Service = "",
  [switch]$Force
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "../../../tools/dev/local-actors.ps1")

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "../../../")).Path
Set-Location -LiteralPath $RepoRoot

$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$FinancialComposeFile = Join-Path $RepoRoot "infra/docker/compose.financial-simulators.yml"
$ObservabilityComposeFile = Join-Path $RepoRoot "infra/docker/compose.observability.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$GovernedMigrationScript = Join-Path $RepoRoot "infra/docker/scripts/invoke-runtime-database-migrations.ps1"
$GovernedSeedScript = Join-Path $RepoRoot "infra/docker/scripts/invoke-runtime-database-seeds.ps1"

foreach ($requiredFile in @($ComposeFile, $EnvFile, $GovernedMigrationScript, $GovernedSeedScript)) {
  if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
    throw "Required runtime authority not found: $requiredFile"
  }
}

Get-Content -LiteralPath $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
    $parts = $line.Split("=", 2)
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
      $value = $value.Substring(1, $value.Length - 2)
    } elseif ($value.StartsWith("'") -and $value.EndsWith("'")) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    if (-not (Get-Item -Path "Env:$key" -ErrorAction SilentlyContinue)) {
      [System.Environment]::SetEnvironmentVariable($key, $value)
    }
  }
}

$ProfileList = @()
if (-not [string]::IsNullOrWhiteSpace($Profiles)) {
  $ProfileList = @($Profiles.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}
if ($ProfileList.Count -eq 0 -and @("up", "reset", "smoke", "all").Contains($Action)) {
  $ProfileList = @("identity", "dsh", "media")
}

$AllowedProfiles = @(
  "identity", "workforce", "dsh", "media", "wlt", "financial-simulators",
  "mail", "cache", "observability", "platform", "providers"
)
foreach ($profile in $ProfileList) {
  if ($AllowedProfiles -notcontains $profile) {
    throw "Unsupported profile '$profile'. Allowed: $($AllowedProfiles -join ', ')"
  }
}
if (($ProfileList -contains "dsh" -or $ProfileList -contains "workforce" -or
     $ProfileList -contains "wlt" -or $ProfileList -contains "platform" -or
     $ProfileList -contains "providers") -and $ProfileList -notcontains "identity") {
  $ProfileList = @("identity") + $ProfileList
}
$ProfileList = @($ProfileList | Select-Object -Unique)

function Get-ComposeProfileArgs {
  $arguments = @()
  foreach ($profile in $script:ProfileList) {
    $arguments += @("--profile", $profile)
  }
  return $arguments
}

function Get-ComposeBase {
  $arguments = @("--env-file", $script:EnvFile, "-f", $script:ComposeFile)
  if ($script:ProfileList | Where-Object { @("financial-simulators", "mail", "cache") -contains $_ }) {
    if (-not (Test-Path -LiteralPath $script:FinancialComposeFile -PathType Leaf)) {
      throw "Financial simulator compose file not found: $script:FinancialComposeFile"
    }
    $arguments += @("-f", $script:FinancialComposeFile)
  }
  if ($script:ProfileList -contains "observability") {
    if (-not (Test-Path -LiteralPath $script:ObservabilityComposeFile -PathType Leaf)) {
      throw "Observability compose file not found: $script:ObservabilityComposeFile"
    }
    $arguments += @("-f", $script:ObservabilityComposeFile)
  }
  return $arguments
}

function Invoke-Compose {
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) @args
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose failed: $($args -join ' ') (exit $LASTEXITCODE)"
  }
}

function Get-SelectedMigrationServices {
  $services = @()
  if ($script:ProfileList -contains "identity") { $services += "identity" }
  if ($script:ProfileList -contains "workforce") { $services += "workforce" }
  if ($script:ProfileList -contains "wlt") { $services += "wlt" }
  if ($script:ProfileList -contains "dsh") { $services += "dsh" }
  if ($script:ProfileList -contains "providers") { $services += "providers" }
  if ($script:ProfileList -contains "platform") { $services += "platform-control" }
  if ($services.Count -eq 0 -and @("migrate", "seed").Contains($Action)) {
    $services += "dsh"
  }
  return @($services | Select-Object -Unique)
}

function Get-SelectedSeedServices {
  $services = @()
  if ($script:ProfileList -contains "dsh") { $services += "dsh" }
  if ($script:ProfileList -contains "wlt") { $services += "wlt" }
  if ($services.Count -eq 0 -and $Action -eq "seed") { $services += "dsh" }
  return @($services | Select-Object -Unique)
}

function Get-RequiredDatabaseNames {
  $databases = @()
  foreach ($serviceName in Get-SelectedMigrationServices) {
    switch ($serviceName) {
      "identity" { $databases += "identity_runtime" }
      "workforce" { $databases += "workforce_runtime" }
      "dsh" { $databases += "dsh_runtime" }
      "wlt" { $databases += "wlt_runtime" }
      "providers" { $databases += "providers_runtime" }
      "platform-control" { $databases += "platform_control_runtime" }
    }
  }
  return @($databases | Select-Object -Unique)
}

function Test-RuntimeDefaultSecrets {
  $defaults = @(
    @{ Name = "BTHWANI_MINIO_ROOT_PASSWORD"; Value = if ($env:BTHWANI_MINIO_ROOT_PASSWORD) { $env:BTHWANI_MINIO_ROOT_PASSWORD } else { "bthwani_minio_password" }; Default = "bthwani_minio_password" },
    @{ Name = "BTHWANI_POSTGRES_PASSWORD"; Value = if ($env:BTHWANI_POSTGRES_PASSWORD) { $env:BTHWANI_POSTGRES_PASSWORD } else { "bthwani_runtime_password" }; Default = "bthwani_runtime_password" },
    @{ Name = "IDENTITY_LOCAL_BOOTSTRAP_PASSWORD"; Value = Get-LocalPassword; Default = Get-LocalPasswordDefault }
  )
  $weak = @($defaults | Where-Object { $_.Value -eq $_.Default })
  foreach ($item in $weak) {
    Write-Warning "Runtime default secret in use: $($item.Name). Override it outside local-only development."
  }
  if ($env:BTHWANI_REQUIRE_STRONG_SECRETS -eq "true" -and $weak.Count -gt 0) {
    throw "Strong secrets are required but defaults remain: $($weak.Name -join ', ')"
  }
}

function Write-RuntimeDoctor {
  param([string]$Reason = "runtime doctor", [string]$TargetService = "")

  Write-Host "`n=== runtime:doctor ==="
  Write-Host "reason: $Reason"
  Write-Host "profiles: $($script:ProfileList -join ',')"
  Write-Host "compose_file: $script:ComposeFile"
  Write-Host "`n--- docker compose ps ---"
  Invoke-Compose ps
  Write-Host "`n--- docker ps ---"
  docker ps --format "table {{.Names}}`t{{.Image}}`t{{.Status}}`t{{.Ports}}"

  $logServices = if ([string]::IsNullOrWhiteSpace($TargetService)) {
    @("identity-api", "workforce-api", "dsh-api", "wlt-api", "providers-api", "platform-control-api", "postgres", "minio")
  } else {
    @($TargetService)
  }
  foreach ($logService in $logServices) {
    Write-Host "`n--- last 80 log lines: $logService ---"
    docker compose @(Get-ComposeBase) logs --tail=80 $logService 2>$null
  }
}

function Wait-ForPostgres {
  $requiredDatabases = Get-RequiredDatabaseNames
  if ($requiredDatabases.Count -eq 0) {
    Write-Host "Postgres readiness skipped: no selected database-backed service."
    return
  }

  for ($attempt = 1; $attempt -le 30; $attempt++) {
    Write-Host "Waiting for Postgres ($attempt/30)..."
    docker compose @(Get-ComposeBase) exec -T postgres pg_isready -U bthwani_runtime -d bthwani_runtime 2>$null
    if ($LASTEXITCODE -eq 0) {
      $missing = @()
      foreach ($database in $requiredDatabases) {
        $result = docker compose @(Get-ComposeBase) exec -T postgres psql `
          -U bthwani_runtime -d bthwani_runtime -tAc "SELECT 1 FROM pg_database WHERE datname = '$database';" 2>$null
        if ($LASTEXITCODE -ne 0 -or (($result -join "").Trim()) -ne "1") {
          $missing += $database
        }
      }
      if ($missing.Count -eq 0) {
        Start-Sleep -Seconds 2
        Write-Host "Postgres: healthy"
        return
      }
      Write-Host "Postgres is ready but missing database(s): $($missing -join ', ')"
    }
    Start-Sleep -Seconds 3
  }

  Write-RuntimeDoctor -Reason "Postgres readiness failed" -TargetService "postgres"
  throw "Postgres readiness failed for: $($requiredDatabases -join ', ')"
}

function Wait-ForHttpStatus {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Url,
    [string[]]$HealthyValues = @("healthy", "HEALTHY", "ready")
  )

  for ($attempt = 1; $attempt -le 20; $attempt++) {
    Write-Host "Waiting for $Name ($attempt/20)..."
    try {
      $body = Invoke-RestMethod $Url -TimeoutSec 5 -ErrorAction Stop
      if ($HealthyValues -contains [string]$body.status) {
        Write-Host "${Name}: $($body.status)"
        return $body
      }
    } catch { }
    Start-Sleep -Seconds 4
  }

  Write-RuntimeDoctor -Reason "$Name readiness failed"
  throw "$Name did not become healthy: $Url"
}

function Wait-ForMinIO {
  $port = if ($env:BTHWANI_MINIO_API_PORT) { $env:BTHWANI_MINIO_API_PORT } else { "59000" }
  $baseUrl = "http://localhost:$port"
  for ($attempt = 1; $attempt -le 15; $attempt++) {
    Write-Host "Waiting for MinIO ($attempt/15)..."
    try {
      Invoke-RestMethod "$baseUrl/minio/health/live" -TimeoutSec 5 -ErrorAction Stop | Out-Null
      Invoke-RestMethod "$baseUrl/minio/health/ready" -TimeoutSec 5 -ErrorAction Stop | Out-Null
      Write-Host "MinIO: healthy"
      return
    } catch { }
    Start-Sleep -Seconds 3
  }

  Write-RuntimeDoctor -Reason "MinIO readiness failed" -TargetService "minio"
  throw "MinIO did not become healthy"
}

function Invoke-GovernedMinioInit {
  Write-Host "`n--- Applying canonical MinIO initialization service ---"
  Invoke-Compose run --rm --no-deps minio-init
  Write-Host "MinIO initialization: PASS"
}

function Get-SourceCommitSha {
  $sha = (& git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($sha)) {
    throw "Unable to resolve source commit SHA."
  }
  return $sha
}

function Invoke-GovernedMigrations {
  $sourceCommitSha = Get-SourceCommitSha
  foreach ($serviceName in Get-SelectedMigrationServices) {
    Write-Host "`n--- Applying governed $serviceName migrations ---"
    & $script:GovernedMigrationScript -Service $serviceName -SourceCommitSha $sourceCommitSha
    if ($LASTEXITCODE -ne 0) {
      throw "Governed runtime migrations failed for $serviceName (exit $LASTEXITCODE)"
    }
  }
}

function Invoke-GovernedSeeds {
  if ($env:NODE_ENV -eq "production") {
    throw "Local runtime seeds are forbidden when NODE_ENV=production."
  }
  $sourceCommitSha = Get-SourceCommitSha
  foreach ($serviceName in Get-SelectedSeedServices) {
    Write-Host "`n--- Applying governed $serviceName local seeds ---"
    & $script:GovernedSeedScript `
      -Service $serviceName `
      -SourceCommitSha $sourceCommitSha `
      -AllowLocalSeeds
    if ($LASTEXITCODE -ne 0) {
      throw "Governed runtime seeds failed for $serviceName (exit $LASTEXITCODE)"
    }
  }
}

function Invoke-DshMediaSeed {
  if (-not ($ProfileList -contains "dsh" -or $ProfileList -contains "media")) { return }

  $mediaDirectoryPath = Join-Path $RepoRoot "services/dsh/database/seeds/local/media"
  $manifestPath = Join-Path $mediaDirectoryPath "media-manifest.json"
  if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "DSH media seed manifest not found: $manifestPath"
  }

  $manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
  $expectedFiles = @($manifest.media | Select-Object -ExpandProperty relativeSourcePath)
  if ($expectedFiles.Count -eq 0) {
    throw "DSH media seed manifest has no media entries."
  }
  foreach ($relativePath in $expectedFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $mediaDirectoryPath $relativePath) -PathType Leaf)) {
      throw "DSH media seed missing expected file: $relativePath"
    }
  }

  $rootUser = if ($env:BTHWANI_MINIO_ROOT_USER) { $env:BTHWANI_MINIO_ROOT_USER } else { "bthwani_minio" }
  $rootPassword = if ($env:BTHWANI_MINIO_ROOT_PASSWORD) { $env:BTHWANI_MINIO_ROOT_PASSWORD } else { "bthwani_minio_password" }
  Write-Host "`n--- Applying governed DSH media fixtures ---"
  docker run --rm --network bthwani-runtime --volume "${mediaDirectoryPath}:/seed:ro" `
    --entrypoint /bin/sh minio/mc:RELEASE.2025-08-13T08-35-41Z `
    -c "mc alias set local http://minio:9000 '$rootUser' '$rootPassword' && mc cp --recursive /seed/ local/dsh-media/"
  if ($LASTEXITCODE -ne 0) {
    throw "DSH media seed failed (exit $LASTEXITCODE)"
  }
  Write-Host "DSH media seed: PASS ($($expectedFiles.Count) governed objects)"
}

function Wait-ForSelectedApis {
  if ($ProfileList -contains "identity") {
    Wait-ForHttpStatus -Name "Identity API" -Url "http://localhost:58082/identity/readiness" -HealthyValues @("HEALTHY") | Out-Null
  }
  if ($ProfileList -contains "workforce") {
    Wait-ForHttpStatus -Name "Workforce API" -Url "http://localhost:58086/workforce/readiness" -HealthyValues @("ready") | Out-Null
  }
  if ($ProfileList -contains "providers") {
    Wait-ForHttpStatus -Name "Providers API" -Url "http://localhost:58087/providers/readiness" -HealthyValues @("ready") | Out-Null
  }
  if ($ProfileList -contains "platform") {
    Wait-ForHttpStatus -Name "Platform Control API" -Url "http://localhost:58088/platform/readiness" -HealthyValues @("ready") | Out-Null
  }
  if ($ProfileList -contains "wlt") {
    Wait-ForHttpStatus -Name "WLT API" -Url "http://localhost:58083/wlt/readiness" -HealthyValues @("ready") | Out-Null
  }
  if ($ProfileList -contains "dsh") {
    Wait-ForHttpStatus -Name "DSH API" -Url "http://localhost:58080/dsh/readiness" -HealthyValues @("ready") | Out-Null
  }
  if ($ProfileList -contains "financial-simulators") {
    Invoke-RestMethod "http://localhost:58090/__admin/mappings" -TimeoutSec 10 -ErrorAction Stop | Out-Null
    Write-Host "WireMock financial provider: healthy"
  }
  if ($ProfileList -contains "mail") {
    Invoke-RestMethod "http://localhost:8025/api/v1/info" -TimeoutSec 10 -ErrorAction Stop | Out-Null
    Write-Host "Mailpit: healthy"
  }
  if ($ProfileList -contains "cache") {
    docker compose @(Get-ComposeBase) exec -T valkey valkey-cli ping
    if ($LASTEXITCODE -ne 0) { throw "Valkey readiness failed" }
  }
  if ($ProfileList -contains "media" -or $ProfileList -contains "dsh") {
    Wait-ForMinIO
  }
}

function Invoke-SelectedSmoke {
  Write-Host "`n--- Runtime smoke ---"
  Wait-ForSelectedApis

  if ($ProfileList -contains "dsh") {
    $stores = Invoke-RestMethod "http://localhost:58080/dsh/stores?limit=1&offset=0" -TimeoutSec 10 -ErrorAction Stop
    if ($null -eq $stores.stores) {
      throw "/dsh/stores response is missing the stores field"
    }
    Write-Host "DSH stores smoke: PASS count=$($stores.stores.Count)"
  }
  Write-Host "smoke: PASS"
}

Test-RuntimeDefaultSecrets

switch ($Action) {
  "up" {
    Write-Host "=== runtime:up (profiles: $($ProfileList -join ','))"
    docker info | Out-Null
    Invoke-Compose up -d postgres
    Wait-ForPostgres
    if ($ProfileList -contains "media" -or $ProfileList -contains "dsh") {
      Invoke-Compose up -d minio
      Wait-ForMinIO
      Invoke-GovernedMinioInit
    }
    Invoke-GovernedMigrations
    Invoke-Compose up -d
    Wait-ForSelectedApis
    Write-Host "runtime:up: PASS"
  }

  "down" {
    Write-Host "=== runtime:down"
    Invoke-Compose down --remove-orphans
  }

  "reset" {
    if (-not $Force) { throw "runtime reset is destructive. Provide -Force to proceed." }
    Write-Host "=== runtime:reset (profiles: $($ProfileList -join ','))"
    docker info | Out-Null
    Invoke-Compose down -v --remove-orphans
    Invoke-Compose up -d postgres
    Wait-ForPostgres
    if ($ProfileList -contains "media" -or $ProfileList -contains "dsh") {
      Invoke-Compose up -d minio
      Wait-ForMinIO
      Invoke-GovernedMinioInit
      Invoke-DshMediaSeed
    }
    Invoke-GovernedMigrations
    Invoke-GovernedSeeds
    Invoke-Compose up -d
    Invoke-SelectedSmoke
    Write-Host "reset: PASS"
  }

  "bootstrap-dev" {
    if ($env:NODE_ENV -eq "production") { throw "bootstrap-dev is not allowed in production." }
    if (-not $Force) { throw "bootstrap-dev requires -Force." }
    Write-Host "=== runtime:bootstrap-dev (profiles: $($ProfileList -join ','))"
    if ($ProfileList -contains "dsh") {
      Wait-ForMinIO
      Invoke-GovernedMinioInit
      Invoke-DshMediaSeed
      Wait-ForHttpStatus -Name "DSH API" -Url "http://localhost:58080/dsh/readiness" -HealthyValues @("ready") | Out-Null
      node tools/scripts/mobile-dev-data.mjs --repair
      if ($LASTEXITCODE -ne 0) {
        throw "DSH API dev bootstrap failed (exit $LASTEXITCODE)"
      }
    } else {
      Write-Host "DSH profile is not active. Bootstrap skipped."
    }
  }

  "verify-catalog" {
    Write-Host "=== runtime:verify-catalog"
    & (Join-Path $RepoRoot "tools/scripts/verify-catalog.ps1")
    if ($LASTEXITCODE -ne 0) { throw "verify-catalog failed (exit $LASTEXITCODE)" }
    Write-Host "verify-catalog: PASS"
  }

  "status" {
    Write-Host "=== runtime:status"
    Invoke-Compose ps
    Write-Host "`n--- docker ps ---"
    docker ps --format "table {{.Names}}`t{{.Image}}`t{{.Status}}`t{{.Ports}}"
  }

  "logs" {
    Write-Host "=== runtime:logs"
    if ([string]::IsNullOrWhiteSpace($Service)) {
      Invoke-Compose logs --tail=100
    } else {
      Invoke-Compose logs --tail=100 $Service
    }
  }

  "doctor" {
    Write-RuntimeDoctor -Reason "manual doctor action" -TargetService $Service
  }

  "migrate" {
    Write-Host "=== runtime:migrate"
    Invoke-Compose up -d postgres
    Wait-ForPostgres
    Invoke-GovernedMigrations
    Write-Host "runtime:migrate: PASS"
  }

  "seed" {
    Write-Host "=== runtime:seed"
    Invoke-Compose up -d postgres
    Wait-ForPostgres
    Invoke-GovernedMigrations
    Invoke-GovernedSeeds
    Write-Host "runtime:seed: PASS"
  }

  "smoke" {
    Write-Host "=== runtime:smoke (profiles: $($ProfileList -join ','))"
    if ((Get-RequiredDatabaseNames).Count -gt 0) {
      Invoke-Compose up -d postgres
      Wait-ForPostgres
      Invoke-GovernedMigrations
    }
    if ($ProfileList -contains "media" -or $ProfileList -contains "dsh") {
      Invoke-Compose up -d minio
      Wait-ForMinIO
      Invoke-GovernedMinioInit
    }
    Invoke-Compose up -d
    Invoke-SelectedSmoke
  }

  "all" {
    Write-Host "=== runtime:all (profiles: $($ProfileList -join ','))"
    docker info | Out-Null
    Invoke-Compose down -v --remove-orphans
    Write-Host "down: OK"
    Invoke-Compose up -d --build postgres
    Wait-ForPostgres
    if ($ProfileList -contains "media" -or $ProfileList -contains "dsh") {
      Invoke-Compose up -d --build minio
      Wait-ForMinIO
      Invoke-GovernedMinioInit
      Invoke-DshMediaSeed
    }
    Invoke-GovernedMigrations
    Invoke-GovernedSeeds
    Invoke-Compose up -d --build
    Invoke-SelectedSmoke
    Write-Host "`nruntime:all: PASS"
  }
}
