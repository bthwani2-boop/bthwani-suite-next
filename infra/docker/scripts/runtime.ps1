<#
.SYNOPSIS
  Central Docker Runtime Orchestrator for bthwani-suite-next.

.DESCRIPTION
  Runtime orchestration owns container lifecycle, readiness checks, smoke checks,
  local-only seed/bootstrap actions, and diagnostics. It does not own a database
  migration engine or a service-specific migration ledger. All service migrations
  are delegated to infra/docker/scripts/invoke-runtime-database-migrations.ps1,
  which delegates to schema-migration-runner.ps1 and schema_migrations.
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

if (-not (Test-Path -LiteralPath $ComposeFile -PathType Leaf)) { throw "Compose file not found: $ComposeFile" }
if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) { throw "Env file not found: $EnvFile" }
if (-not (Test-Path -LiteralPath $GovernedMigrationScript -PathType Leaf)) { throw "Governed migration runner not found: $GovernedMigrationScript" }

Get-Content -LiteralPath $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
    $parts = $line.Split("=", 2)
    $key = $parts[0].Trim()
    $val = $parts[1].Trim()
    if ($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length - 2) }
    elseif ($val.StartsWith("'") -and $val.EndsWith("'")) { $val = $val.Substring(1, $val.Length - 2) }
    if (-not (Get-Item -Path "Env:$key" -ErrorAction SilentlyContinue)) {
      [System.Environment]::SetEnvironmentVariable($key, $val)
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

$AllowedProfiles = @("identity", "workforce", "dsh", "media", "wlt", "financial-simulators", "mail", "cache", "observability", "platform", "providers")
foreach ($p in $ProfileList) {
  if ($AllowedProfiles -notcontains $p) {
    throw "Unsupported profile: '$p'. Allowed: $($AllowedProfiles -join ', ')"
  }
}
if ($ProfileList -contains "dsh" -and $ProfileList -notcontains "identity") {
  $ProfileList = @("identity") + $ProfileList
}
if ($ProfileList -contains "workforce" -and $ProfileList -notcontains "identity") {
  $ProfileList = @("identity") + $ProfileList
}
$ProfileList = @($ProfileList | Select-Object -Unique)

function Get-ComposeProfileArgs {
  $flags = @()
  foreach ($p in $script:ProfileList) { $flags += @("--profile", $p) }
  return $flags
}

function Get-ComposeBase {
  $files = @("--env-file", $script:EnvFile, "-f", $script:ComposeFile)
  if ($script:ProfileList | Where-Object { @("financial-simulators", "mail", "cache") -contains $_ }) {
    if (-not (Test-Path -LiteralPath $script:FinancialComposeFile -PathType Leaf)) { throw "Financial simulator compose file not found: $script:FinancialComposeFile" }
    $files += @("-f", $script:FinancialComposeFile)
  }
  if ($script:ProfileList -contains "observability") {
    if (-not (Test-Path -LiteralPath $script:ObservabilityComposeFile -PathType Leaf)) { throw "Observability compose file not found: $script:ObservabilityComposeFile" }
    $files += @("-f", $script:ObservabilityComposeFile)
  }
  return $files
}

function Get-SelectedMigrationServices {
  $services = @()
  if ($script:ProfileList -contains "identity") { $services += "identity" }
  if ($script:ProfileList -contains "workforce") { $services += "workforce" }
  if ($script:ProfileList -contains "wlt") { $services += "wlt" }
  if ($script:ProfileList -contains "dsh") { $services += "dsh" }
  if ($script:ProfileList -contains "providers") { $services += "providers" }
  if ($script:ProfileList -contains "platform") { $services += "platform-control" }
  if ($services.Count -eq 0 -and $Action -eq "migrate") { $services += "dsh" }
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
  $weak = $defaults | Where-Object { $_.Value -eq $_.Default }
  foreach ($item in $weak) {
    Write-Warning "Runtime default secret in use: $($item.Name). Override it outside local-only development."
  }
  if ($env:BTHWANI_REQUIRE_STRONG_SECRETS -eq "true" -and $weak.Count -gt 0) {
    throw "BTHWANI_REQUIRE_STRONG_SECRETS=true and default runtime secrets are still configured: $($weak.Name -join ', ')"
  }
}

function Invoke-Compose {
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) @args
  if ($LASTEXITCODE -ne 0) { throw "docker compose failed: $($args -join ' ') (exit $LASTEXITCODE)" }
}

function Write-RuntimeDoctor {
  param([string]$Reason = "runtime doctor", [string]$Service = "")
  Write-Host "`n=== runtime:doctor ==="
  Write-Host "reason: $Reason"
  Write-Host "profiles: $($script:ProfileList -join ',')"
  Write-Host "compose_file: $script:ComposeFile"
  Write-Host "`n--- docker compose ps ---"
  Invoke-Compose ps
  Write-Host "`n--- docker ps ---"
  docker ps --format "table {{.Names}}`t{{.Image}}`t{{.Status}}`t{{.Ports}}"
  $logServices = @()
  if (-not [string]::IsNullOrWhiteSpace($Service)) { $logServices += $Service }
  else {
    foreach ($candidate in @("identity-api", "workforce-api", "dsh-api", "wlt-api", "providers-api", "platform-control-api", "postgres", "minio", "wiremock-financial-provider", "mailpit", "valkey")) {
      $logServices += $candidate
    }
  }
  foreach ($logService in ($logServices | Select-Object -Unique)) {
    Write-Host "`n--- last 80 log lines: $logService ---"
    docker compose @(Get-ComposeBase) logs --tail=80 $logService 2>$null
  }
}

function Wait-ForPostgres {
  $requiredDatabases = Get-RequiredDatabaseNames
  if ($requiredDatabases.Count -eq 0) {
    Write-Host "Postgres health skipped: no selected profile requires Postgres."
    return
  }
  for ($i = 1; $i -le 30; $i++) {
    Write-Host "Waiting for Postgres ($i/30)..."
    docker compose @(Get-ComposeBase) exec -T postgres pg_isready -U bthwani_runtime -d bthwani_runtime 2>$null
    if ($LASTEXITCODE -eq 0) {
      $missing = @()
      foreach ($db in $requiredDatabases) {
        $sql = "SELECT 1 FROM pg_database WHERE datname = '$db';"
        $result = docker compose @(Get-ComposeBase) exec -T postgres psql -U bthwani_runtime -d bthwani_runtime -tAc $sql 2>$null
        if ($LASTEXITCODE -ne 0 -or (($result -join '').Trim()) -ne "1") { $missing += $db }
      }
      if ($missing.Count -eq 0) {
        Start-Sleep -Seconds 2
        Write-Host "Postgres: healthy"
        return
      }
      Write-Host "Postgres is up but missing DB(s): $($missing -join ', ')"
    }
    Start-Sleep -Seconds 3
  }
  Write-RuntimeDoctor -Reason "Postgres health failed" -Service "postgres"
  throw "Postgres health failed for expected databases: $($requiredDatabases -join ', ')"
}

function Wait-ForHttpStatus {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Url,
    [string[]]$HealthyValues = @("healthy", "HEALTHY", "ready")
  )
  for ($i = 1; $i -le 20; $i++) {
    Write-Host "Waiting for $Name ($i/20)..."
    try {
      $body = Invoke-RestMethod $Url -TimeoutSec 5 -ErrorAction Stop
      if ($HealthyValues -contains [string]$body.status) {
        Write-Host "$Name: $($body.status)"
        return $body
      }
    } catch { }
    Start-Sleep -Seconds 4
  }
  Write-RuntimeDoctor -Reason "$Name readiness failed"
  throw "$Name did not become healthy: $Url"
}

function Wait-ForMinIO {
  $minioPort = if ($env:BTHWANI_MINIO_API_PORT) { $env:BTHWANI_MINIO_API_PORT } else { "59000" }
  $minioUrl = "http://localhost:$minioPort"
  for ($i = 1; $i -le 15; $i++) {
    Write-Host "Waiting for MinIO ($i/15)..."
    try {
      Invoke-RestMethod "$minioUrl/minio/health/live" -TimeoutSec 5 -ErrorAction Stop | Out-Null
      Invoke-RestMethod "$minioUrl/minio/health/ready" -TimeoutSec 5 -ErrorAction Stop | Out-Null
      Write-Host "MinIO: healthy"
      return
    } catch { }
    Start-Sleep -Seconds 3
  }
  Write-RuntimeDoctor -Reason "MinIO health failed" -Service "minio"
  throw "MinIO did not become healthy"
}

function Invoke-MinioInit {
  Write-Host "`n--- Initializing MinIO dsh-media bucket and service user ---"
  $rootUser = if ([string]::IsNullOrWhiteSpace($env:BTHWANI_MINIO_ROOT_USER)) { "bthwani_minio" } else { $env:BTHWANI_MINIO_ROOT_USER }
  $rootPassword = if ([string]::IsNullOrWhiteSpace($env:BTHWANI_MINIO_ROOT_PASSWORD)) { "bthwani_minio_password" } else { $env:BTHWANI_MINIO_ROOT_PASSWORD }
  $dshAccessKey = if ([string]::IsNullOrWhiteSpace($env:BTHWANI_MINIO_DSH_ACCESS_KEY)) { "dsh_media_local" } else { $env:BTHWANI_MINIO_DSH_ACCESS_KEY }
  $dshSecretKey = if ([string]::IsNullOrWhiteSpace($env:BTHWANI_MINIO_DSH_SECRET_KEY)) { "dsh_media_local_secret" } else { $env:BTHWANI_MINIO_DSH_SECRET_KEY }
  $policyJson = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:ListBucket","s3:GetBucketLocation"],"Resource":["arn:aws:s3:::dsh-media","arn:aws:s3:::dsh-media/*"]}]}'
  docker run --rm --network bthwani-runtime `
    --entrypoint /bin/sh minio/mc:RELEASE.2025-08-13T08-35-41Z `
    -c "mc alias set local http://minio:9000 '$rootUser' '$rootPassword' && mc mb --ignore-existing local/dsh-media && mc anonymous set none local/dsh-media && printf '%s' '$policyJson' > /tmp/dsh-media-rw.json && mc admin user add local '$dshAccessKey' '$dshSecretKey' || true && mc admin policy create local dsh-media-rw /tmp/dsh-media-rw.json || true && mc admin policy attach local dsh-media-rw --user '$dshAccessKey'"
  if ($LASTEXITCODE -ne 0) { throw "MinIO init failed (exit $LASTEXITCODE)" }
  Write-Host "MinIO init: PASS"
}

function Invoke-GovernedMigrations {
  $sourceCommitSha = (& git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($sourceCommitSha)) { throw "Unable to resolve source commit SHA." }
  foreach ($serviceName in Get-SelectedMigrationServices) {
    Write-Host "`n--- Applying governed $serviceName migrations ---"
    & $script:GovernedMigrationScript -Service $serviceName -SourceCommitSha $sourceCommitSha
    if ($LASTEXITCODE -ne 0) { throw "Governed runtime migrations failed for $serviceName (exit $LASTEXITCODE)" }
  }
}

function Invoke-SqlSeedDirectory {
  param(
    [Parameter(Mandatory = $true)][string]$Directory,
    [Parameter(Mandatory = $true)][string]$User,
    [Parameter(Mandatory = $true)][string]$Database,
    [Parameter(Mandatory = $true)][string]$Label
  )
  if (-not (Test-Path -LiteralPath $Directory -PathType Container)) {
    Write-Host "$Label seed skipped: directory not found: $Directory"
    return
  }
  $seedFiles = @(Get-ChildItem -LiteralPath $Directory -Filter "*.sql" -File | Sort-Object Name)
  if ($seedFiles.Count -eq 0) {
    Write-Host "$Label seed skipped: no SQL files."
    return
  }
  Write-Host "`n--- Applying $Label local seeds ---"
  foreach ($file in $seedFiles) {
    Write-Host "  Seeding: $($file.Name)"
    Get-Content -LiteralPath $file.FullName -Raw |
      docker compose @(Get-ComposeBase) exec -T postgres psql -U $User -d $Database -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "$Label seed failed for $($file.Name) (exit $LASTEXITCODE)" }
  }
  Write-Host "$Label seed: PASS"
}

function Invoke-SelectedSeeds {
  if ($ProfileList -contains "dsh") {
    Invoke-SqlSeedDirectory -Directory "services/dsh/database/seeds/local" -User "dsh_runtime" -Database "dsh_runtime" -Label "DSH"
  }
  if ($ProfileList -contains "wlt") {
    Invoke-SqlSeedDirectory -Directory "services/wlt/database/seeds/local" -User "wlt_runtime" -Database "wlt_runtime" -Label "WLT"
  }
}

function Invoke-DshMediaSeed {
  if (-not ($ProfileList -contains "dsh" -or $ProfileList -contains "media")) { return }
  $mediaDirectoryPath = "services/dsh/database/seeds/local/media"
  $manifestPath = Join-Path $mediaDirectoryPath "media-manifest.json"
  if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    Write-Host "DSH media seed skipped: manifest not found."
    return
  }
  Write-Host "`n--- Applying Store Discovery MinIO media seed ---"
  $manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
  $expectedFiles = @($manifest.media | Select-Object -ExpandProperty relativeSourcePath)
  $mediaDirectory = (Resolve-Path $mediaDirectoryPath).Path
  foreach ($file in $expectedFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $mediaDirectory $file) -PathType Leaf)) {
      throw "DSH media seed missing expected seed file: $file"
    }
  }
  $rootUser = if ([string]::IsNullOrWhiteSpace($env:BTHWANI_MINIO_ROOT_USER)) { "bthwani_minio" } else { $env:BTHWANI_MINIO_ROOT_USER }
  $rootPassword = if ([string]::IsNullOrWhiteSpace($env:BTHWANI_MINIO_ROOT_PASSWORD)) { "bthwani_minio_password" } else { $env:BTHWANI_MINIO_ROOT_PASSWORD }
  docker run --rm --network bthwani-runtime --volume "${mediaDirectory}:/seed:ro" `
    --entrypoint /bin/sh minio/mc:RELEASE.2025-08-13T08-35-41Z `
    -c "mc alias set local http://minio:9000 '$rootUser' '$rootPassword' && mc mb --ignore-existing local/dsh-media && mc cp --recursive /seed/ local/dsh-media/"
  if ($LASTEXITCODE -ne 0) { throw "DSH media seed failed (exit $LASTEXITCODE)" }
  Write-Host "DSH media seed: PASS ($($expectedFiles.Count) objects expected)"
}

function Start-SelectedContainers {
  Invoke-Compose up -d @args
}

function Wait-ForSelectedApis {
  if ($ProfileList -contains "identity") { Wait-ForHttpStatus -Name "Identity API" -Url "http://localhost:58082/identity/readiness" -HealthyValues @("HEALTHY") | Out-Null }
  if ($ProfileList -contains "workforce") { Wait-ForHttpStatus -Name "Workforce API" -Url "http://localhost:58086/workforce/health" -HealthyValues @("healthy") | Out-Null }
  if ($ProfileList -contains "wlt") { Wait-ForHttpStatus -Name "WLT API" -Url "http://localhost:58083/wlt/health" -HealthyValues @("healthy") | Out-Null }
  if ($ProfileList -contains "dsh") { Wait-ForHttpStatus -Name "DSH API" -Url "http://localhost:58080/dsh/health" -HealthyValues @("healthy") | Out-Null }
  if ($ProfileList -contains "financial-simulators") { Invoke-RestMethod "http://localhost:58090/__admin/mappings" -TimeoutSec 10 -ErrorAction Stop | Out-Null; Write-Host "WireMock financial provider: healthy" }
  if ($ProfileList -contains "mail") { Invoke-RestMethod "http://localhost:8025/api/v1/info" -TimeoutSec 10 -ErrorAction Stop | Out-Null; Write-Host "Mailpit: healthy" }
  if ($ProfileList -contains "cache") { docker compose @(Get-ComposeBase) exec -T valkey valkey-cli ping; if ($LASTEXITCODE -ne 0) { throw "Valkey smoke failed" } }
  if ($ProfileList -contains "media" -or $ProfileList -contains "dsh") { Wait-ForMinIO }
}

function Invoke-SelectedSmoke {
  Write-Host "`n--- Runtime smoke ---"
  if ($ProfileList -contains "identity") {
    Wait-ForHttpStatus -Name "Identity API" -Url "http://localhost:58082/identity/health" -HealthyValues @("HEALTHY") | Out-Null
  }
  if ($ProfileList -contains "workforce") {
    Wait-ForHttpStatus -Name "Workforce API" -Url "http://localhost:58086/workforce/readiness" -HealthyValues @("ready") | Out-Null
  }
  if ($ProfileList -contains "wlt") {
    Wait-ForHttpStatus -Name "WLT API" -Url "http://localhost:58083/wlt/readiness" -HealthyValues @("ready") | Out-Null
  }
  if ($ProfileList -contains "dsh") {
    Wait-ForHttpStatus -Name "DSH API" -Url "http://localhost:58080/dsh/readiness" -HealthyValues @("ready") | Out-Null
    $stores = Invoke-RestMethod "http://localhost:58080/dsh/stores?limit=1&offset=0" -TimeoutSec 10 -ErrorAction Stop
    if ($null -eq $stores.stores) { throw "/dsh/stores missing stores field" }
    Write-Host "DSH stores smoke: PASS count=$($stores.stores.Count)"
  }
  if ($ProfileList -contains "media" -or $ProfileList -contains "dsh") { Wait-ForMinIO }
  Write-Host "smoke: PASS"
}

Test-RuntimeDefaultSecrets

if ($Action -eq "up") {
  Write-Host "=== runtime:up (profiles: $($ProfileList -join ','))"
  docker info | Out-Null
  Start-SelectedContainers up -d postgres
  Wait-ForPostgres
  if ($ProfileList -contains "media" -or $ProfileList -contains "dsh") {
    Start-SelectedContainers up -d minio
    Wait-ForMinIO
    Invoke-MinioInit
  }
  Invoke-GovernedMigrations
  Start-SelectedContainers up -d
  Wait-ForSelectedApis
  Write-Host "runtime:up: PASS"
}
elseif ($Action -eq "down") {
  Write-Host "=== runtime:down"
  Invoke-Compose down --remove-orphans
}
elseif ($Action -eq "reset") {
  if (-not $Force) { throw "runtime reset is destructive. Provide -Force to proceed." }
  Write-Host "=== runtime:reset (profiles: $($ProfileList -join ','))"
  docker info | Out-Null
  Invoke-Compose down -v --remove-orphans
  Start-SelectedContainers up -d postgres
  Wait-ForPostgres
  if ($ProfileList -contains "media" -or $ProfileList -contains "dsh") {
    Start-SelectedContainers up -d minio
    Wait-ForMinIO
    Invoke-MinioInit
    Invoke-DshMediaSeed
  }
  Invoke-GovernedMigrations
  Invoke-SelectedSeeds
  Start-SelectedContainers up -d
  Wait-ForSelectedApis
  Invoke-SelectedSmoke
  Write-Host "reset: PASS"
}
elseif ($Action -eq "bootstrap-dev") {
  if ($env:NODE_ENV -eq "production") { throw "bootstrap-dev is not allowed in production." }
  if (-not $Force) { throw "bootstrap-dev requires -Force flag." }
  Write-Host "=== runtime:bootstrap-dev (profiles: $($ProfileList -join ','))"
  if ($ProfileList -contains "dsh") {
    Wait-ForMinIO
    Invoke-MinioInit
    Invoke-DshMediaSeed
    Wait-ForHttpStatus -Name "DSH API" -Url "http://localhost:58080/dsh/health" -HealthyValues @("healthy") | Out-Null
    node tools/scripts/mobile-dev-data.mjs --repair
    if ($LASTEXITCODE -ne 0) { throw "DSH API Dev Bootstrap failed (exit $LASTEXITCODE)" }
  } else {
    Write-Host "DSH profile is not active. Skipping bootstrap."
  }
}
elseif ($Action -eq "verify-catalog") {
  Write-Host "=== runtime:verify-catalog"
  pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/verify-catalog.ps1
  if ($LASTEXITCODE -ne 0) { throw "verify-catalog failed (exit $LASTEXITCODE)" }
  Write-Host "verify-catalog: PASS"
}
elseif ($Action -eq "status") {
  Write-Host "=== runtime:status"
  Invoke-Compose ps
  Write-Host "`n--- docker ps ---"
  docker ps --format "table {{.Names}}`t{{.Image}}`t{{.Status}}`t{{.Ports}}"
}
elseif ($Action -eq "logs") {
  Write-Host "=== runtime:logs"
  if (-not [string]::IsNullOrWhiteSpace($Service)) { docker compose @(Get-ComposeBase) logs --tail=100 $Service }
  else { docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) logs --tail=100 }
}
elseif ($Action -eq "doctor") {
  Write-RuntimeDoctor -Reason "manual doctor action" -Service $Service
}
elseif ($Action -eq "migrate") {
  Write-Host "=== runtime:migrate"
  Start-SelectedContainers up -d postgres
  Wait-ForPostgres
  Invoke-GovernedMigrations
  Write-Host "runtime:migrate: PASS"
}
elseif ($Action -eq "seed") {
  Write-Host "=== runtime:seed"
  Wait-ForPostgres
  Invoke-SelectedSeeds
  Write-Host "runtime:seed: PASS"
}
elseif ($Action -eq "smoke") {
  Write-Host "=== runtime:smoke (profiles: $($ProfileList -join ','))"
  if ((Get-RequiredDatabaseNames).Count -gt 0) {
    Start-SelectedContainers up -d postgres
    Wait-ForPostgres
    Invoke-GovernedMigrations
  }
  if ($ProfileList -contains "media" -or $ProfileList -contains "dsh") {
    Start-SelectedContainers up -d minio
    Wait-ForMinIO
    Invoke-MinioInit
  }
  Start-SelectedContainers up -d
  Wait-ForSelectedApis
  Invoke-SelectedSmoke
}
elseif ($Action -eq "all") {
  Write-Host "=== runtime:all (profiles: $($ProfileList -join ','))"
  docker info | Out-Null
  Invoke-Compose down -v --remove-orphans
  Write-Host "down: OK"
  Start-SelectedContainers up -d --build postgres
  Wait-ForPostgres
  if ($ProfileList -contains "media" -or $ProfileList -contains "dsh") {
    Start-SelectedContainers up -d --build minio
    Wait-ForMinIO
    Invoke-MinioInit
    Invoke-DshMediaSeed
  }
  Invoke-GovernedMigrations
  Invoke-SelectedSeeds
  Start-SelectedContainers up -d --build
  Wait-ForSelectedApis
  Invoke-SelectedSmoke
  Write-Host "`nruntime:all: PASS"
}
