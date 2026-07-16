<#
.SYNOPSIS
  Central Docker Runtime Orchestrator for bthwani-suite-next.

.PARAMETER Action
  up | down | reset | status | logs | migrate | seed | smoke | doctor | all

.PARAMETER Profiles
  Comma-separated list of Docker Compose profiles to activate.
  Supported: identity, workforce, dsh, media, wlt, financial-simulators, mail, cache
  Example: -Profiles identity,workforce,dsh,media or -Profiles wlt,financial-simulators

.PARAMETER Service
  (Optional) Target a specific service for logs/status.
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

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "../../../")).Path
Set-Location -LiteralPath $RepoRoot

$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$FinancialComposeFile = Join-Path $RepoRoot "infra/docker/compose.financial-simulators.yml"
$ObservabilityComposeFile = Join-Path $RepoRoot "infra/docker/compose.observability.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Env file not found: $EnvFile"
}

# Load environment variables from EnvFile into PowerShell environment
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

# ── Parse profiles ────────────────────────────────────────────────────────────
$ProfileList = @()
if ($Profiles -ne "") {
  $ProfileList = $Profiles.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}
$AllowedProfiles = @("identity", "workforce", "dsh", "media", "wlt", "financial-simulators", "mail", "cache", "observability")
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

function Get-ComposeProfileArgs {
  $flags = @()
  foreach ($p in $script:ProfileList) { $flags += @("--profile", $p) }
  return $flags
}

function Get-ComposeBase {
  $files = @("--env-file", $script:EnvFile, "-f", $script:ComposeFile)
  $needsFinancialCompose = $script:ProfileList | Where-Object { @("financial-simulators", "mail", "cache") -contains $_ }
  if ($needsFinancialCompose) {
    if (-not (Test-Path -LiteralPath $script:FinancialComposeFile)) {
      throw "Financial simulator compose file not found: $script:FinancialComposeFile"
    }
    $files += @("-f", $script:FinancialComposeFile)
  }
  if ($script:ProfileList -contains "observability") {
    if (-not (Test-Path -LiteralPath $script:ObservabilityComposeFile)) {
      throw "Observability compose file not found: $script:ObservabilityComposeFile"
    }
    $files += @("-f", $script:ObservabilityComposeFile)
  }
  return $files
}

# ── Helpers ───────────────────────────────────────────────────────────────────

function Get-RequiredDatabaseNames {
  $RequiredDatabases = @()
  if ($script:ProfileList -contains "identity") { $RequiredDatabases += "identity_runtime" }
  if ($script:ProfileList -contains "dsh") { $RequiredDatabases += "dsh_runtime" }
  if ($script:ProfileList -contains "wlt") { $RequiredDatabases += "wlt_runtime" }
  if ($script:ProfileList -contains "workforce") { $RequiredDatabases += "workforce_runtime" }
  if ($RequiredDatabases.Count -eq 0 -and ($Action -eq "migrate" -or $Action -eq "seed")) {
    $RequiredDatabases += "dsh_runtime"
  }
  return $RequiredDatabases | Select-Object -Unique
}

function Test-RuntimeDefaultSecrets {
  $defaults = @(
    @{ Name = "BTHWANI_MINIO_ROOT_PASSWORD"; Value = if ($env:BTHWANI_MINIO_ROOT_PASSWORD) { $env:BTHWANI_MINIO_ROOT_PASSWORD } else { "bthwani_minio_password" }; Default = "bthwani_minio_password" },
    @{ Name = "BTHWANI_POSTGRES_PASSWORD"; Value = if ($env:BTHWANI_POSTGRES_PASSWORD) { $env:BTHWANI_POSTGRES_PASSWORD } else { "bthwani_runtime_password" }; Default = "bthwani_runtime_password" },
    @{ Name = "IDENTITY_LOCAL_BOOTSTRAP_PASSWORD"; Value = if ($env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD) { $env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD } else { "123456" }; Default = "123456" }
  )
  $weak = $defaults | Where-Object { $_.Value -eq $_.Default }
  foreach ($item in $weak) {
    Write-Warning "Runtime default secret in use: $($item.Name). Override it outside local-only development."
  }
  if ($env:BTHWANI_REQUIRE_STRONG_SECRETS -eq "true" -and $weak.Count -gt 0) {
    throw "BTHWANI_REQUIRE_STRONG_SECRETS=true and default runtime secrets are still configured: $($weak.Name -join ', ')"
  }
}

Test-RuntimeDefaultSecrets

function Write-RuntimeDoctor {
  param(
    [string]$Reason = "runtime doctor",
    [string]$Service = ""
  )

  Write-Host "`n=== runtime:doctor ==="
  Write-Host "reason: $Reason"
  Write-Host "profiles: $($script:ProfileList -join ',')"
  Write-Host "compose_file: $script:ComposeFile"
  if ($script:ProfileList -contains "observability") { Write-Host "observability_compose_file: $script:ObservabilityComposeFile" }
  if ($script:ProfileList | Where-Object { @("financial-simulators", "mail", "cache") -contains $_ }) { Write-Host "financial_compose_file: $script:FinancialComposeFile" }

  Write-Host "`n--- docker ps ---"
  docker ps --format "table {{.Names}}`t{{.Image}}`t{{.Status}}`t{{.Ports}}"

  Write-Host "`n--- docker compose ps ---"
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) ps

  $logServices = @()
  if ($Service -ne "") {
    $logServices += $Service
  } else {
    if ($script:ProfileList -contains "identity") { $logServices += "identity-api" }
    if ($script:ProfileList -contains "dsh") { $logServices += "dsh-api" }
    if ($script:ProfileList -contains "wlt") { $logServices += "wlt-api" }
    if ($script:ProfileList -contains "workforce") { $logServices += "workforce-api" }
    if ($script:ProfileList -contains "media") { $logServices += "minio" }
    if ($script:ProfileList -contains "financial-simulators") { $logServices += "wiremock-financial-provider" }
    if ($script:ProfileList -contains "mail") { $logServices += "mailpit" }
    if ($script:ProfileList -contains "cache") { $logServices += "valkey" }
    if ((Get-RequiredDatabaseNames).Count -gt 0) { $logServices += "postgres" }
  }

  foreach ($logService in ($logServices | Select-Object -Unique)) {
    Write-Host "`n--- last 80 log lines: $logService ---"
    docker compose @(Get-ComposeBase) logs --tail=80 $logService
  }
}

function Wait-ForPostgres {
  $max = 30

  $RequiredDatabases = Get-RequiredDatabaseNames
  if ($RequiredDatabases.Count -eq 0) {
    Write-Host "Postgres health skipped: no selected profile requires Postgres."
    return
  }

  for ($i = 1; $i -le $max; $i++) {
    Write-Host "Waiting for Postgres ($i/$max)..."

    docker compose @(Get-ComposeBase) exec -T postgres pg_isready -U bthwani_runtime -d bthwani_runtime 2>$null
    if ($LASTEXITCODE -eq 0) {
      $Missing = @()

      foreach ($db in $RequiredDatabases) {
        $Sql = "SELECT 1 FROM pg_database WHERE datname = '$db';"
        $Result = docker compose @(Get-ComposeBase) exec -T postgres psql -U bthwani_runtime -d bthwani_runtime -tAc $Sql 2>$null
        if ($LASTEXITCODE -ne 0 -or (($Result -join '').Trim()) -ne "1") {
          $Missing += $db
        }
      }

      if ($Missing.Count -eq 0) {
        Start-Sleep -Seconds 2
        Write-Host "Postgres: healthy"
        return
      }

      Write-Host "Postgres is up but missing DB(s): $($Missing -join ', ')"
    }

    Start-Sleep -Seconds 3
  }

  Write-RuntimeDoctor -Reason "Postgres health failed after $max attempts. expected_databases=$($RequiredDatabases -join ',')" -Service "postgres"
  throw "Postgres health failed after $max attempts for profiles [$($script:ProfileList -join ',')] expected_databases=[$($RequiredDatabases -join ',')]"
}
function Wait-ForDshApi {
  $max = 20
  for ($i = 1; $i -le $max; $i++) {
    Write-Host "Waiting for DSH API ($i/$max)..."
    try {
      $h = Invoke-RestMethod "http://localhost:58080/dsh/health" -TimeoutSec 5 -ErrorAction Stop
      if ($h.status -eq "healthy") { Write-Host "DSH API: healthy"; return }
    } catch { }
    Start-Sleep -Seconds 4
  }
  Write-RuntimeDoctor -Reason "DSH API health check failed after $max attempts" -Service "dsh-api"
  throw "DSH API did not become healthy after $max attempts"
}

function Start-DshApi {
  if ($script:ProfileList -notcontains "dsh") { return }
  Write-Host "`n--- Starting DSH API after identity readiness ---"
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d dsh-api
  if ($LASTEXITCODE -ne 0) { throw "DSH API start failed (exit $LASTEXITCODE)" }
}

function Wait-ForIdentityApi {
  $max = 20
  for ($i = 1; $i -le $max; $i++) {
    Write-Host "Waiting for Identity API ($i/$max)..."
    try {
      $h = Invoke-RestMethod "http://localhost:58082/identity/health" -TimeoutSec 5 -ErrorAction Stop
      if ($h.status -eq "healthy") { Write-Host "Identity API: healthy"; return }
    } catch { }
    Start-Sleep -Seconds 4
  }
  Write-RuntimeDoctor -Reason "Identity API health check failed after $max attempts" -Service "identity-api"
  throw "Identity API did not become healthy after $max attempts"
}

function Wait-ForWorkforceApi {
  $max = 20
  for ($i = 1; $i -le $max; $i++) {
    Write-Host "Waiting for Workforce API ($i/$max)..."
    try {
      $h = Invoke-RestMethod "http://localhost:58086/workforce/health" -TimeoutSec 5 -ErrorAction Stop
      if ($h.status -eq "healthy") { Write-Host "Workforce API: healthy"; return }
    } catch { }
    Start-Sleep -Seconds 4
  }
  Write-RuntimeDoctor -Reason "Workforce API health check failed after $max attempts" -Service "workforce-api"
  throw "Workforce API did not become healthy after $max attempts"
}

function Invoke-WorkforceSmoke {
  Write-Host "`n--- Workforce API smoke ---"
  $health = Invoke-RestMethod "http://localhost:58086/workforce/health" -TimeoutSec 10 -ErrorAction Stop
  if ($health.status -ne "healthy") { throw "/workforce/health not healthy" }
  $readiness = Invoke-RestMethod "http://localhost:58086/workforce/readiness" -TimeoutSec 10 -ErrorAction Stop
  if ($readiness.status -ne "ready") { throw "/workforce/readiness not ready" }
  Write-Host "Workforce API smoke: PASS"
}

function Invoke-IdentityMigrate {
  $MigrationDir = "core/identity/database/migrations"
  $MigrationFiles = Get-ChildItem -LiteralPath $MigrationDir -Filter "*.sql" | Sort-Object Name
  if ($MigrationFiles.Count -eq 0) { throw "No identity migration files found in $MigrationDir" }
  Write-Host "`n--- Applying identity migrations ---"
  foreach ($f in $MigrationFiles) {
    Write-Host "  Applying: $($f.Name)"
    Get-Content -LiteralPath $f.FullName -Raw |
      docker compose @(Get-ComposeBase) exec -T postgres `
        psql -U identity_runtime -d identity_runtime -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "Identity migration failed for $($f.Name) (exit $LASTEXITCODE)" }
  }
  Write-Host "Identity migration: PASS"
}

function Invoke-WorkforceMigrate {
  $MigrationDir = "core/workforce/database/migrations"
  $MigrationFiles = Get-ChildItem -LiteralPath $MigrationDir -Filter "*.sql" | Sort-Object Name
  if ($MigrationFiles.Count -eq 0) { throw "No workforce migration files found in $MigrationDir" }
  Write-Host "`n--- Applying workforce migrations ---"
  foreach ($f in $MigrationFiles) {
    Write-Host "  Applying: $($f.Name)"
    Get-Content -LiteralPath $f.FullName -Raw |
      docker compose @(Get-ComposeBase) exec -T postgres `
        psql -U workforce_runtime -d workforce_runtime -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "Workforce migration failed for $($f.Name) (exit $LASTEXITCODE)" }
  }
  Write-Host "Workforce migration: PASS"
}

function Invoke-IdentitySmoke {
  Write-Host "`n--- Identity API smoke ---"
  $health = Invoke-RestMethod "http://localhost:58082/identity/health" -TimeoutSec 10 -ErrorAction Stop
  if ($health.status -ne "healthy") { throw "/identity/health not healthy" }
  $readiness = Invoke-RestMethod "http://localhost:58082/identity/readiness" -TimeoutSec 10 -ErrorAction Stop
  if ($readiness.status -ne "ready") { throw "/identity/readiness not ready" }
  $body = @{
    username = "operator"
    password = $env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD
    deviceFingerprint = "runtime-smoke"
  } | ConvertTo-Json
  if ([string]::IsNullOrWhiteSpace($env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD)) {
    $body = @{
      username = "operator"
      password = "123456"
      deviceFingerprint = "runtime-smoke"
    } | ConvertTo-Json
  }
  $login = Invoke-RestMethod "http://localhost:58082/auth/login" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 10
  if ([string]::IsNullOrWhiteSpace($login.accessToken)) { throw "identity login did not return accessToken" }
  $headers = @{ Authorization = "Bearer $($login.accessToken)" }
  $session = Invoke-RestMethod "http://localhost:58082/auth/session" -Headers $headers -TimeoutSec 10
  if ($session.subject -ne "operator-local-001") { throw "identity session returned wrong subject" }
  Invoke-RestMethod "http://localhost:58082/auth/logout" -Method Post -Headers $headers -TimeoutSec 10 | Out-Null
  Write-Host "Identity API smoke: PASS"
}

function Invoke-DshPsql {
  param([string]$Sql)
  $result = $Sql |
    docker compose @(Get-ComposeBase) exec -T postgres `
      psql -U dsh_runtime -d dsh_runtime -v ON_ERROR_STOP=1 -tA
  if ($LASTEXITCODE -ne 0) { throw "DSH psql command failed (exit $LASTEXITCODE)" }
  return ($result -join "`n").Trim()
}

function Invoke-Migrate {
  $MigrationDir = "services/dsh/database/migrations"
  $MigrationFiles = Get-ChildItem -LiteralPath $MigrationDir -Filter "*.sql" | Sort-Object Name
  if ($MigrationFiles.Count -eq 0) { throw "No migration files found in $MigrationDir" }
  Write-Host "`n--- Applying DSH migrations ---"

  # Migration ledger: each applied file is recorded with its checksum so a
  # re-run applies only new migrations and refuses silently-edited history.
  Invoke-DshPsql @"
CREATE TABLE IF NOT EXISTS runtime_schema_migrations (
  migration_name TEXT        PRIMARY KEY,
  checksum       TEXT        NOT NULL,
  applied_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"@ | Out-Null

  foreach ($f in $MigrationFiles) {
    $checksum = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    $recorded = Invoke-DshPsql "SELECT checksum FROM runtime_schema_migrations WHERE migration_name = '$($f.Name)';"
    if ($recorded -eq $checksum) {
      Write-Host "  Skipping (already applied): $($f.Name)"
      continue
    }
    if ($recorded -ne "") {
      throw "Migration ledger checksum mismatch for $($f.Name): recorded $recorded, file $checksum. Applied migrations must never be edited; add a new migration instead."
    }
    Write-Host "  Applying: $($f.Name)"
    Get-Content -LiteralPath $f.FullName -Raw |
      docker compose @(Get-ComposeBase) exec -T postgres `
        psql -U dsh_runtime -d dsh_runtime -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "Migration failed for $($f.Name) (exit $LASTEXITCODE)" }
    Invoke-DshPsql @"
INSERT INTO runtime_schema_migrations (migration_name, checksum)
VALUES ('$($f.Name)', '$checksum')
ON CONFLICT (migration_name) DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = NOW();
"@ | Out-Null
    Write-Host "  $($f.Name): PASS"
  }
  Write-Host "Migration: PASS"
}

function Invoke-Seed {
  $SeedDir = "services/dsh/database/seeds/local"
  $SeedFiles = Get-ChildItem -LiteralPath $SeedDir -Filter "*.sql" | Sort-Object Name
  if ($SeedFiles.Count -eq 0) { throw "No seed files found in $SeedDir" }
  Write-Host "`n--- Applying DSH local seeds ---"
  foreach ($f in $SeedFiles) {
    Write-Host "  Seeding: $($f.Name)"
    Get-Content -LiteralPath $f.FullName -Raw |
      docker compose @(Get-ComposeBase) exec -T postgres `
        psql -U dsh_runtime -d dsh_runtime -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "Seed failed for $($f.Name) (exit $LASTEXITCODE)" }
    Write-Host "  $($f.Name): PASS"
  }
  Write-Host "Seed: PASS"
}

function Wait-ForWltApi {
  $max = 20
  for ($i = 1; $i -le $max; $i++) {
    Write-Host "Waiting for WLT API ($i/$max)..."
    try {
      $h = Invoke-RestMethod "http://localhost:58083/wlt/health" -TimeoutSec 5 -ErrorAction Stop
      if ($h.status -eq "healthy") { Write-Host "WLT API: healthy"; return }
    } catch { }
    Start-Sleep -Seconds 4
  }
  Write-RuntimeDoctor -Reason "WLT API health check failed after $max attempts" -Service "wlt-api"
  throw "WLT API did not become healthy after $max attempts"
}

function Wait-ForWireMockFinancialProvider {
  $max = 20
  for ($i = 1; $i -le $max; $i++) {
    Write-Host "Waiting for WireMock financial provider ($i/$max)..."
    try {
      Invoke-RestMethod "http://localhost:58090/__admin/mappings" -TimeoutSec 5 -ErrorAction Stop | Out-Null
      Write-Host "WireMock financial provider: healthy"
      return
    } catch { }
    Start-Sleep -Seconds 3
  }
  Write-RuntimeDoctor -Reason "WireMock financial provider health check failed after $max attempts" -Service "wiremock-financial-provider"
  throw "WireMock financial provider did not become healthy after $max attempts"
}

function Invoke-WireMockFinancialSmoke {
  Write-Host "`n--- WireMock financial provider smoke ---"
  $health = Invoke-RestMethod "http://localhost:58090/financial/health" -TimeoutSec 10 -ErrorAction Stop
  if ($health.status -ne "healthy") { throw "WireMock financial health is not healthy" }
  Write-Host "WireMock financial provider smoke: PASS"
}

function Wait-ForMailpit {
  $max = 20
  for ($i = 1; $i -le $max; $i++) {
    Write-Host "Waiting for Mailpit ($i/$max)..."
    try {
      Invoke-RestMethod "http://localhost:8025/api/v1/info" -TimeoutSec 5 -ErrorAction Stop | Out-Null
      Write-Host "Mailpit: healthy"
      return
    } catch { }
    Start-Sleep -Seconds 3
  }
  Write-RuntimeDoctor -Reason "Mailpit health check failed after $max attempts" -Service "mailpit"
  throw "Mailpit did not become healthy after $max attempts"
}

function Invoke-MailpitSmoke {
  Write-Host "`n--- Mailpit smoke ---"
  Invoke-RestMethod "http://localhost:8025/api/v1/info" -TimeoutSec 10 -ErrorAction Stop | Out-Null
  Write-Host "Mailpit smoke: PASS"
}

function Wait-ForValkey {
  $max = 20
  for ($i = 1; $i -le $max; $i++) {
    Write-Host "Waiting for Valkey ($i/$max)..."
    docker compose @(Get-ComposeBase) exec -T valkey valkey-cli ping 2>$null
    if ($LASTEXITCODE -eq 0) { Write-Host "Valkey: healthy"; return }
    Start-Sleep -Seconds 3
  }
  Write-RuntimeDoctor -Reason "Valkey health check failed after $max attempts" -Service "valkey"
  throw "Valkey did not become healthy after $max attempts"
}

function Invoke-ValkeySmoke {
  Write-Host "`n--- Valkey smoke ---"
  docker compose @(Get-ComposeBase) exec -T valkey valkey-cli ping
  if ($LASTEXITCODE -ne 0) { throw "Valkey smoke failed" }
  Write-Host "Valkey smoke: PASS"
}

function Invoke-WltFinancialProviderSmoke {
  Write-Host "`n--- WLT financial provider smoke ---"
  if ($env:WLT_MUTATIONS_ENABLED -ne "true") {
    Write-Host "  Skipping: WLT_MUTATIONS_ENABLED is not true"
    return
  }
  pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $script:RepoRoot "tools/scripts/smoke-wlt-provider-through-wlt.ps1") -BaseUrl "http://localhost:58083"
  if ($LASTEXITCODE -ne 0) { throw "WLT financial provider smoke failed" }
}

function Invoke-WltPsql {
  param([string]$Sql)
  $result = $Sql |
    docker compose @(Get-ComposeBase) exec -T postgres `
      psql -U wlt_runtime -d wlt_runtime -v ON_ERROR_STOP=1 -tA
  if ($LASTEXITCODE -ne 0) { throw "WLT psql command failed (exit $LASTEXITCODE)" }
  return ($result -join "`n").Trim()
}

# Probe map + backfill-decision logic shared with
# tools/scripts/test-wlt-migration-ledger.ps1 (see that file's header comment).
. (Join-Path $ScriptDir "wlt-migration-probes.ps1")

function Invoke-WltMigrate {
  $MigrationDir = "services/wlt/database/migrations"
  $MigrationFiles = Get-ChildItem -LiteralPath $MigrationDir -Filter "*.sql" | Sort-Object Name
  if ($MigrationFiles.Count -eq 0) { throw "No migration files found in $MigrationDir" }
  Test-WltMigrationProbeCoverage -MigrationFiles $MigrationFiles
  Write-Host "`n--- Applying WLT migrations ---"

  # Migration ledger: each applied file is recorded with its checksum so a
  # re-run applies only new migrations and refuses silently-edited history.
  Invoke-WltPsql @"
CREATE TABLE IF NOT EXISTS runtime_schema_migrations (
  migration_name TEXT        PRIMARY KEY,
  checksum       TEXT        NOT NULL,
  applied_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"@ | Out-Null

  # On an environment where migrations already ran before this ledger
  # existed, backfill the ledger (without replaying history) only for the
  # contiguous prefix of migrations whose schema objects are verified
  # present via $script:WltMigrationProbes. Any migration beyond that
  # verified prefix falls through to the normal apply loop below and is
  # genuinely executed, exactly as it would be on a fresh database.
  $LedgerRowCount = Invoke-WltPsql "SELECT COUNT(*) FROM runtime_schema_migrations;"
  $SentinelExists = Invoke-WltPsql "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'wlt_payment_sessions';"
  if ($LedgerRowCount -eq "0" -and $SentinelExists -ne "0") {
    Write-Host "  Detected pre-existing WLT schema with no migration ledger; probing each migration's schema objects before backfilling."
    $backfillList = Get-WltLegacyBackfillList -MigrationFiles $MigrationFiles -PsqlRunner ${function:Invoke-WltPsql}
    foreach ($f in $backfillList) {
      $checksum = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
      Invoke-WltPsql @"
INSERT INTO runtime_schema_migrations (migration_name, checksum)
VALUES ('$($f.Name)', '$checksum')
ON CONFLICT (migration_name) DO NOTHING;
"@ | Out-Null
      Write-Host "  Backfilled (schema already present): $($f.Name)"
    }
  }

  foreach ($f in $MigrationFiles) {
    $checksum = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    $recorded = Invoke-WltPsql "SELECT checksum FROM runtime_schema_migrations WHERE migration_name = '$($f.Name)';"
    if ($recorded -eq $checksum) {
      Write-Host "  Skipping (already applied): $($f.Name)"
      continue
    }
    if ($recorded -ne "") {
      throw "Migration ledger checksum mismatch for $($f.Name): recorded $recorded, file $checksum. Applied migrations must never be edited; add a new migration instead."
    }
    Write-Host "  Applying: $($f.Name)"
    Get-Content -LiteralPath $f.FullName -Raw |
      docker compose @(Get-ComposeBase) exec -T postgres `
        psql -U wlt_runtime -d wlt_runtime -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "WLT migration failed for $($f.Name) (exit $LASTEXITCODE)" }
    Invoke-WltPsql @"
INSERT INTO runtime_schema_migrations (migration_name, checksum)
VALUES ('$($f.Name)', '$checksum')
ON CONFLICT (migration_name) DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = NOW();
"@ | Out-Null
    Write-Host "  $($f.Name): PASS"
  }
  Write-Host "WLT migration: PASS"
}

function Invoke-WltSeed {
  $SeedDir = "services/wlt/database/seeds/local"
  $SeedFiles = Get-ChildItem -LiteralPath $SeedDir -Filter "*.sql" | Sort-Object Name
  if ($SeedFiles.Count -eq 0) { throw "No seed files found in $SeedDir" }
  Write-Host "`n--- Applying WLT local seeds ---"
  foreach ($f in $SeedFiles) {
    Write-Host "  Seeding: $($f.Name)"
    Get-Content -LiteralPath $f.FullName -Raw |
      docker compose @(Get-ComposeBase) exec -T postgres `
        psql -U wlt_runtime -d wlt_runtime -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "WLT seed failed for $($f.Name) (exit $LASTEXITCODE)" }
    Write-Host "  $($f.Name): PASS"
  }
  Write-Host "WLT seed: PASS"
}

function Invoke-WltSmoke {
  Write-Host "`n--- WLT API smoke ---"

  $health = Invoke-RestMethod "http://localhost:58083/wlt/health" -TimeoutSec 10 -ErrorAction Stop
  Write-Host "  /wlt/health: $($health | ConvertTo-Json -Compress)"
  if ($health.status -ne "healthy") { throw "/wlt/health not healthy: $($health.status)" }

  $readiness = Invoke-RestMethod "http://localhost:58083/wlt/readiness" -TimeoutSec 10 -ErrorAction Stop
  Write-Host "  /wlt/readiness: $($readiness | ConvertTo-Json -Compress)"
  if ($readiness.status -ne "ready") { throw "/wlt/readiness not ready: $($readiness.status)" }

  $payRef = Invoke-RestMethod "http://localhost:58083/wlt/references/payment-status?orderId=order-dev-0001" -TimeoutSec 10 -ErrorAction Stop
  Write-Host "  /wlt/references/payment-status: $($payRef.reference.status)"
  if ($payRef.reference.status -ne "captured") { throw "/wlt/references/payment-status wrong status" }

  $walRef = Invoke-RestMethod "http://localhost:58083/wlt/references/wallet-status?actorId=partner-dev-0001&actorType=partner" -TimeoutSec 10 -ErrorAction Stop
  Write-Host "  /wlt/references/wallet-status: $($walRef.reference.status)"
  if ($walRef.reference.status -ne "active") { throw "/wlt/references/wallet-status wrong status" }

  $wltDshServiceToken = $env:WLT_DSH_SERVICE_TOKEN
  if ([string]::IsNullOrWhiteSpace($wltDshServiceToken)) { throw "WLT_DSH_SERVICE_TOKEN is required for WLT smoke" }

  $sessionBody = @{
    checkoutIntentId = "checkout-smoke-0001"
    clientId = "client-local-001"
    storeId = "store-test-grocery"
    paymentMethod = "cod"
    amountMinorUnits = 1000
    currency = "YER"
    cartSnapshotHash = "runtime-smoke-cart-snapshot"
  } | ConvertTo-Json
  $wltServiceHeaders = @{
    Authorization = "Bearer $wltDshServiceToken"
    "X-Service-Caller" = "dsh"
    "Idempotency-Key" = "smoke-payment-session-0001"
    "X-Correlation-ID" = "smoke-payment-session-0001"
  }
  $session = Invoke-RestMethod "http://localhost:58083/wlt/payment-sessions" -Method Post -Headers $wltServiceHeaders -ContentType "application/json" -Body $sessionBody -TimeoutSec 10 -ErrorAction Stop
  Write-Host "  /wlt/payment-sessions POST: $($session.paymentSession.id)"
  if ([string]::IsNullOrWhiteSpace($session.paymentSession.id)) { throw "/wlt/payment-sessions did not return id" }
  $sessionRead = Invoke-RestMethod "http://localhost:58083/wlt/payment-sessions/$($session.paymentSession.id)" -TimeoutSec 10 -ErrorAction Stop
  Write-Host "  /wlt/payment-sessions GET: $($sessionRead.paymentSession.status)"
  if ($sessionRead.paymentSession.status -ne "reference_created") { throw "/wlt/payment-sessions wrong status" }

  Write-Host "WLT API smoke: PASS"
}

function Wait-ForMinIO {
  Write-Host "`n--- Waiting for MinIO ---"
  $MinioPort = if ($env:BTHWANI_MINIO_API_PORT) { $env:BTHWANI_MINIO_API_PORT } else { "59000" }
  $MinioUrl = "http://localhost:$MinioPort"
  $max = 15
  for ($i = 1; $i -le $max; $i++) {
    Write-Host "  /minio/health/live attempt $i/$max"
    try {
      Invoke-RestMethod "$MinioUrl/minio/health/live" -TimeoutSec 5 -ErrorAction Stop | Out-Null
      Write-Host "  /minio/health/live: PASS"
      break
    } catch {
      if ($i -eq $max) { throw "/minio/health/live: FAIL - $_" }
      Start-Sleep -Seconds 3
    }
  }
  Invoke-RestMethod "$MinioUrl/minio/health/ready" -TimeoutSec 10 -ErrorAction Stop | Out-Null
  Write-Host "  /minio/health/ready: PASS"
}

function Invoke-MinioSmoke {
  Wait-ForMinIO
  Write-Host "MinIO smoke: PASS"
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

function Invoke-DshMediaSeed {
  Write-Host "`n--- Applying Store Discovery MinIO media seed ---"

  # dsh-032_central_catalog_seed.local.sql inserts dsh_catalog_assets rows with
  # status='approved', and dsh-001_store_discovery.local.sql / dsh-002_home_discovery.local.sql
  # write hero/logo/banner/promo image URLs directly, for exactly these object
  # keys. If any file listed here is missing, those SQL seeds would create rows
  # pointing at a MinIO object that was never uploaded -- the exact drift this
  # check exists to prevent.
  $ManifestPath = (Resolve-Path "services/dsh/database/seeds/local/media/media-manifest.json").Path
  $Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
  $ExpectedFiles = $Manifest.media | Select-Object -ExpandProperty relativeSourcePath

  $MediaDirectory = (Resolve-Path "services/dsh/database/seeds/local/media").Path
  $Missing = $ExpectedFiles | Where-Object { -not (Test-Path (Join-Path $MediaDirectory $_)) }
  if ($Missing.Count -gt 0) {
    throw "DSH media seed: missing expected seed file(s) in $MediaDirectory : $($Missing -join ', ')"
  }

  $Mount = "${MediaDirectory}:/seed:ro"
  $rootUser = if ([string]::IsNullOrWhiteSpace($env:BTHWANI_MINIO_ROOT_USER)) { "bthwani_minio" } else { $env:BTHWANI_MINIO_ROOT_USER }
  $rootPassword = if ([string]::IsNullOrWhiteSpace($env:BTHWANI_MINIO_ROOT_PASSWORD)) { "bthwani_minio_password" } else { $env:BTHWANI_MINIO_ROOT_PASSWORD }
  docker run --rm --network bthwani-runtime --volume $Mount `
    --entrypoint /bin/sh minio/mc:RELEASE.2025-08-13T08-35-41Z `
    -c "mc alias set local http://minio:9000 '$rootUser' '$rootPassword' && mc mb --ignore-existing local/dsh-media && mc cp --recursive /seed/ local/dsh-media/"
  if ($LASTEXITCODE -ne 0) { throw "DSH media seed failed (exit $LASTEXITCODE)" }

  # Verify every expected object actually landed in MinIO -- mc cp exiting 0
  # doesn't by itself prove each individual object stat succeeds afterward.
  foreach ($file in $ExpectedFiles) {
    docker run --rm --network bthwani-runtime `
      --entrypoint /bin/sh minio/mc:RELEASE.2025-08-13T08-35-41Z `
      -c "mc alias set local http://minio:9000 '$rootUser' '$rootPassword' >/dev/null && mc stat local/dsh-media/$file >/dev/null" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "DSH media seed: object dsh-media/$file not found in MinIO after upload" }
  }

  Write-Host "DSH media seed: PASS ($($ExpectedFiles.Count) objects verified)"
}

function Invoke-DshDevBootstrap {
  Write-Host "`n--- DSH API Dev Bootstrap ---"
  node tools/scripts/bootstrap-dev-data.mjs
  if ($LASTEXITCODE -ne 0) { throw "DSH API Dev Bootstrap failed (exit $LASTEXITCODE)" }
  Write-Host "DSH API Dev Bootstrap: PASS"
}

function Invoke-DshSmoke {
  Write-Host "`n--- DSH API smoke ---"

  $health = Invoke-RestMethod "http://localhost:58080/dsh/health" -TimeoutSec 10 -ErrorAction Stop
  Write-Host "  /dsh/health: $($health | ConvertTo-Json -Compress)"
  if ($health.status -ne "healthy") { throw "/dsh/health not healthy: $($health.status)" }

  $readiness = $null
  $readinessReady = $false
  for ($i = 1; $i -le 10; $i++) {
    try {
      $readiness = Invoke-RestMethod "http://localhost:58080/dsh/readiness" -TimeoutSec 10 -ErrorAction Stop
      Write-Host "  /dsh/readiness attempt $i/10: $($readiness | ConvertTo-Json -Compress)"
      if ($readiness.status -eq "ready") {
        $readinessReady = $true
        break
      }
    } catch {
      Write-Host "  /dsh/readiness attempt $i/10 not ready: $_"
    }
    Start-Sleep -Seconds 3
  }
  if (-not $readinessReady) { throw "/dsh/readiness not ready after retries" }

  $stores = Invoke-RestMethod "http://localhost:58080/dsh/stores?limit=10&offset=0" -TimeoutSec 10 -ErrorAction Stop
  $count = if ($stores.stores) { $stores.stores.Count } else { 0 }
  Write-Host "  /dsh/stores: returned $count stores"
  if ($null -eq $stores.stores) { throw "/dsh/stores missing 'stores' field" }
  if ($count -eq 0) { throw "/dsh/stores returned 0 stores — seed may not have run" }

  $store1 = Invoke-RestMethod "http://localhost:58080/dsh/stores/store-test-grocery" -TimeoutSec 10 -ErrorAction Stop
  Write-Host "  /dsh/stores/store-test-grocery: $($store1.store.displayName)"
  if ($store1.store.id -ne "store-test-grocery") { throw "/dsh/stores/store-test-grocery returned wrong id" }

  $identityPassword = if ([string]::IsNullOrWhiteSpace($env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD)) {
    "123456"
  } else {
    $env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD
  }
  function Get-LocalActorToken([string] $Username) {
    $loginBody = @{
      username = $Username
      password = $identityPassword
      deviceFingerprint = "dsh-runtime-smoke"
    } | ConvertTo-Json
    $login = Invoke-RestMethod "http://localhost:58082/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -TimeoutSec 10
    return $login.accessToken
  }

  $operatorToken = Get-LocalActorToken "operator"
  $operatorHeaders = @{ Authorization = "Bearer $operatorToken" }
  $operatorStores = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores" -Headers $operatorHeaders -TimeoutSec 10
  if ($operatorStores.stores.Count -lt 1) { throw "operator store list returned no stores" }
  $operatorStore = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/store-test-grocery" -Headers $operatorHeaders -TimeoutSec 10
  $governanceHeaders = @{
    Authorization = "Bearer $operatorToken"
    "Idempotency-Key" = "smoke-operator-$([guid]::NewGuid())"
    "X-Correlation-ID" = "smoke-operator-$([guid]::NewGuid())"
  }
  $governanceBody = @{
    expectedVersion = $operatorStore.store.version
    action = "visibility"
    value = "visible"
    reason = "runtime smoke verification"
  } | ConvertTo-Json
  $governance = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/store-test-grocery/governance" -Method Post -Headers $governanceHeaders -ContentType "application/json" -Body $governanceBody -TimeoutSec 10
  if ($governance.audit.actorRole -ne "operator") { throw "operator governance audit missing" }

  # DSH-JOURNEY-001: prove the publication gate changes persisted state.
  $hideHeaders = @{
    Authorization = "Bearer $operatorToken"
    "Idempotency-Key" = "smoke-hide-$([guid]::NewGuid())"
    "X-Correlation-ID" = "smoke-hide-$([guid]::NewGuid())"
  }
  $hideBody = @{
    expectedVersion = $governance.store.version
    action = "marketing-visibility"
    value = "hidden"
    reason = "runtime publication gate verification"
  } | ConvertTo-Json
  $hidden = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/store-test-grocery/governance" -Method Post -Headers $hideHeaders -ContentType "application/json" -Body $hideBody -TimeoutSec 10
  try {
    Invoke-RestMethod "http://localhost:58080/dsh/stores/store-test-grocery" -TimeoutSec 10 -ErrorAction Stop | Out-Null
    throw "store remained publicly visible after marketing gate was hidden"
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 404) { throw }
  }
  $showHeaders = @{
    Authorization = "Bearer $operatorToken"
    "Idempotency-Key" = "smoke-show-$([guid]::NewGuid())"
    "X-Correlation-ID" = "smoke-show-$([guid]::NewGuid())"
  }
  $showBody = @{
    expectedVersion = $hidden.store.version
    action = "marketing-visibility"
    value = "visible"
    reason = "restore runtime publication gate"
  } | ConvertTo-Json
  $visible = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/store-test-grocery/governance" -Method Post -Headers $showHeaders -ContentType "application/json" -Body $showBody -TimeoutSec 10
  $publicStore = Invoke-RestMethod "http://localhost:58080/dsh/stores/store-test-grocery" -TimeoutSec 10
  if (-not $publicStore.store.publicationEligible) { throw "store publication gates were not restored" }

  # DSH-JOURNEY-002: product proposal, transition pipeline, and assortment management
  $partnerToken = Get-LocalActorToken "bthwani"
  $partnerHeaders = @{
    Authorization = "Bearer $partnerToken"
    "X-Correlation-ID" = "smoke-catalog-$([guid]::NewGuid())"
  }
  $proposalBody = @{
    proposedNameAr = "منتج فحص الشريك"
    proposedNameEn = "Partner Smoke Product"
    domainId = "domain-groceries"
    categoryNodeId = "node-supermarket"
    brand = "بثواني"
    sourceSurface = "app-partner"
  } | ConvertTo-Json
  $proposal = Invoke-RestMethod "http://localhost:58080/dsh/partner/catalog/product-proposals" -Method Post -Headers $partnerHeaders -ContentType "application/json" -Body $proposalBody -TimeoutSec 10
  if ([string]::IsNullOrWhiteSpace($proposal.proposal.id)) { throw "product proposal create did not persist" }

  $operatorToken = Get-LocalActorToken "operator"
  $operatorHeaders = @{
    Authorization = "Bearer $operatorToken"
    "X-Correlation-ID" = "smoke-operator-$([guid]::NewGuid())"
  }

  # Transition to partner-review
  $transBody1 = @{ nextStatus = "partner-review"; note = "smoke partner review" } | ConvertTo-Json
  $proposal = Invoke-RestMethod "http://localhost:58080/dsh/operator/catalog/product-proposals/$($proposal.proposal.id)/transition" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $transBody1 -TimeoutSec 10

  # Transition to marketing-review
  $transBody2 = @{ nextStatus = "marketing-review"; note = "smoke marketing review" } | ConvertTo-Json
  $proposal = Invoke-RestMethod "http://localhost:58080/dsh/operator/catalog/product-proposals/$($proposal.proposal.id)/transition" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $transBody2 -TimeoutSec 10

  # Transition to catalog-adopted
  $transBody3 = @{ nextStatus = "catalog-adopted"; note = "smoke adopt" } | ConvertTo-Json
  $proposal = Invoke-RestMethod "http://localhost:58080/dsh/operator/catalog/product-proposals/$($proposal.proposal.id)/transition" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $transBody3 -TimeoutSec 10
  if ([string]::IsNullOrWhiteSpace($proposal.proposal.adoptedMasterProductId)) { throw "master product was not created during adoption" }

  # Attach an image to the Master Product so it can be approved and client-visible
  $imageBody = @{ assetId = "asset-node-canned-food" } | ConvertTo-Json
  Invoke-RestMethod "http://localhost:58080/dsh/operator/catalog/master-products/$($proposal.proposal.adoptedMasterProductId)/images/primary" -Method Put -Headers $operatorHeaders -ContentType "application/json" -Body $imageBody -TimeoutSec 10

  # Transition to catalog-approved
  $transBody4 = @{ nextStatus = "catalog-approved"; note = "smoke approve" } | ConvertTo-Json
  $proposal = Invoke-RestMethod "http://localhost:58080/dsh/operator/catalog/product-proposals/$($proposal.proposal.id)/transition" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $transBody4 -TimeoutSec 10

  # Configure the store assortment price and availability
  $assortmentBody = @{
    unitPrice = 10.00
    currency = "YER"
    available = $true
    stockStatus = "in_stock"
    publicationStatus = "client_visible"
  } | ConvertTo-Json
  $assortment = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/store-test-grocery/assortment/$($proposal.proposal.adoptedMasterProductId)" -Method Put -Headers $operatorHeaders -ContentType "application/json" -Body $assortmentBody -TimeoutSec 10

  # Transition to client-visible
  $transBody5 = @{ nextStatus = "client-visible"; note = "smoke publish" } | ConvertTo-Json
  $proposal = Invoke-RestMethod "http://localhost:58080/dsh/operator/catalog/product-proposals/$($proposal.proposal.id)/transition" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $transBody5 -TimeoutSec 10

  # Verify catalog client exposure
  $publishedCatalog = Invoke-RestMethod "http://localhost:58080/dsh/stores/store-test-grocery/catalog" -TimeoutSec 10
  if ($publishedCatalog.products.Count -lt 1) { throw "approved catalog is not visible to app-client" }

  $smokeCatalogProductId = $proposal.proposal.adoptedMasterProductId


  # Partner Onboarding & Store Publication: partner lifecycle from field draft to client-visible store readiness.
  $fieldToken = Get-LocalActorToken "field"
  $fieldHeaders = @{
    Authorization = "Bearer $fieldToken"
    "X-Correlation-ID" = "smoke-partner-field-$([guid]::NewGuid())"
  }
  $partnerSuffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $partnerDraftBody = @{
    legalNameAr = "مؤسسة فحص الشركاء $partnerSuffix"
    legalNameEn = "Partner Activation Smoke $partnerSuffix"
    displayName = "شريك فحص $partnerSuffix"
    legalIdentityType = "commercial_register"
    legalIdentityNumber = "YE-SMOKE-$partnerSuffix"
    ownerName = "مالك فحص الشركاء"
    primaryPhone = "+96777$($partnerSuffix.ToString().Substring($partnerSuffix.ToString().Length - 7))"
    category = "grocery"
    notes = "Partner Onboarding & Store Publication runtime smoke"
  } | ConvertTo-Json
  $partnerDraft = Invoke-RestMethod "http://localhost:58080/dsh/field/partners/drafts" -Method Post -Headers $fieldHeaders -ContentType "application/json" -Body $partnerDraftBody -TimeoutSec 10
  if ([string]::IsNullOrWhiteSpace($partnerDraft.id)) { throw "Partner Onboarding & Store Publication draft create did not return partner id" }

  $submitBody = @{ reason = "field submitted Partner Onboarding & Store Publication smoke partner" } | ConvertTo-Json
  $submitted = Invoke-RestMethod "http://localhost:58080/dsh/field/partners/$($partnerDraft.id)/submit" -Method Post -Headers $fieldHeaders -ContentType "application/json" -Body $submitBody -TimeoutSec 10
  if ($submitted.partner.activationStatus -ne "submitted") { throw "Partner Onboarding & Store Publication submit did not reach submitted" }

  $partnerStores = Invoke-RestMethod "http://localhost:58080/dsh/operator/partners/$($partnerDraft.id)/stores" -Headers $operatorHeaders -TimeoutSec 10
  if ($partnerStores.total -lt 1) { throw "Partner Onboarding & Store Publication partner has no auto-created store" }

  $smokeStoreId = @($partnerStores.stores)[0].id
  if ([string]::IsNullOrWhiteSpace($smokeStoreId)) { throw "Partner Onboarding & Store Publication auto-created store id is empty" }

  $visitBody = @{
    storeId = $smokeStoreId
    visitNotes = "field visit for Partner Onboarding & Store Publication smoke"
    locationLatitude = 15.3229
    locationLongitude = 44.2075
    evidenceMediaRefs = @("media_visit_smoke_front.jpg")
  } | ConvertTo-Json

  $visit = Invoke-RestMethod "http://localhost:58080/dsh/field/partners/$($partnerDraft.id)/visits" -Method Post -Headers $fieldHeaders -ContentType "application/json" -Body $visitBody -TimeoutSec 10
  if ($visit.visitStatus -ne "submitted") { throw "Partner Onboarding & Store Publication field visit was not submitted" }

  $docBody = @{
    documentType = "commercial_register"
    mediaRef = "media_smoke_commercial_register.jpg"
    notes = "commercial register smoke document"
  } | ConvertTo-Json
  $doc = Invoke-RestMethod "http://localhost:58080/dsh/field/partners/$($partnerDraft.id)/documents" -Method Post -Headers $fieldHeaders -ContentType "application/json" -Body $docBody -TimeoutSec 10
  if ([string]::IsNullOrWhiteSpace($doc.id)) { throw "Partner Onboarding & Store Publication document upload did not return document id" }

  $transitionHeaders = @{
    Authorization = "Bearer $operatorToken"
    "X-Correlation-ID" = "smoke-partner-transition-$([guid]::NewGuid())"
  }
  function Invoke-PartnerTransition([string] $PartnerId, [string] $ToStatus) {
    $body = @{
      toStatus = $ToStatus
      reason = "Partner Onboarding & Store Publication runtime smoke transition to $ToStatus"
    } | ConvertTo-Json
    $result = Invoke-RestMethod "http://localhost:58080/dsh/operator/partners/$PartnerId/transition" -Method Post -Headers $transitionHeaders -ContentType "application/json" -Body $body -TimeoutSec 10
    if ($result.partner.activationStatus -ne $ToStatus) { throw "Partner Onboarding & Store Publication transition to $ToStatus failed" }
    if ($result.event.actorSurface -ne "control-panel") { throw "Partner Onboarding & Store Publication transition actor_surface was $($result.event.actorSurface)" }
    return $result
  }

  Invoke-PartnerTransition $partnerDraft.id "documents_uploaded" | Out-Null
  $reviewBody = @{
    decision = "approved"
    reason = "Partner Onboarding & Store Publication smoke review approved"
  } | ConvertTo-Json
  $review = Invoke-RestMethod "http://localhost:58080/dsh/operator/partners/$($partnerDraft.id)/documents/$($doc.id)/review" -Method Patch -Headers $operatorHeaders -ContentType "application/json" -Body $reviewBody -TimeoutSec 10
  if ($review.document.documentStatus -ne "approved") { throw "Partner Onboarding & Store Publication document review did not approve document" }

  foreach ($toStatus in @("documents_verified", "ops_review", "ops_approved", "partner_active")) {
    Invoke-PartnerTransition $partnerDraft.id $toStatus | Out-Null
  }

  function Invoke-SmokeStoreGovernance([string] $StoreId, [string] $Action, [string] $Value) {
    $detail = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/$StoreId" -Headers $operatorHeaders -TimeoutSec 10

    if (-not $detail.store.version) {
      throw "Partner Onboarding & Store Publication could not read store version for $StoreId"
    }

    $headers = @{}
    foreach ($key in $operatorHeaders.Keys) {
      $headers[$key] = $operatorHeaders[$key]
    }

    $headers["X-Correlation-ID"] = "smoke-store-governance-$Action-$([guid]::NewGuid())"
    $headers["Idempotency-Key"]  = "smoke-$StoreId-$Action-$([guid]::NewGuid())"

    $body = @{
      expectedVersion = [int]$detail.store.version
      action = $Action
      value = $Value
      reason = "Partner Onboarding & Store Publication runtime smoke: $Action => $Value"
    } | ConvertTo-Json

    $result = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/$StoreId/governance" -Method Post -Headers $headers -ContentType "application/json" -Body $body -TimeoutSec 10

    if (-not $result.store) {
      throw "Partner Onboarding & Store Publication governance failed for $Action => $Value"
    }

    return $result.store
  }

  Invoke-SmokeStoreGovernance $smokeStoreId "lifecycle" "active" | Out-Null
  Invoke-SmokeStoreGovernance $smokeStoreId "visibility" "visible" | Out-Null
  Invoke-SmokeStoreGovernance $smokeStoreId "serviceability" "serviceable" | Out-Null
  Invoke-SmokeStoreGovernance $smokeStoreId "partner-readiness" "ready" | Out-Null
  Invoke-SmokeStoreGovernance $smokeStoreId "catalog-approval" "approved" | Out-Null
  Invoke-SmokeStoreGovernance $smokeStoreId "marketing-visibility" "visible" | Out-Null

  Invoke-PartnerTransition $partnerDraft.id "client_visible" | Out-Null
  $readiness = Invoke-RestMethod "http://localhost:58080/dsh/operator/partners/$($partnerDraft.id)/readiness" -Headers $operatorHeaders -TimeoutSec 10
  if ($readiness.partnerId -ne $partnerDraft.id) { throw "Partner Onboarding & Store Publication readiness response did not match partner" }
  $audit = Invoke-RestMethod "http://localhost:58080/dsh/operator/partners/$($partnerDraft.id)/audit" -Headers $operatorHeaders -TimeoutSec 10
  if ($audit.events.Count -lt 7) { throw "Partner Onboarding & Store Publication audit did not include the full transition chain" }
  if ($audit.events[$audit.events.Count - 1].toStatus -ne "client_visible") { throw "Partner Onboarding & Store Publication audit final status is not client_visible" }
  $linkedStore = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/$smokeStoreId" -Headers $operatorHeaders -TimeoutSec 10
  if ($linkedStore.store.partnerReadiness -ne "ready") { throw "Partner Onboarding & Store Publication linked store partner_readiness is not ready" }

  $partnerSelfStatus = Invoke-RestMethod "http://localhost:58080/dsh/partner/activation/status" -Headers $partnerHeaders -TimeoutSec 10
  if ([string]::IsNullOrWhiteSpace($partnerSelfStatus.activationStatus)) { throw "Partner Onboarding & Store Publication partner self status missing activationStatus" }
  $partnerSelfReadiness = Invoke-RestMethod "http://localhost:58080/dsh/partner/activation/readiness" -Headers $partnerHeaders -TimeoutSec 10
  if ([string]::IsNullOrWhiteSpace($partnerSelfReadiness.partnerId)) { throw "Partner Onboarding & Store Publication partner self readiness missing partnerId" }
  Write-Host "  Partner Onboarding & Store Publication partner lifecycle smoke: PASS"

  if ($script:ProfileList -contains "wlt") {
    $clientToken = Get-LocalActorToken "client"
    $clientHeaders = @{
      Authorization = "Bearer $clientToken"
      "X-Correlation-ID" = "smoke-checkout-$([guid]::NewGuid())"
    }
    $cartBody = @{
      storeId = "store-test-grocery"
      fulfillmentMode = "bthwani_delivery"
      masterProductId = $smokeCatalogProductId
      quantity = 1
    } | ConvertTo-Json
    $cartItem = Invoke-RestMethod "http://localhost:58080/dsh/client/cart/items" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body $cartBody -TimeoutSec 10
    if ([string]::IsNullOrWhiteSpace($cartItem.cartId)) { throw "cart item did not return cartId" }
    $checkoutBody = @{
      cartId = $cartItem.cartId
      storeId = "store-test-grocery"
      fulfillmentMode = "bthwani_delivery"
      paymentMethod = "cod"
      deliveryAddress = "runtime smoke checkout address"
      note = "runtime Checkout & WLT Handoff smoke"
    } | ConvertTo-Json
    $checkout = Invoke-RestMethod "http://localhost:58080/dsh/client/checkout-intents" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body $checkoutBody -TimeoutSec 10
    Write-Host "  /dsh/client/checkout-intents: $($checkout.intent.id) / WLT=$($checkout.intent.wltPaymentSessionId)"
    if ([string]::IsNullOrWhiteSpace($checkout.intent.wltPaymentSessionId)) { throw "checkout intent missing WLT payment session reference" }
    $operatorCheckout = Invoke-RestMethod "http://localhost:58080/dsh/operator/checkout-intents" -Headers $operatorHeaders -TimeoutSec 10
    if ($operatorCheckout.intents.Count -lt 1) { throw "operator checkout intent list returned no rows" }
  } else {
    Write-Host "  Checkout & WLT Handoff checkout handoff smoke skipped because wlt profile is not active."
  }

  foreach ($actor in @(
    @{ username = "bthwani"; expectedRole = "partner" },
    @{ username = "field"; expectedRole = "field" },
    @{ username = "captain"; expectedRole = "captain" }
  )) {
    $token = Get-LocalActorToken $actor.username
    $headers = @{ Authorization = "Bearer $token" }
    $context = Invoke-RestMethod "http://localhost:58080/dsh/store-context" -Headers $headers -TimeoutSec 10
    if ($context.actorRole -ne $actor.expectedRole) { throw "wrong actor role for $($actor.username)" }
    if ([string]::IsNullOrWhiteSpace($context.store.id)) { throw "missing scoped store for $($actor.username)" }
  }


  # Home Discovery: Home Discovery endpoint smoke
  $homeDisc = Invoke-RestMethod "http://localhost:58080/dsh/home-discovery" -TimeoutSec 10 -ErrorAction Stop
  $bannerCount    = if ($homeDisc.banners)    { $homeDisc.banners.Count }    else { 0 }
  $promoCount     = if ($homeDisc.promos)     { $homeDisc.promos.Count }     else { 0 }
  $categoryCount  = if ($homeDisc.categories) { $homeDisc.categories.Count } else { 0 }
  $filterCount    = if ($homeDisc.filters)    { $homeDisc.filters.Count }    else { 0 }
  $homeStoreCount = if ($homeDisc.stores)     { $homeDisc.stores.Count }     else { 0 }
  Write-Host "  /dsh/home-discovery: banners=$bannerCount promos=$promoCount categories=$categoryCount filters=$filterCount stores=$homeStoreCount"
  if ($bannerCount    -eq 0) { throw "/dsh/home-discovery: 0 banners" }
  if ($promoCount     -eq 0) { throw "/dsh/home-discovery: 0 promos" }
  if ($categoryCount  -eq 0) { throw "/dsh/home-discovery: 0 categories" }
  if ($filterCount    -eq 0) { throw "/dsh/home-discovery: 0 filters" }
  if ($homeStoreCount -eq 0) { throw "/dsh/home-discovery: 0 stores" }

  Write-Host "DSH API smoke: PASS"
}

# ── Action: up ────────────────────────────────────────────────────────────────
if ($Action -eq "up") {
  Write-Host "=== runtime:up (profiles: $($ProfileList -join ','))"
  docker info | Out-Null
  
  # Start postgres first to allow migrations
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d postgres
  Wait-ForPostgres

  # Run database migrations safely (safe upgrade)
  if ($ProfileList -contains "identity") {
    Invoke-IdentityMigrate
  }
  if ($ProfileList -contains "workforce") {
    Invoke-WorkforceMigrate
  }
  if ($ProfileList -contains "wlt") {
    Invoke-WltMigrate
  }
  if ($ProfileList -contains "dsh") {
    Invoke-Migrate
  }

  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d
  Write-Host "Containers started."

  if ($ProfileList -contains "identity") {
    Wait-ForIdentityApi
  }
  if ($ProfileList -contains "workforce") {
    Wait-ForWorkforceApi
  }
  if ($ProfileList -contains "wlt") {
    Wait-ForWltApi
  }
  if ($ProfileList -contains "dsh") {
    Wait-ForDshApi
  }
  if (($ProfileList -contains "media") -or ($ProfileList -contains "dsh")) {
    Wait-ForMinIO
  }
  Write-Host "runtime:up: PASS"
}

# ── Action: down ──────────────────────────────────────────────────────────────
elseif ($Action -eq "down") {
  Write-Host "=== runtime:down"
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) down --remove-orphans
}

# ── Action: reset ─────────────────────────────────────────────────────────────
elseif ($Action -eq "reset") {
  if (-not $Force) {
    throw "runtime reset is a destructive operation. You must provide the -Force flag to proceed."
  }
  Write-Host "=== runtime:reset (profiles: $($ProfileList -join ','))"
  docker info | Out-Null
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) down -v --remove-orphans
  Write-Host "Volumes removed. Restarting..."

  # Start database first to avoid API health checks deadlocking on missing tables
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d postgres
  Wait-ForPostgres

  # Run database migrations before starting the API containers
  if ($ProfileList -contains "identity") {
    Invoke-IdentityMigrate
  }
  if ($ProfileList -contains "workforce") {
    Invoke-WorkforceMigrate
  }
  if ($ProfileList -contains "wlt") {
    Invoke-WltMigrate
    Invoke-WltSeed
  }
  if ($ProfileList -contains "dsh") {
    Invoke-Migrate
    Invoke-Seed
  }

  # Start the remaining containers
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d

  # Wait for APIs and run smoke tests
  if ($ProfileList -contains "identity") {
    Wait-ForIdentityApi
    Invoke-IdentitySmoke
    Start-DshApi
  }
  if ($ProfileList -contains "workforce") {
    Wait-ForWorkforceApi
    Invoke-WorkforceSmoke
  }
  if ($ProfileList -contains "dsh") {
    Wait-ForDshApi
    Invoke-DshSmoke
  }
  if ($ProfileList -contains "wlt") {
    Wait-ForWltApi
    Invoke-WltSmoke
  }
  if ($ProfileList -contains "financial-simulators") {
    Wait-ForWireMockFinancialProvider
    Invoke-WireMockFinancialSmoke
    Invoke-WltFinancialProviderSmoke
  }
  if ($ProfileList -contains "mail") {
    Wait-ForMailpit
    Invoke-MailpitSmoke
  }
  if ($ProfileList -contains "cache") {
    Wait-ForValkey
    Invoke-ValkeySmoke
  }
  Write-Host "reset: PASS"
}

elseif ($Action -eq "bootstrap-dev") {
  if ($env:NODE_ENV -eq "production") {
    throw "bootstrap-dev is not allowed in production."
  }
  if (-not $Force) {
    throw "bootstrap-dev requires -Force flag."
  }
  Write-Host "=== runtime:bootstrap-dev (profiles: $($ProfileList -join ','))"
  if ($ProfileList -contains "identity") {
    Wait-ForIdentityApi
  }
  if ($ProfileList -contains "dsh") {
    Wait-ForMinIO
    Invoke-MinioInit
    Invoke-DshMediaSeed
    Wait-ForDshApi
    Invoke-DshDevBootstrap
  } else {
    Write-Host "DSH profile is not active. Skipping bootstrap."
  }
}

# ── Action: verify-catalog ────────────────────────────────────────────────────
elseif ($Action -eq "verify-catalog") {
  Write-Host "=== runtime:verify-catalog"
  pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/verify-catalog.ps1
  if ($LASTEXITCODE -ne 0) { throw "verify-catalog failed (exit $LASTEXITCODE)" }
  Write-Host "verify-catalog: PASS"
}

# ── Action: status ────────────────────────────────────────────────────────────
elseif ($Action -eq "status") {
  Write-Host "=== runtime:status"
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) ps
  Write-Host "`n--- docker ps ---"
  docker ps --format "table {{.Names}}`t{{.Image}}`t{{.Status}}`t{{.Ports}}"
}

# ── Action: logs ──────────────────────────────────────────────────────────────
elseif ($Action -eq "logs") {
  Write-Host "=== runtime:logs"
  if ($Service -ne "") {
    docker compose @(Get-ComposeBase) logs --tail=100 $Service
  } else {
    docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) logs --tail=100
  }
}

# ── Action: migrate ───────────────────────────────────────────────────────────
elseif ($Action -eq "doctor") {
  Write-RuntimeDoctor -Reason "manual doctor action" -Service $Service
}

elseif ($Action -eq "migrate") {
  Write-Host "=== runtime:migrate"
  Wait-ForPostgres
  if ($ProfileList -contains "dsh" -or $ProfileList.Count -eq 0) { Invoke-Migrate }
  if ($ProfileList -contains "identity") { Invoke-IdentityMigrate }
  if ($ProfileList -contains "workforce") { Invoke-WorkforceMigrate }
  if ($ProfileList -contains "wlt") { Invoke-WltMigrate }
}

# ── Action: seed ──────────────────────────────────────────────────────────────
elseif ($Action -eq "seed") {
  Write-Host "=== runtime:seed"
  Wait-ForPostgres
  if ($ProfileList -contains "identity") {
    Wait-ForIdentityApi
    Invoke-IdentitySmoke
  }
  if ($ProfileList -contains "dsh" -or $ProfileList.Count -eq 0) { Invoke-Seed }
  if ($ProfileList -contains "wlt") { Invoke-WltSeed }
}

# ── Action: smoke ─────────────────────────────────────────────────────────────
elseif ($Action -eq "smoke") {
  Write-Host "=== runtime:smoke (profiles: $($ProfileList -join ','))"

  if ((Get-RequiredDatabaseNames).Count -gt 0) {
    docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d postgres
    if ($LASTEXITCODE -ne 0) { throw "Postgres start failed for smoke (exit $LASTEXITCODE)" }

    Wait-ForPostgres
  } else {
    Write-Host "Postgres start skipped for smoke: selected profiles do not require Postgres."
  }

  if ($ProfileList -contains "identity") {
    Invoke-IdentityMigrate

    # BootstrapLocalActors runs only when identity-api starts. Recreate it after migrations
    # so operator/partner/field/captain/client local actors match the current Postgres volume.
    docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d --force-recreate identity-api
    if ($LASTEXITCODE -ne 0) { throw "Identity API recreate failed for smoke (exit $LASTEXITCODE)" }

    Wait-ForIdentityApi
    Invoke-IdentitySmoke
  }

  if ($ProfileList -contains "workforce") {
    Invoke-WorkforceMigrate

    docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d --force-recreate workforce-api
    if ($LASTEXITCODE -ne 0) { throw "Workforce API recreate failed for smoke (exit $LASTEXITCODE)" }

    Wait-ForWorkforceApi
    Invoke-WorkforceSmoke
  }

  if ($ProfileList -contains "wlt") {
    Invoke-WltMigrate
    Invoke-WltSeed

    docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d --force-recreate wlt-api
    if ($LASTEXITCODE -ne 0) { throw "WLT API recreate failed for smoke (exit $LASTEXITCODE)" }

    Wait-ForWltApi
    Invoke-WltSmoke
  }

  if (($ProfileList -contains "media") -or ($ProfileList -contains "dsh")) {
    docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d minio
    if ($LASTEXITCODE -ne 0) { throw "MinIO start failed for smoke (exit $LASTEXITCODE)" }

    Wait-ForMinIO
    Invoke-MinioInit
    Invoke-DshMediaSeed
  }

  if ($ProfileList -contains "dsh") {
    Invoke-Migrate
    Invoke-Seed

    docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d --force-recreate dsh-api
    if ($LASTEXITCODE -ne 0) { throw "DSH API recreate failed for smoke (exit $LASTEXITCODE)" }

    Wait-ForDshApi
    Invoke-DshSmoke
  }

  if ($ProfileList -contains "financial-simulators") {
    docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d wiremock-financial-provider
    if ($LASTEXITCODE -ne 0) { throw "WireMock financial provider start failed for smoke (exit $LASTEXITCODE)" }

    Wait-ForWireMockFinancialProvider
    Invoke-WireMockFinancialSmoke
    Invoke-WltFinancialProviderSmoke
  }

  if ($ProfileList -contains "mail") {
    docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d mailpit
    if ($LASTEXITCODE -ne 0) { throw "Mailpit start failed for smoke (exit $LASTEXITCODE)" }

    Wait-ForMailpit
    Invoke-MailpitSmoke
  }

  if ($ProfileList -contains "cache") {
    docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d valkey
    if ($LASTEXITCODE -ne 0) { throw "Valkey start failed for smoke (exit $LASTEXITCODE)" }

    Wait-ForValkey
    Invoke-ValkeySmoke
  }

  Write-Host "smoke: PASS"
}
elseif ($Action -eq "all") {
  Write-Host "=== runtime:all (profiles: $($ProfileList -join ','))"
  docker info | Out-Null

  # down
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) down -v --remove-orphans
  Write-Host "down: OK"

  # Start database first to avoid API health checks deadlocking on missing tables
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d --build postgres
  Wait-ForPostgres

  if (($ProfileList -contains "media") -or ($ProfileList -contains "dsh")) {
    docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d --build minio
    if ($LASTEXITCODE -ne 0) { throw "MinIO start failed for all (exit $LASTEXITCODE)" }
    Wait-ForMinIO
    Invoke-MinioInit
    Invoke-DshMediaSeed
  }

  # Run database migrations before starting the API containers
  if ($ProfileList -contains "identity") {
    Invoke-IdentityMigrate
  }
  if ($ProfileList -contains "workforce") {
    Invoke-WorkforceMigrate
  }
  if ($ProfileList -contains "wlt") {
    Invoke-WltMigrate
    Invoke-WltSeed
  }
  if ($ProfileList -contains "dsh") {
    Invoke-Migrate
    Invoke-Seed
  }

  # Build and start all other services
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d --build
  Write-Host "up: OK"

  # Wait for APIs and run smoke tests
  if ($ProfileList -contains "identity") {
    Wait-ForIdentityApi
    Invoke-IdentitySmoke
    Start-DshApi
  }

  if ($ProfileList -contains "workforce") {
    Wait-ForWorkforceApi
    Invoke-WorkforceSmoke
  }

  if ($ProfileList -contains "wlt") {
    Wait-ForWltApi
    Invoke-WltSmoke
  }

  if ($ProfileList -contains "dsh") {
    Wait-ForDshApi
    Invoke-DshSmoke
  }

  if ($ProfileList -contains "financial-simulators") {
    Wait-ForWireMockFinancialProvider
    Invoke-WireMockFinancialSmoke
    Invoke-WltFinancialProviderSmoke
  }

  if ($ProfileList -contains "mail") {
    Wait-ForMailpit
    Invoke-MailpitSmoke
  }

  if ($ProfileList -contains "cache") {
    Wait-ForValkey
    Invoke-ValkeySmoke
  }

  # final status
  Write-Host "`n--- Final status ---"
  docker ps --format "table {{.Names}}`t{{.Image}}`t{{.Status}}`t{{.Ports}}"

  Write-Host "`nruntime:all: PASS"
}
