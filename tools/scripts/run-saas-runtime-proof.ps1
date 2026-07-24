param()

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "../..")).Path
Set-Location -LiteralPath $RepoRoot

$RuntimeScript = Join-Path $RepoRoot "infra/docker/scripts/runtime.ps1"
$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$FinancialComposeFile = Join-Path $RepoRoot "infra/docker/compose.financial-simulators.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$BaseProfiles = "identity,workforce,dsh,wlt,financial-simulators,mail,media"
$ComposeArgs = @(
  "--env-file", $EnvFile,
  "-f", $ComposeFile,
  "-f", $FinancialComposeFile,
  "--profile", "identity",
  "--profile", "workforce",
  "--profile", "dsh",
  "--profile", "wlt",
  "--profile", "financial-simulators",
  "--profile", "mail",
  "--profile", "media",
  "--profile", "providers",
  "--profile", "platform"
)

function Import-RuntimeEnv {
  Get-Content -LiteralPath $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
    $parts = $line.Split("=", 2)
    $key = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    if (-not (Get-Item -Path "Env:$key" -ErrorAction SilentlyContinue)) {
      [Environment]::SetEnvironmentVariable($key, $value)
    }
  }
}

function Invoke-RequiredProcess {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [Parameter(Mandatory = $true)][string]$FailureMessage
  )
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$FailureMessage (exit $LASTEXITCODE)" }
}

function Invoke-Migrations {
  param(
    [Parameter(Mandatory = $true)][string]$Directory,
    [Parameter(Mandatory = $true)][string]$DatabaseUser,
    [Parameter(Mandatory = $true)][string]$DatabaseName,
    [Parameter(Mandatory = $true)][string]$Label
  )
  $files = Get-ChildItem -LiteralPath $Directory -Filter "*.sql" | Sort-Object Name
  if ($files.Count -eq 0) { throw "$Label migration directory is empty: $Directory" }
  Write-Host "`n--- Applying $Label migrations ---"
  foreach ($file in $files) {
    Write-Host "  $($file.Name)"
    Get-Content -LiteralPath $file.FullName -Raw |
      docker compose @ComposeArgs exec -T postgres psql -U $DatabaseUser -d $DatabaseName -q -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "$Label migration failed: $($file.Name)" }
  }
}

function Invoke-WltSeeds {
  $files = Get-ChildItem -LiteralPath "services/wlt/database/seeds/local" -Filter "*.sql" | Sort-Object Name
  if ($files.Count -eq 0) { throw "WLT local seed directory is empty" }
  Write-Host "`n--- Applying WLT local seeds ---"
  foreach ($file in $files) {
    Write-Host "  $($file.Name)"
    Get-Content -LiteralPath $file.FullName -Raw |
      docker compose @ComposeArgs exec -T postgres psql -U wlt_runtime -d wlt_runtime -q -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw "WLT seed failed: $($file.Name)" }
  }
}

function Wait-HttpReady {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Url,
    [int]$Attempts = 30
  )
  for ($i = 1; $i -le $Attempts; $i++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        Write-Host "$Name: ready"
        return
      }
    } catch {
      if ($i -eq $Attempts) { throw "$Name did not become ready at $Url: $_" }
    }
    Start-Sleep -Seconds 3
  }
}

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)][string]$Uri,
    [string]$Method = "GET",
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )
  $parameters = @{
    Uri = $Uri
    Method = $Method
    Headers = $Headers
    TimeoutSec = 15
    ErrorAction = "Stop"
  }
  if ($null -ne $Body) {
    $parameters.ContentType = "application/json"
    $parameters.Body = ($Body | ConvertTo-Json -Depth 10)
  }
  return Invoke-RestMethod @parameters
}

Import-RuntimeEnv

if ($env:BTHWANI_SAAS_MODE -ne "active") { throw "BTHWANI_SAAS_MODE must be active" }
if ($env:BTHWANI_COMMERCIAL_ACTIVATION_STATE -ne "authorized") { throw "commercial activation must be authorized" }
if ($env:BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED -ne "false") { throw "production deployment authorization must remain false" }
if ([string]::IsNullOrWhiteSpace($env:BTHWANI_DEFAULT_TENANT_ID)) { throw "BTHWANI_DEFAULT_TENANT_ID is required" }

Write-Host "=== SaaS runtime proof ==="
Invoke-RequiredProcess -FilePath "pwsh" -Arguments @(
  "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $RuntimeScript,
  "-Action", "up", "-Profiles", $BaseProfiles
) -FailureMessage "Base runtime start failed"

Invoke-RequiredProcess -FilePath "pwsh" -Arguments @(
  "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $RuntimeScript,
  "-Action", "bootstrap-dev", "-Profiles", $BaseProfiles, "-Force"
) -FailureMessage "Base runtime bootstrap failed"

Invoke-WltSeeds
Invoke-Migrations -Directory "core/providers/database/migrations" -DatabaseUser "providers_runtime" -DatabaseName "providers_runtime" -Label "Providers"
Invoke-Migrations -Directory "core/platform-control/database/migrations" -DatabaseUser "platform_control_runtime" -DatabaseName "platform_control_runtime" -Label "Platform Control"

Invoke-RequiredProcess -FilePath "docker" -Arguments @(
  "compose"
) -FailureMessage "Docker Compose is unavailable"

& docker compose @ComposeArgs up -d --build providers-api platform-control-api
if ($LASTEXITCODE -ne 0) { throw "Providers/Platform Control start failed (exit $LASTEXITCODE)" }

Wait-HttpReady -Name "Identity" -Url "http://localhost:58082/identity/readiness"
Wait-HttpReady -Name "Workforce" -Url "http://localhost:58086/workforce/readiness"
Wait-HttpReady -Name "DSH" -Url "http://localhost:58080/dsh/readiness"
Wait-HttpReady -Name "WLT" -Url "http://localhost:58083/wlt/readiness"
Wait-HttpReady -Name "Providers" -Url "http://localhost:58087/providers/readiness"
Wait-HttpReady -Name "Platform Control" -Url "http://localhost:58088/platform/readiness"
Wait-HttpReady -Name "MinIO" -Url "http://localhost:59000/minio/health/ready"
Wait-HttpReady -Name "WireMock" -Url "http://localhost:58090/financial/health"
Wait-HttpReady -Name "Mailpit" -Url "http://localhost:8025/api/v1/info"

$login = Invoke-JsonRequest -Uri "http://localhost:58082/auth/login" -Method "POST" -Body @{
  username = "operator"
  password = $(if ($env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD) { $env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD } else { "123456" })
  deviceFingerprint = "saas-runtime-proof"
}
if ([string]::IsNullOrWhiteSpace($login.accessToken)) { throw "Identity login did not return an access token" }
$operatorHeaders = @{
  Authorization = "Bearer $($login.accessToken)"
  "X-Correlation-ID" = "saas-runtime-proof-$([guid]::NewGuid())"
}

$platform = Invoke-JsonRequest -Uri "http://localhost:58088/platform/v1/runtime-config" -Headers $operatorHeaders
if ($platform.saas.mode -ne "active") { throw "Platform Control SaaS mode is not active" }
if ($platform.saas.commercialActivationState -ne "authorized") { throw "Platform Control activation state is not authorized" }
if ($platform.saas.productionDeploymentAuthorized -ne $false) { throw "Platform Control incorrectly reports production deployment authorization" }
if ($platform.saas.defaultTenantId -ne $env:BTHWANI_DEFAULT_TENANT_ID) { throw "Platform Control tenant does not match runtime tenant" }
if ($platform.saas.runtimeEnabled -ne $true) { throw "Platform Control reports SaaS runtime disabled" }

$providersHealth = Invoke-JsonRequest -Uri "http://localhost:58087/providers/health"
if ($providersHealth.status -ne "healthy") { throw "Providers health is not healthy" }

$wltHeaders = @{
  Authorization = "Bearer $($env:WLT_DSH_SERVICE_TOKEN)"
  "X-Service-Caller" = "dsh"
  "X-Tenant-ID" = $env:BTHWANI_DEFAULT_TENANT_ID
  "Idempotency-Key" = "saas-proof-$([guid]::NewGuid())"
  "X-Correlation-ID" = "saas-proof-$([guid]::NewGuid())"
}
$checkoutIntentID = [guid]::NewGuid().ToString()
$paymentSession = Invoke-JsonRequest -Uri "http://localhost:58083/wlt/payment-sessions" -Method "POST" -Headers $wltHeaders -Body @{
  tenantId = $env:BTHWANI_DEFAULT_TENANT_ID
  checkoutIntentId = $checkoutIntentID
  clientId = "saas-runtime-client"
  storeId = "saas-runtime-store"
  paymentMethod = "cod"
  amountMinorUnits = 1000
  currency = "YER"
  cartSnapshotHash = "saas-runtime-proof"
}
if ([string]::IsNullOrWhiteSpace($paymentSession.paymentSession.id)) { throw "WLT SaaS payment session was not created" }
if ($paymentSession.paymentSession.tenantId -ne $env:BTHWANI_DEFAULT_TENANT_ID) { throw "WLT payment session tenant mismatch" }

$unauthenticatedReference = Invoke-WebRequest \
  -Uri "http://localhost:58083/wlt/references/payment-status?orderId=saas-boundary-proof" \
  -Method Get -SkipHttpErrorCheck -UseBasicParsing -TimeoutSec 10
if ($unauthenticatedReference.StatusCode -ne 401) { throw "WLT reference boundary did not reject an unauthenticated SaaS read" }

$trustedReference = Invoke-WebRequest \
  -Uri "http://localhost:58083/wlt/references/payment-status?orderId=saas-boundary-proof" \
  -Method Get -Headers $wltHeaders -SkipHttpErrorCheck -UseBasicParsing -TimeoutSec 10
if ($trustedReference.StatusCode -eq 401 -or $trustedReference.StatusCode -eq 403) {
  throw "WLT reference boundary rejected the trusted same-tenant DSH service"
}

$stores = Invoke-JsonRequest -Uri "http://localhost:58080/dsh/stores?limit=1&offset=0"
if ($null -eq $stores.stores) { throw "DSH stores response is missing stores" }

Invoke-RequiredProcess -FilePath "node" -Arguments @("tools/scripts/verify-saas-activation.mjs") -FailureMessage "Static SaaS activation verification failed"

Write-Host "SaaS runtime proof: PASS"
