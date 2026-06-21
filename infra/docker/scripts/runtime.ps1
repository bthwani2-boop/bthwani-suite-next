<#
.SYNOPSIS
  Central Docker Runtime Orchestrator for bthwani-suite-next.

.PARAMETER Action
  up | down | reset | status | logs | migrate | seed | smoke | all

.PARAMETER Profiles
  Comma-separated list of Docker Compose profiles to activate.
  Supported: dsh, media
  Example: -Profiles dsh,media

.PARAMETER Service
  (Optional) Target a specific service for logs/status.
#>

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("up", "down", "reset", "status", "logs", "migrate", "seed", "smoke", "all")]
  [string]$Action,

  [string]$Profiles = "",

  [string]$Service = ""
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath "C:\bthwani-suite-next"

$ComposeFile = ".\infra\docker\compose.runtime.yml"
$EnvFile     = ".\infra\docker\env\runtime.env.example"

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Env file not found: $EnvFile"
}

# ── Parse profiles ────────────────────────────────────────────────────────────
$ProfileList = @()
if ($Profiles -ne "") {
  $ProfileList = $Profiles.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}
$AllowedProfiles = @("dsh", "media")
foreach ($p in $ProfileList) {
  if ($AllowedProfiles -notcontains $p) {
    throw "Unsupported profile: '$p'. Allowed: $($AllowedProfiles -join ', ')"
  }
}

function Get-ComposeProfileArgs {
  $flags = @()
  foreach ($p in $script:ProfileList) { $flags += @("--profile", $p) }
  return $flags
}

function Get-ComposeBase {
  return @("--env-file", $script:EnvFile, "-f", $script:ComposeFile)
}

# ── Helpers ───────────────────────────────────────────────────────────────────

function Wait-ForPostgres {
  $max = 30
  for ($i = 1; $i -le $max; $i++) {
    Write-Host "Waiting for Postgres ($i/$max)..."
    docker compose @(Get-ComposeBase) exec -T postgres pg_isready -U bthwani_runtime -d bthwani_runtime 2>$null
    if ($LASTEXITCODE -eq 0) { Write-Host "Postgres: healthy"; return }
    Start-Sleep -Seconds 3
  }
  throw "Postgres did not become healthy after $max attempts"
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
  throw "DSH API did not become healthy after $max attempts"
}

function Invoke-Migrate {
  $MigrationDir = ".\services\dsh\database\migrations"
  $MigrationFiles = Get-ChildItem -LiteralPath $MigrationDir -Filter "*.sql" | Sort-Object Name
  if ($MigrationFiles.Count -eq 0) { throw "No migration files found in $MigrationDir" }
  Write-Host "`n--- Applying DSH migrations ---"
  foreach ($f in $MigrationFiles) {
    Write-Host "  Applying: $($f.Name)"
    Get-Content -LiteralPath $f.FullName -Raw |
      docker compose @(Get-ComposeBase) exec -T postgres `
        psql -U dsh_runtime -d dsh_runtime -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "Migration failed for $($f.Name) (exit $LASTEXITCODE)" }
    Write-Host "  $($f.Name): PASS"
  }
  Write-Host "Migration: PASS"
}

function Invoke-Seed {
  $SeedDir = ".\services\dsh\database\seeds\local"
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

function Invoke-MinioSmoke {
  Write-Host "`n--- MinIO smoke ---"
  $MinioUrl = "http://localhost:59000"
  $max = 15
  for ($i = 1; $i -le $max; $i++) {
    Write-Host "  /minio/health/live attempt $i/$max"
    try {
      Invoke-RestMethod "$MinioUrl/minio/health/live" -TimeoutSec 5 -ErrorAction Stop | Out-Null
      Write-Host "  /minio/health/live: PASS"
      break
    } catch {
      if ($i -eq $max) { throw "/minio/health/live: FAIL — $_" }
      Start-Sleep -Seconds 3
    }
  }
  Invoke-RestMethod "$MinioUrl/minio/health/ready" -TimeoutSec 10 -ErrorAction Stop | Out-Null
  Write-Host "  /minio/health/ready: PASS"
  Write-Host "MinIO smoke: PASS"
}

function Invoke-DshMediaSeed {
  Write-Host "`n--- Applying DSH-001 MinIO media seed ---"
  $MediaDirectory = (Resolve-Path ".\services\dsh\database\seeds\local\media").Path
  $Mount = "${MediaDirectory}:/seed:ro"
  docker run --rm --network bthwani-runtime --volume $Mount `
    --entrypoint /bin/sh minio/mc:RELEASE.2025-08-13T08-35-41Z `
    -c "mc alias set local http://minio:9000 bthwani_minio bthwani_minio_password && mc mb --ignore-existing local/dsh-media && mc anonymous set download local/dsh-media && mc cp --recursive /seed/ local/dsh-media/"
  if ($LASTEXITCODE -ne 0) { throw "DSH media seed failed (exit $LASTEXITCODE)" }
  Write-Host "DSH media seed: PASS"
}

function Invoke-DshSmoke {
  Write-Host "`n--- DSH API smoke ---"

  $health = Invoke-RestMethod "http://localhost:58080/dsh/health" -TimeoutSec 10 -ErrorAction Stop
  Write-Host "  /dsh/health: $($health | ConvertTo-Json -Compress)"
  if ($health.status -ne "healthy") { throw "/dsh/health not healthy: $($health.status)" }

  $readiness = Invoke-RestMethod "http://localhost:58080/dsh/readiness" -TimeoutSec 10 -ErrorAction Stop
  Write-Host "  /dsh/readiness: $($readiness | ConvertTo-Json -Compress)"
  if ($readiness.status -ne "ready") { throw "/dsh/readiness not ready: $($readiness.status)" }

  $stores = Invoke-RestMethod "http://localhost:58080/dsh/stores?limit=10&offset=0" -TimeoutSec 10 -ErrorAction Stop
  $count = if ($stores.stores) { $stores.stores.Count } else { 0 }
  Write-Host "  /dsh/stores: returned $count stores"
  if ($null -eq $stores.stores) { throw "/dsh/stores missing 'stores' field" }
  if ($count -eq 0) { throw "/dsh/stores returned 0 stores — seed may not have run" }

  $store1 = Invoke-RestMethod "http://localhost:58080/dsh/stores/store-1001" -TimeoutSec 10 -ErrorAction Stop
  Write-Host "  /dsh/stores/store-1001: $($store1.store.displayName)"
  if ($store1.store.id -ne "store-1001") { throw "/dsh/stores/store-1001 returned wrong id" }


  # DSH-002: Home Discovery endpoint smoke
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
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d
  Write-Host "Containers started."
}

# ── Action: down ──────────────────────────────────────────────────────────────
elseif ($Action -eq "down") {
  Write-Host "=== runtime:down"
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) down --remove-orphans
}

# ── Action: reset ─────────────────────────────────────────────────────────────
elseif ($Action -eq "reset") {
  Write-Host "=== runtime:reset (profiles: $($ProfileList -join ','))"
  docker info | Out-Null
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) down -v --remove-orphans
  Write-Host "Volumes removed. Restarting..."
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d
  Wait-ForPostgres
  if ($ProfileList -contains "dsh") {
    Invoke-Migrate
    Invoke-Seed
    Wait-ForDshApi
    Invoke-DshSmoke
  }
  Write-Host "reset: PASS"
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
elseif ($Action -eq "migrate") {
  Write-Host "=== runtime:migrate"
  Wait-ForPostgres
  Invoke-Migrate
}

# ── Action: seed ──────────────────────────────────────────────────────────────
elseif ($Action -eq "seed") {
  Write-Host "=== runtime:seed"
  Wait-ForPostgres
  Invoke-Seed
}

# ── Action: smoke ─────────────────────────────────────────────────────────────
elseif ($Action -eq "smoke") {
  Write-Host "=== runtime:smoke (profiles: $($ProfileList -join ','))"
  Wait-ForPostgres
  if ($ProfileList -contains "dsh") {
    Wait-ForDshApi
    Invoke-DshSmoke
  }
  if ($ProfileList -contains "media") {
    Invoke-MinioSmoke
  }
  Write-Host "smoke: PASS"
}

# ── Action: all ───────────────────────────────────────────────────────────────
elseif ($Action -eq "all") {
  Write-Host "=== runtime:all (profiles: $($ProfileList -join ','))"
  docker info | Out-Null

  # down
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) down -v --remove-orphans
  Write-Host "down: OK"

  # up
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d --build
  Write-Host "up: OK"

  # postgres ready
  Wait-ForPostgres

  # migrate + seed + dsh smoke
  if ($ProfileList -contains "dsh") {
    Invoke-Migrate
    Invoke-Seed
    Wait-ForDshApi
    Invoke-DshSmoke
  }

  # minio smoke
  if ($ProfileList -contains "media") {
    Invoke-DshMediaSeed
    Invoke-MinioSmoke
  }

  # final status
  Write-Host "`n--- Final status ---"
  docker ps --format "table {{.Names}}`t{{.Image}}`t{{.Status}}`t{{.Ports}}"

  Write-Host "`nruntime:all: PASS"
}
