<#
.SYNOPSIS
  Canonical Docker runtime orchestrator for bthwani-suite-next.

.DESCRIPTION
  Owns lifecycle, readiness, local-only bootstrap, smoke, and diagnostics.
  Database migrations, SQL seeds, MinIO storage, and the optional DSH local
  seed-media overlay are delegated to their canonical governed implementations.

  Logical media capabilities are intentionally split:
    media-storage = MinIO/runtime upload infrastructure only; clean-clone safe.
    media         = machine-local DSH seed-media overlay; implies MinIO storage
                    and fails closed unless every manifest asset exists locally.
#>

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("up", "down", "reset", "status", "logs", "migrate", "seed", "smoke", "doctor", "all", "bootstrap-dev", "verify-catalog", "ensure-db", "service-up", "service-stop")]
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
$DevBootstrapComposeFile = Join-Path $RepoRoot "infra/docker/compose.dev-bootstrap.yml"
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
if ($ProfileList.Count -eq 0 -and @("up", "reset", "smoke", "all", "bootstrap-dev").Contains($Action)) {
  $ProfileList = @("identity", "dsh")
}

$AllowedProfiles = @(
  "identity", "workforce", "dsh", "media", "media-storage", "wlt",
  "financial-simulators", "mail", "cache", "observability", "platform", "providers"
)
foreach ($profile in $ProfileList) {
  if ($AllowedProfiles -notcontains $profile) {
    throw "Unsupported profile '$profile'. Allowed: $($AllowedProfiles -join ', ')"
  }
}
if ($ProfileList -contains "media" -and $ProfileList -notcontains "dsh") {
  throw "The media profile is the DSH local seed-media overlay and requires the dsh profile."
}
if ($ProfileList -contains "media") {
  $MediaManifest = Join-Path $RepoRoot "services/dsh/database/seeds/media/local-media.manifest.json"
  if (-not (Test-Path -LiteralPath $MediaManifest -PathType Leaf)) {
    throw "The media profile requires the unavailable local DSH seed-media overlay. Use media-storage for MinIO/runtime upload infrastructure."
  }
}
if (($ProfileList -contains "dsh" -or $ProfileList -contains "workforce" -or
     $ProfileList -contains "wlt" -or $ProfileList -contains "platform" -or
     $ProfileList -contains "providers") -and $ProfileList -notcontains "identity") {
  $ProfileList = @("identity") + $ProfileList
}
$ProfileList = @($ProfileList | Select-Object -Unique)

function Test-MediaStorageSelected {
  return [bool](($ProfileList -contains "media") -or ($ProfileList -contains "media-storage"))
}



function Test-ExplicitResetInvocation { return [bool]$Force }

function Get-ComposeProfileArgs {
  $arguments = @()
  $seen = @{}
  foreach ($profile in $script:ProfileList) {
    # Both logical media capabilities are implemented by the existing Compose
    # 'media' profile. The local overlay distinction belongs to runtime policy,
    # not Docker service ownership.
    $composeProfile = if ($profile -in @("media", "media-storage")) { "media" } else { $profile }
    if ($seen.ContainsKey($composeProfile)) { continue }
    $seen[$composeProfile] = $true
    $arguments += @("--profile", $composeProfile)
  }
  return $arguments
}

function Get-ComposeBase {
  foreach ($requiredCompose in @(
    $script:ComposeFile,
    $script:FinancialComposeFile,
    $script:ObservabilityComposeFile
  )) {
    if (-not (Test-Path -LiteralPath $requiredCompose -PathType Leaf)) {
      throw "Required canonical Compose authority not found: $requiredCompose"
    }
  }

  return @(
    "--env-file", $script:EnvFile,
    "-f", $script:ComposeFile,
    "-f", $script:FinancialComposeFile,
    "-f", $script:ObservabilityComposeFile
  )
}

function Invoke-Compose {
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) @args
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose failed: $($args -join ' ') (exit $LASTEXITCODE)"
  }
}

function Invoke-LocalIdentityDevelopmentSeed {
  if ($env:NODE_ENV -eq "production" -or $env:BTHWANI_RUNTIME_MODE -eq "production") { throw "The development identity seed is forbidden in production runtime mode." }
  if (-not (Test-Path -LiteralPath $script:DevBootstrapComposeFile -PathType Leaf)) {
    throw "Development identity seed overlay not found: $script:DevBootstrapComposeFile"
  }
  Write-Host "`n--- Running isolated development identity seed executable ---"
  $base = @(
    "--env-file", $script:EnvFile,
    "-f", $script:ComposeFile,
    "-f", $script:FinancialComposeFile,
    "-f", $script:ObservabilityComposeFile,
    "-f", $script:DevBootstrapComposeFile,
    "--profile", "dev-bootstrap"
  )
  docker compose @base run --build --rm identity-local-bootstrap
  if ($LASTEXITCODE -ne 0) { throw "Development identity seed failed (exit $LASTEXITCODE)" }
  Write-Host "Development identity seed: PASS"
}

$CanonicalComposeProject = "bthwani-runtime"
$HardPublishedBindingCeiling = 15

function Get-BthwaniDockerRows {
  $rows = @()

  $raw = @(
    docker ps -a --format '{{.ID}}|{{.Names}}|{{.Label "com.docker.compose.project"}}'
  )

  if ($LASTEXITCODE -ne 0) {
    throw "Unable to inspect Docker containers."
  }

  foreach ($line in $raw) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    $parts = $line -split '\|', 3
    if ($parts.Count -lt 3) { continue }

    $id = $parts[0].Trim()
    $name = $parts[1].Trim()
    $project = $parts[2].Trim()

    if (
      $name.StartsWith("bthwani-", [System.StringComparison]::OrdinalIgnoreCase) -or
      $name -match '^pr\d+-' -or
      $project.StartsWith("bthwani", [System.StringComparison]::OrdinalIgnoreCase)
    ) {
      $rows += [pscustomobject]@{
        Id = $id
        Name = $name
        Project = $project
      }
    }
  }

  return @($rows)
}

function Get-DeclaredPublishedBindingCount {
  $count = 0

  foreach ($file in @(
    $script:ComposeFile,
    $script:FinancialComposeFile,
    $script:ObservabilityComposeFile
  )) {
    foreach ($line in Get-Content -LiteralPath $file) {
      $trimmed = $line.Trim()

      if (
        $trimmed.StartsWith('- "127.0.0.1:') -or
        $trimmed.StartsWith("- '127.0.0.1:") -or
        $trimmed.StartsWith('- 127.0.0.1:')
      ) {
        $count++
      }
    }
  }

  return $count
}

function Get-RunningPublishedBindingCount {
  $count = 0

  $running = @(
    docker ps --format '{{.ID}}|{{.Names}}|{{.Label "com.docker.compose.project"}}'
  )

  if ($LASTEXITCODE -ne 0) {
    throw "Unable to inspect running Docker containers."
  }

  foreach ($line in $running) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    $parts = $line -split '\|', 3
    if ($parts.Count -lt 3) { continue }

    $id = $parts[0].Trim()
    $name = $parts[1].Trim()
    $project = $parts[2].Trim()

    if (
      -not $name.StartsWith("bthwani-", [System.StringComparison]::OrdinalIgnoreCase) -and
      $name -notmatch '^pr\d+-' -and
      -not $project.StartsWith("bthwani", [System.StringComparison]::OrdinalIgnoreCase)
    ) {
      continue
    }

    $published = @(docker port $id 2>$null)

    if ($LASTEXITCODE -eq 0) {
      $count += @(
        $published |
          Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
      ).Count
    }
  }

  return $count
}

function Assert-DockerRuntimeTopology {
  $context = (docker context show).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($context)) {
    throw "Unable to resolve Docker context."
  }

  $endpoint = (
    docker context inspect $context --format '{{.Endpoints.docker.Host}}'
  ).Trim()

  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($endpoint)) {
    throw "Unable to resolve Docker endpoint for context '$context'."
  }

  if ($endpoint -notmatch '^(npipe|unix)://') {
    throw "Docker runtime refuses non-local endpoint '$endpoint'."
  }

  $rows = @(Get-BthwaniDockerRows)

  $foreign = @(
    $rows | Where-Object {
      [string]::IsNullOrWhiteSpace($_.Project) -or
      $_.Project -ne $script:CanonicalComposeProject
    }
  )

  if ($foreign.Count -gt 0) {
    $details = @(
      $foreign |
        ForEach-Object {
          "$($_.Name) [project='$($_.Project)']"
        }
    ) -join ", "

    throw @"
Non-canonical BThwani Docker state detected:
$details

The canonical project is '$script:CanonicalComposeProject'.
Do not create another Compose project. Diagnose/remove the legacy state explicitly before starting runtime.
"@
  }

  $declared = Get-DeclaredPublishedBindingCount

  if ($declared -le 0) {
    throw "No canonical loopback Docker port bindings were discovered."
  }

  if ($declared -gt $script:HardPublishedBindingCeiling) {
    throw "Canonical Compose declares $declared published bindings; hard ceiling is $script:HardPublishedBindingCeiling."
  }

  $running = Get-RunningPublishedBindingCount

  if ($running -gt $script:HardPublishedBindingCeiling) {
    throw "Running BThwani Docker bindings=$running exceeds hard ceiling=$script:HardPublishedBindingCeiling."
  }
}

function Write-DockerRuntimeTopology {
  $declared = Get-DeclaredPublishedBindingCount
  $running = Get-RunningPublishedBindingCount
  $rows = @(Get-BthwaniDockerRows)

  Write-Host "`n--- BThwani Docker topology ---"
  Write-Host "canonical_project: $script:CanonicalComposeProject"
  Write-Host "containers: $($rows.Count)"
  Write-Host "declared_host_bindings: $declared"
  Write-Host "running_host_bindings: $running"
  Write-Host "hard_binding_ceiling: $script:HardPublishedBindingCeiling"

  foreach ($row in $rows) {
    Write-Host "  $($row.Name) project=$($row.Project)"
  }
}

function Invoke-ComposeConvergentUp {
  Invoke-Compose up -d --remove-orphans @args
}

function Assert-ProductionRuntimeBoundary {
  if ([string]$env:BTHWANI_RUNTIME_MODE -ne "production") { return }

  $authorized = ([string]$env:BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED).Trim().ToLowerInvariant() -eq "true"
  $localProductionLike = ([string]$env:BTHWANI_LOCAL_PRODUCTION_LIKE).Trim().ToLowerInvariant() -eq "true"
  if ($authorized -and $localProductionLike) {
    throw "Production deployment cannot also declare the local production-like escape hatch."
  }
  if (-not $authorized -and -not $localProductionLike) {
    throw "Production runtime is not explicitly authorized and is not an explicitly local production-like run."
  }
  if ([string]$env:BTHWANI_REQUIRE_STRONG_SECRETS -ne "true") {
    throw "Production runtime requires BTHWANI_REQUIRE_STRONG_SECRETS=true."
  }
  if ($env:BTHWANI_LOCAL_DEV_PASSWORD -or $env:BTHWANI_LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZED -or $env:IDENTITY_LOCAL_BOOTSTRAP) {
    throw "Development bootstrap environment state is forbidden in the production runtime boundary."
  }
  if ($authorized -and $Action -in @("reset", "all", "bootstrap-dev", "seed")) {
    throw "Production deployment cannot execute local reset, seed, or bootstrap actions."
  }
  if ($env:COMPOSE_PROJECT_NAME -and $env:COMPOSE_PROJECT_NAME -ne $script:CanonicalComposeProject) {
    throw "Production runtime must use the canonical Compose project '$script:CanonicalComposeProject'."
  }
  if ($authorized -and [string]$env:WLT_FINANCIAL_PROVIDER_MODE -eq "mock") {
    throw "Authorized production deployment cannot use the mock financial provider."
  }

  $composeArguments = @(Get-ComposeBase) + @(Get-ComposeProfileArgs) + @("config")
  $effectiveOutput = @(docker compose @composeArguments 2>&1)
  $effectiveExitCode = $LASTEXITCODE
  if ($effectiveExitCode -ne 0) {
    throw "Effective production Compose validation failed (exit $effectiveExitCode)."
  }
  $effective = ($effectiveOutput | ForEach-Object { [string]$_ }) -join "`n"
  foreach ($forbidden in @(
    "identity-local-bootstrap",
    "Dockerfile.local-bootstrap",
    "compose.dev-bootstrap.yml",
    "BTHWANI_RUNTIME_MODE: development",
    "REPLACE_WITH_GENERATED_",
    "LOCAL_ONLY_",
    "dev-only-",
    "bthwani_runtime_password",
    "bthwani_minio_password",
    "identity_runtime_password",
    "workforce_runtime_password",
    "dsh_runtime_password",
    "wlt_runtime_password",
    "providers_runtime_password",
    "platform_control_runtime_password",
    "dsh_media_local",
    "dsh_media_local_secret"
  )) {
    if ($effective.Contains($forbidden, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Effective production Compose contains forbidden local/default value or development authority: $forbidden"
    }
  }
  if ($authorized -and $effective -match '(?i)WLT_ALLOW_MOCK_PROVIDER:\s*"?true') {
    throw "Effective production Compose enables the mock provider."
  }
  Write-Host "Production runtime boundary: PASS (effective Compose validated before service start)"
}

function Get-SelectedMigrationServices {
  $services = @()
  if ($script:ProfileList -contains "identity") { $services += "identity" }
  if ($script:ProfileList -contains "workforce") { $services += "workforce" }
  if ($script:ProfileList -contains "wlt") { $services += "wlt" }
  if ($script:ProfileList -contains "dsh") { $services += "dsh" }
  if ($script:ProfileList -contains "providers") { $services += "providers" }
  if ($script:ProfileList -contains "platform") { $services += "platform-control" }
  if ($services.Count -eq 0 -and @("migrate", "seed").Contains($Action)) { $services += "dsh" }
  return @($services | Select-Object -Unique)
}

function Get-SelectedMigratedApiServices {
  $apiByMigrationService = @{
    "identity" = "identity-api"
    "workforce" = "workforce-api"
    "wlt" = "wlt-api"
    "dsh" = "dsh-api"
    "providers" = "providers-api"
    "platform-control" = "platform-control-api"
  }
  return @(Get-SelectedMigrationServices | ForEach-Object { $apiByMigrationService[$_] })
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
      "identity" { $databases += if ($env:BTHWANI_IDENTITY_DB_NAME) { $env:BTHWANI_IDENTITY_DB_NAME } else { "identity_runtime" } }
      "workforce" { $databases += if ($env:BTHWANI_WORKFORCE_DB_NAME) { $env:BTHWANI_WORKFORCE_DB_NAME } else { "workforce_runtime" } }
      "dsh" { $databases += if ($env:BTHWANI_DSH_DB_NAME) { $env:BTHWANI_DSH_DB_NAME } else { "dsh_runtime" } }
      "wlt" { $databases += if ($env:BTHWANI_WLT_DB_NAME) { $env:BTHWANI_WLT_DB_NAME } else { "wlt_runtime" } }
      "providers" { $databases += if ($env:BTHWANI_PROVIDERS_DB_NAME) { $env:BTHWANI_PROVIDERS_DB_NAME } else { "providers_runtime" } }
      "platform-control" { $databases += if ($env:BTHWANI_PLATFORM_CONTROL_DB_NAME) { $env:BTHWANI_PLATFORM_CONTROL_DB_NAME } else { "platform_control_runtime" } }
    }
  }
  return @($databases | Select-Object -Unique)
}

function Test-RuntimeDefaultSecrets {
  $defaults = @(
    @{ Name = "BTHWANI_MINIO_ROOT_PASSWORD"; Value = if ($env:BTHWANI_MINIO_ROOT_PASSWORD) { $env:BTHWANI_MINIO_ROOT_PASSWORD } else { "bthwani_minio_password" }; Default = "bthwani_minio_password" },
    @{ Name = "BTHWANI_POSTGRES_PASSWORD"; Value = if ($env:BTHWANI_POSTGRES_PASSWORD) { $env:BTHWANI_POSTGRES_PASSWORD } else { "bthwani_runtime_password" }; Default = "bthwani_runtime_password" }
  )
  if ($env:BTHWANI_RUNTIME_MODE -ne "production") {
    $defaults += @{ Name = "BTHWANI_LOCAL_DEV_PASSWORD"; Value = Get-LocalPassword; Default = Get-LocalPasswordDefault }
  }
  $weak = @($defaults | Where-Object { $_.Value -eq $_.Default })
  foreach ($item in $weak) { Write-Warning "Runtime default secret in use: $($item.Name). Override it outside local-only development." }
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
  Write-DockerRuntimeTopology
  $logServices = if ([string]::IsNullOrWhiteSpace($TargetService)) {
    @("identity-api", "workforce-api", "dsh-api", "wlt-api", "providers-api", "platform-control-api", "postgres", "minio")
  } else { @($TargetService) }
  foreach ($logService in $logServices) {
    Write-Host "`n--- last 80 log lines: $logService ---"
    docker compose @(Get-ComposeBase) logs --tail=80 $logService 2>$null
  }
}

function Wait-ForPostgres {
  $requiredDatabases = @(Get-RequiredDatabaseNames)
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
        $result = docker compose @(Get-ComposeBase) exec -T postgres psql -U bthwani_runtime -d bthwani_runtime -tAc "SELECT 1 FROM pg_database WHERE datname = '$database';" 2>$null
        if ($LASTEXITCODE -ne 0 -or (($result -join "").Trim()) -ne "1") { $missing += $database }
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
  for ($attempt = 1; $attempt -le 40; $attempt++) {
    Write-Host "Waiting for $Name ($attempt/40)..."
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
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($sha)) { throw "Unable to resolve source commit SHA." }
  return $sha
}

function Invoke-GovernedMigrations {
  $allowLocalLedgerRecovery = ($Action -eq "bootstrap-dev")
  $sourceCommitSha = Get-SourceCommitSha
  foreach ($serviceName in Get-SelectedMigrationServices) {
    Write-Host "`n--- Applying governed $serviceName migrations ---"
    if ($allowLocalLedgerRecovery) {
      & $script:GovernedMigrationScript -Service $serviceName -SourceCommitSha $sourceCommitSha -AllowLocalLedgerRecovery
    } else {
      & $script:GovernedMigrationScript -Service $serviceName -SourceCommitSha $sourceCommitSha
    }
    if ($LASTEXITCODE -ne 0) { throw "Governed runtime migrations failed for $serviceName (exit $LASTEXITCODE)" }
  }
}

function Restart-MigratedApis {
  $apiServices = @(Get-SelectedMigratedApiServices)
  if ($apiServices.Count -eq 0) { return }
  Write-Host "`n--- Restarting APIs against the converged schema ---"
  Invoke-Compose restart @apiServices
}

function Assert-LocalIdentityBootstrapConverged {
  if ($env:NODE_ENV -eq "production" -or $ProfileList -notcontains "identity") { return }
  Write-Host "`n--- Verifying explicit Identity development seed ---"
  & node (Join-Path $RepoRoot "tools/dev/verify-local-identity-bootstrap.mjs")
  if ($LASTEXITCODE -ne 0) { throw "Identity development seed has not converged (exit $LASTEXITCODE)" }
}

function Invoke-LocalWorkforceProvisioning {
  param([switch]$DeferFinancialStanding)
  if ($env:NODE_ENV -eq "production" -or $env:BTHWANI_RUNTIME_MODE -eq "production") { throw "Local workforce provisioning is forbidden in production runtime mode." }
  if (-not ($ProfileList -contains "workforce" -and $ProfileList -contains "identity")) { return }
  if ($ProfileList -notcontains "wlt") { throw "Local Workforce provisioning requires the WLT profile because captain standing is WLT-owned." }
  if (@(Get-SelectedSeedServices).Count -eq 0) { return }
  Write-Host "`n--- Provisioning governed local Workforce providers ---"
  $provisioningArguments = @((Join-Path $RepoRoot "tools/dev/local-workforce-provisioning.mjs"))
  if ($DeferFinancialStanding) { $provisioningArguments += "--defer-financial-standing" }
  & node @provisioningArguments
  if ($LASTEXITCODE -ne 0) { throw "Local Workforce provider provisioning failed (exit $LASTEXITCODE)" }
}

function Invoke-GovernedSeeds {
  if ($env:NODE_ENV -eq "production" -or $env:BTHWANI_RUNTIME_MODE -eq "production") { throw "Local runtime seeds are forbidden in production runtime mode." }
  $sourceCommitSha = Get-SourceCommitSha
  foreach ($serviceName in Get-SelectedSeedServices) {
    Write-Host "`n--- Applying governed $serviceName local seeds ---"
    & $script:GovernedSeedScript -Service $serviceName -SourceCommitSha $sourceCommitSha -AllowLocalSeeds
    if ($LASTEXITCODE -ne 0) { throw "Governed runtime seeds failed for $serviceName (exit $LASTEXITCODE)" }
  }
}


function Get-ApiHostPort {
  param([Parameter(Mandatory)][string]$EnvironmentName, [Parameter(Mandatory)][int]$DefaultPort)
  $rawPort = ([string][Environment]::GetEnvironmentVariable($EnvironmentName, "Process")).Trim()
  if ([string]::IsNullOrWhiteSpace($rawPort)) { return [string]$DefaultPort }
  if ($rawPort -notmatch '^\d{1,5}$' -or [int]$rawPort -lt 1 -or [int]$rawPort -gt 65535) {
    throw "$EnvironmentName must be a valid TCP port; received '$rawPort'."
  }
  return $rawPort
}

function Wait-ForSelectedApis {

  if ($ProfileList -contains "identity") {
    $identityApiHostPort = Get-ApiHostPort -EnvironmentName "BTHWANI_IDENTITY_API_HOST_PORT" -DefaultPort 18082
    Wait-ForHttpStatus -Name "Identity API" -Url "http://localhost:$identityApiHostPort/identity/readiness" -HealthyValues @("HEALTHY") | Out-Null
  }
  if ($ProfileList -contains "workforce") { $port = Get-ApiHostPort -EnvironmentName "BTHWANI_WORKFORCE_API_HOST_PORT" -DefaultPort 18086; Wait-ForHttpStatus -Name "Workforce API" -Url "http://localhost:$port/workforce/readiness" -HealthyValues @("HEALTHY") | Out-Null }
  if ($ProfileList -contains "providers") { $port = Get-ApiHostPort -EnvironmentName "BTHWANI_PROVIDERS_API_HOST_PORT" -DefaultPort 18087; Wait-ForHttpStatus -Name "Providers API" -Url "http://localhost:$port/providers/readiness" -HealthyValues @("HEALTHY", "ready") | Out-Null }
  if ($ProfileList -contains "platform") { $port = Get-ApiHostPort -EnvironmentName "BTHWANI_PLATFORM_CONTROL_API_HOST_PORT" -DefaultPort 18088; Wait-ForHttpStatus -Name "Platform Control API" -Url "http://localhost:$port/platform/readiness" -HealthyValues @("HEALTHY") | Out-Null }
  if ($ProfileList -contains "wlt") { $port = Get-ApiHostPort -EnvironmentName "BTHWANI_WLT_API_HOST_PORT" -DefaultPort 18083; Wait-ForHttpStatus -Name "WLT API" -Url "http://localhost:$port/wlt/readiness" -HealthyValues @("HEALTHY") | Out-Null }
  if ($ProfileList -contains "dsh") { $port = Get-ApiHostPort -EnvironmentName "BTHWANI_DSH_API_HOST_PORT" -DefaultPort 18080; Wait-ForHttpStatus -Name "DSH API" -Url "http://localhost:$port/dsh/readiness" -HealthyValues @("HEALTHY") | Out-Null }
  if ($ProfileList -contains "financial-simulators") {
    $financialSimulatorPort = if ([string]::IsNullOrWhiteSpace($env:BTHWANI_WIREMOCK_FINANCIAL_PORT)) { 18090 } else { [int]$env:BTHWANI_WIREMOCK_FINANCIAL_PORT }
    Invoke-RestMethod "http://localhost:$financialSimulatorPort/__admin/mappings" -TimeoutSec 10 -ErrorAction Stop | Out-Null
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
  if (Test-MediaStorageSelected) { Wait-ForMinIO }
}

function Invoke-SelectedSmoke {
  Write-Host "`n--- Runtime smoke ---"
  Wait-ForSelectedApis
  if ($ProfileList -contains "dsh") {
    $dshApiHostPort = Get-ApiHostPort -EnvironmentName "BTHWANI_DSH_API_HOST_PORT" -DefaultPort 18080
    $stores = Invoke-RestMethod "http://localhost:$dshApiHostPort/dsh/stores?limit=1&offset=0" -TimeoutSec 10 -ErrorAction Stop
    if ($null -eq $stores.stores) { throw "/dsh/stores response is missing the stores field" }
    Write-Host "DSH stores smoke: PASS count=$($stores.stores.Count)"
  }
  Write-Host "smoke: PASS"
}

Test-RuntimeDefaultSecrets
if ($Action -in @("up", "reset", "migrate", "seed", "smoke", "all", "bootstrap-dev", "ensure-db")) {
  Assert-ProductionRuntimeBoundary
}

if ($Action -in @(
  "up",
  "reset",
  "migrate",
  "seed",
  "smoke",
  "all",
  "bootstrap-dev",
  "ensure-db",
  "service-up",
  "service-stop"
)) {
  docker info | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Engine is not reachable."
  }

  Assert-DockerRuntimeTopology
}

switch ($Action) {
  "up" {
    Write-Host "=== runtime:up (profiles: $($ProfileList -join ','))"
    docker info | Out-Null
    Invoke-ComposeConvergentUp postgres
    Wait-ForPostgres
    if (Test-MediaStorageSelected) {
      Invoke-ComposeConvergentUp minio
      Wait-ForMinIO
      Invoke-GovernedMinioInit
    }
    Invoke-GovernedMigrations
    Invoke-ComposeConvergentUp --build
    Wait-ForSelectedApis
    Write-Host "runtime:up: PASS"
  }
  "down" {
    Write-Host "=== runtime:down"
    Invoke-Compose down --remove-orphans
  }
  "reset" {
    if (-not (Test-ExplicitResetInvocation)) { throw "runtime reset is destructive. Provide -Force or invoke a named pnpm reset command." }
    Write-Host "=== runtime:reset (profiles: $($ProfileList -join ','))"
    docker info | Out-Null
    Invoke-Compose down -v --remove-orphans
    Invoke-ComposeConvergentUp postgres
    Wait-ForPostgres
    if (Test-MediaStorageSelected) {
      Invoke-ComposeConvergentUp minio
      Wait-ForMinIO
      Invoke-GovernedMinioInit
    }
    Invoke-GovernedMigrations
    Invoke-ComposeConvergentUp --build
    Invoke-LocalIdentityDevelopmentSeed
    Wait-ForSelectedApis
    Assert-LocalIdentityBootstrapConverged
    Invoke-LocalWorkforceProvisioning -DeferFinancialStanding
    Invoke-GovernedSeeds
    Invoke-LocalWorkforceProvisioning
    Invoke-SelectedSmoke
    Write-Host "reset: PASS"
  }
  "bootstrap-dev" {
    if ($env:NODE_ENV -eq "production" -or $env:BTHWANI_RUNTIME_MODE -eq "production") { throw "bootstrap-dev is not allowed in production runtime mode." }
    if (-not $Force) { throw "bootstrap-dev requires -Force." }
    Write-Host "=== runtime:bootstrap-dev (profiles: $($ProfileList -join ','))"
    docker info | Out-Null
    Invoke-ComposeConvergentUp postgres
    Wait-ForPostgres
    if (Test-MediaStorageSelected) {
      Invoke-ComposeConvergentUp minio
      Wait-ForMinIO
      Invoke-GovernedMinioInit
    }
    Invoke-GovernedMigrations
    Invoke-ComposeConvergentUp --build
    Restart-MigratedApis
    Invoke-LocalIdentityDevelopmentSeed
    Wait-ForSelectedApis
    Assert-LocalIdentityBootstrapConverged
    Invoke-LocalWorkforceProvisioning -DeferFinancialStanding
    Invoke-GovernedSeeds
    Invoke-LocalWorkforceProvisioning
    if ($ProfileList -contains "dsh") {
      node tools/scripts/mobile-dev-data.mjs --repair
      if ($LASTEXITCODE -ne 0) { throw "Mobile full-stack development data bootstrap failed (exit $LASTEXITCODE)" }
    }
    Write-Host "runtime:bootstrap-dev: PASS"
  }
  "verify-catalog" {
    Write-Host "=== runtime:verify-catalog"
    $parameters = @{}
    if ($ProfileList -contains "media") { $parameters.RequireMedia = $true }
    $global:LASTEXITCODE = 0
    & (Join-Path $RepoRoot "tools/scripts/verify-catalog.ps1") @parameters
    if ($LASTEXITCODE -ne 0) { throw "verify-catalog failed (exit $LASTEXITCODE)" }
    Write-Host "verify-catalog: PASS"
  }
  "status" {
    Write-Host "=== runtime:status"
    Invoke-Compose ps
    Write-Host "`n--- docker ps ---"
    docker ps --format "table {{.Names}}`t{{.Image}}`t{{.Status}}`t{{.Ports}}"
  Write-DockerRuntimeTopology
  }
  "logs" {
    Write-Host "=== runtime:logs"
    if ([string]::IsNullOrWhiteSpace($Service)) { Invoke-Compose logs --tail=100 }
    else { Invoke-Compose logs --tail=100 $Service }
  }
  "doctor" { Write-RuntimeDoctor -Reason "manual doctor action" -TargetService $Service }
  "service-up" {
    if ([string]::IsNullOrWhiteSpace($Service)) {
      throw "service-up requires -Service."
    }
    if ($Service -notmatch '^[a-z0-9][a-z0-9-]*$') {
      throw "Unsafe canonical Compose service name: $Service"
    }
    Write-Host "=== runtime:service-up service=$Service profiles=$($ProfileList -join ',')"
    Invoke-ComposeConvergentUp --no-deps $Service
    Write-Host "runtime:service-up: PASS service=$Service"
  }
  "service-stop" {
    if ([string]::IsNullOrWhiteSpace($Service)) {
      throw "service-stop requires -Service."
    }
    if ($Service -notmatch '^[a-z0-9][a-z0-9-]*$') {
      throw "Unsafe canonical Compose service name: $Service"
    }
    Write-Host "=== runtime:service-stop service=$Service profiles=$($ProfileList -join ',')"
    Invoke-Compose stop $Service
    Write-Host "runtime:service-stop: PASS service=$Service"
  }
  "ensure-db" {
    Write-Host "=== runtime:ensure-db (profiles: $($ProfileList -join ','))"
    Invoke-ComposeConvergentUp postgres
    Wait-ForPostgres
    Write-Host "runtime:ensure-db: PASS"
  }
  "migrate" {
    Write-Host "=== runtime:migrate"
    Invoke-ComposeConvergentUp postgres
    Wait-ForPostgres
    Invoke-GovernedMigrations
    Write-Host "runtime:migrate: PASS"
  }
  "seed" {
    Write-Host "=== runtime:seed"
    Invoke-ComposeConvergentUp postgres
    Wait-ForPostgres
    if (Test-MediaStorageSelected) {
      Invoke-ComposeConvergentUp minio
      Wait-ForMinIO
      Invoke-GovernedMinioInit
    }
    Invoke-GovernedMigrations
    Invoke-GovernedSeeds
    Write-Host "runtime:seed: PASS"
  }
  "smoke" {
    Write-Host "=== runtime:smoke (profiles: $($ProfileList -join ','))"
    if (@(Get-RequiredDatabaseNames).Count -gt 0) {
      Invoke-ComposeConvergentUp postgres
      Wait-ForPostgres
      Invoke-GovernedMigrations
    }
    if (Test-MediaStorageSelected) {
      Invoke-ComposeConvergentUp minio
      Wait-ForMinIO
      Invoke-GovernedMinioInit
    }
    Invoke-ComposeConvergentUp
    Invoke-SelectedSmoke
  }
  "all" {
    Write-Host "=== runtime:all (profiles: $($ProfileList -join ','))"
    docker info | Out-Null
    Invoke-Compose down -v --remove-orphans
    Write-Host "down: OK"
    Invoke-ComposeConvergentUp --build postgres
    Wait-ForPostgres
    if (Test-MediaStorageSelected) {
      Invoke-ComposeConvergentUp --build minio
      Wait-ForMinIO
      Invoke-GovernedMinioInit
    }
    Invoke-GovernedMigrations
    Invoke-GovernedSeeds
    Invoke-ComposeConvergentUp --build
    Invoke-LocalIdentityDevelopmentSeed
    Invoke-SelectedSmoke
    Write-Host "`nruntime:all: PASS"
  }
}
