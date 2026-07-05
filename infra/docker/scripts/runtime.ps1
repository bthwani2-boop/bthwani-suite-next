<#
.SYNOPSIS
  Central Docker Runtime Orchestrator for bthwani-suite-next.

.PARAMETER Action
  up | down | reset | status | logs | migrate | seed | smoke | all

.PARAMETER Profiles
  Comma-separated list of Docker Compose profiles to activate.
  Supported: identity, dsh, media, wlt, financial-simulators, mail, cache
  Example: -Profiles identity,dsh,media or -Profiles wlt,financial-simulators

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
$AllowedProfiles = @("identity", "dsh", "media", "wlt", "financial-simulators", "mail", "cache", "observability")
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

function Wait-ForPostgres {
  $max = 30
  for ($i = 1; $i -le $max; $i++) {
    Write-Host "Waiting for Postgres ($i/$max)..."
    # Ensure Postgres is up and accepting queries on the initialized runtime database
    docker compose @(Get-ComposeBase) exec -T postgres psql -U bthwani_runtime -d bthwani_runtime -c "SELECT 1" 2>$null
    if ($LASTEXITCODE -eq 0) {
      # Make sure the initialization is fully finished (which creates identity_runtime) and the real server has started
      docker compose @(Get-ComposeBase) exec -T postgres psql -U identity_runtime -d identity_runtime -c "SELECT 1" 2>$null
      if ($LASTEXITCODE -eq 0) {
        Start-Sleep -Seconds 2
        Write-Host "Postgres: healthy"
        return
      }
    }
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
  throw "Identity API did not become healthy after $max attempts"
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

function Invoke-Migrate {
  $MigrationDir = "services/dsh/database/migrations"
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

function Invoke-WltMigrate {
  $MigrationDir = "services/wlt/database/migrations"
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
    storeId = "store-1001"
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

function Invoke-MinioSmoke {
  Write-Host "`n--- MinIO smoke ---"
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
      if ($i -eq $max) { throw "/minio/health/live: FAIL — $_" }
      Start-Sleep -Seconds 3
    }
  }
  Invoke-RestMethod "$MinioUrl/minio/health/ready" -TimeoutSec 10 -ErrorAction Stop | Out-Null
  Write-Host "  /minio/health/ready: PASS"
  Write-Host "MinIO smoke: PASS"
}

function Invoke-DshMediaSeed {
  Write-Host "`n--- Applying Store Discovery MinIO media seed ---"
  $MediaDirectory = (Resolve-Path "services/dsh/database/seeds/local/media").Path
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
  $hidden = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/store-1001/governance" -Method Post -Headers $hideHeaders -ContentType "application/json" -Body $hideBody -TimeoutSec 10
  try {
    Invoke-RestMethod "http://localhost:58080/dsh/stores/store-1001" -TimeoutSec 10 -ErrorAction Stop | Out-Null
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
  $visible = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/store-1001/governance" -Method Post -Headers $showHeaders -ContentType "application/json" -Body $showBody -TimeoutSec 10
  $publicStore = Invoke-RestMethod "http://localhost:58080/dsh/stores/store-1001" -TimeoutSec 10
  if (-not $publicStore.store.publicationEligible) { throw "store publication gates were not restored" }

  # DSH-JOURNEY-002: partner writes real catalog rows, submits, and operator approves.
  $partnerToken = Get-LocalActorToken "bthwani"
  $partnerHeaders = @{
    Authorization = "Bearer $partnerToken"
    "X-Correlation-ID" = "smoke-catalog-$([guid]::NewGuid())"
  }
  $categoryBody = @{
    name = "تصنيف فحص $([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
    description = "runtime smoke"
    sortOrder = 90
    isActive = $true
    expectedVersion = 0
  } | ConvertTo-Json
  $category = Invoke-RestMethod "http://localhost:58080/dsh/partner/catalog/categories" -Method Post -Headers $partnerHeaders -ContentType "application/json" -Body $categoryBody -TimeoutSec 10
  $productBody = @{
    categoryId = $category.category.id
    name = "منتج فحص"
    description = "runtime smoke"
    sku = "SMOKE-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
    priceReference = "wlt-price-ref-smoke"
    unitPrice = 10
    isActive = $true
    expectedVersion = 0
  } | ConvertTo-Json
  $product = Invoke-RestMethod "http://localhost:58080/dsh/partner/catalog/products" -Method Post -Headers $partnerHeaders -ContentType "application/json" -Body $productBody -TimeoutSec 10
  if ([string]::IsNullOrWhiteSpace($product.product.id)) { throw "catalog product create did not persist" }
  $submission = Invoke-RestMethod "http://localhost:58080/dsh/partner/catalog/submit" -Method Post -Headers $partnerHeaders -TimeoutSec 10
  if ($submission.revision.status -ne "submitted") { throw "catalog submission was not persisted" }
  $storeAfterSubmit = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/store-1001" -Headers $operatorHeaders -TimeoutSec 10
  $decisionHeaders = @{
    Authorization = "Bearer $operatorToken"
    "X-Correlation-ID" = "smoke-approve-$([guid]::NewGuid())"
  }
  $decisionBody = @{
    decision = "approved"
    reason = "runtime catalog approval verification"
    expectedVersion = $storeAfterSubmit.store.version
  } | ConvertTo-Json
  $decision = Invoke-RestMethod "http://localhost:58080/dsh/operator/catalog/store-1001/decision" -Method Post -Headers $decisionHeaders -ContentType "application/json" -Body $decisionBody -TimeoutSec 10
  if ($decision.revision.status -ne "approved") { throw "catalog approval was not persisted" }
  $publishedCatalog = Invoke-RestMethod "http://localhost:58080/dsh/stores/store-1001/catalog" -TimeoutSec 10
  if ($publishedCatalog.products.Count -lt 1) { throw "approved catalog is not visible to app-client" }
  $catalogAudit = Invoke-RestMethod "http://localhost:58080/dsh/operator/catalog/store-1001/audit" -Headers $operatorHeaders -TimeoutSec 10
  if ($catalogAudit.events.Count -lt 1) { throw "catalog audit evidence is missing" }

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
      storeId = "store-1001"
      fulfillmentMode = "bthwani_delivery"
      productId = $product.product.id
      quantity = 1
    } | ConvertTo-Json
    $cartItem = Invoke-RestMethod "http://localhost:58080/dsh/client/cart/items" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body $cartBody -TimeoutSec 10
    if ([string]::IsNullOrWhiteSpace($cartItem.cartId)) { throw "cart item did not return cartId" }
    $checkoutBody = @{
      cartId = $cartItem.cartId
      storeId = "store-1001"
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

  # Start database first to avoid API health checks deadlocking on missing tables
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d postgres
  Wait-ForPostgres

  # Run database migrations before starting the API containers
  if ($ProfileList -contains "identity") {
    Invoke-IdentityMigrate
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
    Start-DshApi
  }
  if ($ProfileList -contains "wlt") {
    Invoke-WltMigrate
    Invoke-WltSeed
    Wait-ForWltApi
    Invoke-WltSmoke
  }
  if ($ProfileList -contains "dsh") {
    Wait-ForDshApi
    Invoke-DshSmoke
  }
  if ($ProfileList -contains "media") {
    Invoke-MinioSmoke
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
  Write-Host "smoke: PASS"
}

# ── Action: all ───────────────────────────────────────────────────────────────
elseif ($Action -eq "all") {
  Write-Host "=== runtime:all (profiles: $($ProfileList -join ','))"
  docker info | Out-Null

  # down
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) down -v --remove-orphans
  Write-Host "down: OK"

  # Start database first to avoid API health checks deadlocking on missing tables
  docker compose @(Get-ComposeBase) @(Get-ComposeProfileArgs) up -d --build postgres
  Wait-ForPostgres

  # Run database migrations before starting the API containers
  if ($ProfileList -contains "identity") {
    Invoke-IdentityMigrate
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

  if ($ProfileList -contains "wlt") {
    Wait-ForWltApi
    Invoke-WltSmoke
  }

  if ($ProfileList -contains "dsh") {
    Wait-ForDshApi
    Invoke-DshSmoke
  }

  if ($ProfileList -contains "media") {
    Invoke-DshMediaSeed
    Invoke-MinioSmoke
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
