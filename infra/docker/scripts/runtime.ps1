<#
.SYNOPSIS
  Central Docker Runtime Orchestrator for bthwani-suite-next.

.PARAMETER Action
  up | down | reset | status | logs | migrate | seed | smoke | all

.PARAMETER Profiles
  Comma-separated list of Docker Compose profiles to activate.
  Supported: identity, dsh, media, wlt
  Example: -Profiles identity,dsh,media or -Profiles wlt

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
$AllowedProfiles = @("identity", "dsh", "media", "wlt")
foreach ($p in $ProfileList) {
  if ($AllowedProfiles -notcontains $p) {
    throw "Unsupported profile: '$p'. Allowed: $($AllowedProfiles -join ', ')"
  }
}
if ($ProfileList -contains "dsh" -and $ProfileList -notcontains "identity") {
  $ProfileList = @("identity") + $ProfileList
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
  throw "Identity API did not become healthy after $max attempts"
}

function Invoke-IdentityMigrate {
  $MigrationDir = ".\core\identity\database\migrations"
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

function Invoke-IdentitySmoke {
  Write-Host "`n--- Identity API smoke ---"
  $health = Invoke-RestMethod "http://localhost:58082/identity/health" -TimeoutSec 10 -ErrorAction Stop
  if ($health.status -ne "healthy") { throw "/identity/health not healthy" }
  $readiness = Invoke-RestMethod "http://localhost:58082/identity/readiness" -TimeoutSec 10 -ErrorAction Stop
  if ($readiness.status -ne "ready") { throw "/identity/readiness not ready" }
  $body = @{
    username = "operator.local"
    password = $env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD
    deviceFingerprint = "runtime-smoke"
  } | ConvertTo-Json
  if ([string]::IsNullOrWhiteSpace($env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD)) {
    $body = @{
      username = "operator.local"
      password = "LocalOnly-ChangeMe-2026!"
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
  throw "WLT API did not become healthy after $max attempts"
}

function Invoke-WltMigrate {
  $MigrationDir = ".\services\wlt\database\migrations"
  $MigrationFiles = Get-ChildItem -LiteralPath $MigrationDir -Filter "*.sql" | Sort-Object Name
  if ($MigrationFiles.Count -eq 0) { throw "No migration files found in $MigrationDir" }
  Write-Host "`n--- Applying WLT migrations ---"
  foreach ($f in $MigrationFiles) {
    Write-Host "  Applying: $($f.Name)"
    Get-Content -LiteralPath $f.FullName -Raw |
      docker compose @(Get-ComposeBase) exec -T postgres `
        psql -U wlt_runtime -d wlt_runtime -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "WLT migration failed for $($f.Name) (exit $LASTEXITCODE)" }
    Write-Host "  $($f.Name): PASS"
  }
  Write-Host "WLT migration: PASS"
}

function Invoke-WltSeed {
  $SeedDir = ".\services\wlt\database\seeds\local"
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

  Write-Host "WLT API smoke: PASS"
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

  $identityPassword = if ([string]::IsNullOrWhiteSpace($env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD)) {
    "LocalOnly-ChangeMe-2026!"
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

  $operatorToken = Get-LocalActorToken "operator.local"
  $operatorHeaders = @{ Authorization = "Bearer $operatorToken" }
  $operatorStores = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores" -Headers $operatorHeaders -TimeoutSec 10
  if ($operatorStores.stores.Count -lt 1) { throw "operator store list returned no stores" }
  $operatorStore = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/store-1001" -Headers $operatorHeaders -TimeoutSec 10
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
  $governance = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/store-1001/governance" -Method Post -Headers $governanceHeaders -ContentType "application/json" -Body $governanceBody -TimeoutSec 10
  if ($governance.audit.actorRole -ne "operator") { throw "operator governance audit missing" }

  foreach ($actor in @(
    @{ username = "partner.local"; expectedRole = "partner" },
    @{ username = "field.local"; expectedRole = "field" },
    @{ username = "captain.local"; expectedRole = "captain" }
  )) {
    $token = Get-LocalActorToken $actor.username
    $headers = @{ Authorization = "Bearer $token" }
    $context = Invoke-RestMethod "http://localhost:58080/dsh/store-context" -Headers $headers -TimeoutSec 10
    if ($context.actorRole -ne $actor.expectedRole) { throw "wrong actor role for $($actor.username)" }
    if ([string]::IsNullOrWhiteSpace($context.store.id)) { throw "missing scoped store for $($actor.username)" }
  }


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
  if ($ProfileList -contains "identity") {
    Invoke-IdentityMigrate
    Wait-ForIdentityApi
    Invoke-IdentitySmoke
  }
  if ($ProfileList -contains "dsh") {
    Invoke-Migrate
    Invoke-Seed
    Wait-ForDshApi
    Invoke-DshSmoke
  }
  if ($ProfileList -contains "wlt") {
    Invoke-WltMigrate
    Invoke-WltSeed
    Wait-ForWltApi
    Invoke-WltSmoke
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
  if ($ProfileList -contains "dsh" -or $ProfileList.Count -eq 0) { Invoke-Migrate }
  if ($ProfileList -contains "identity") { Invoke-IdentityMigrate }
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
  Wait-ForPostgres

  if ($ProfileList -contains "identity") {
    Invoke-IdentityMigrate
    Wait-ForIdentityApi
    Invoke-IdentitySmoke
  }
  if ($ProfileList -contains "dsh") {
    Wait-ForDshApi
    Invoke-DshSmoke
  }
  if ($ProfileList -contains "wlt") {
    Wait-ForWltApi
    Invoke-WltSmoke
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

  if ($ProfileList -contains "dsh") {
    Invoke-Migrate
    Invoke-Seed
    Wait-ForDshApi
    Invoke-DshSmoke
  }

  if ($ProfileList -contains "wlt") {
    Invoke-WltMigrate
    Invoke-WltSeed
    Wait-ForWltApi
    Invoke-WltSmoke
  }

  if ($ProfileList -contains "media") {
    Invoke-DshMediaSeed
    Invoke-MinioSmoke
  }

  # final status
  Write-Host "`n--- Final status ---"
  docker ps --format "table {{.Names}}`t{{.Image}}`t{{.Status}}`t{{.Ports}}"

  Write-Host "`nruntime:all: PASS"
}
