param(
  [string]$BaseUrl = "http://localhost:58083"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$serviceToken = [string]$env:WLT_DSH_SERVICE_TOKEN
if ([string]::IsNullOrWhiteSpace($serviceToken)) {
  throw "WLT_DSH_SERVICE_TOKEN is required for authenticated WLT runtime smoke."
}

$runIdentity = if (-not [string]::IsNullOrWhiteSpace([string]$env:GITHUB_RUN_ID)) {
  "github-$($env:GITHUB_RUN_ID)"
} else {
  "local-$([Guid]::NewGuid().ToString('N'))"
}

$serviceHeaders = @{
  Authorization = "Bearer $serviceToken"
  "X-Service-Caller" = "dsh"
  "X-Correlation-ID" = "wlt-runtime-$runIdentity"
}

function Invoke-WltRead {
  param([Parameter(Mandatory)][string]$Path)
  Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl$Path" `
    -Headers $serviceHeaders `
    -TimeoutSec 15 `
    -ErrorAction Stop
}

$health = Invoke-RestMethod -Method Get -Uri "$BaseUrl/wlt/health" -TimeoutSec 15 -ErrorAction Stop
if ([string]$health.status -ne "healthy") {
  throw "/wlt/health not healthy: $($health.status)"
}
Write-Host "  /wlt/health: healthy"

$readiness = Invoke-RestMethod -Method Get -Uri "$BaseUrl/wlt/readiness" -TimeoutSec 15 -ErrorAction Stop
if ([string]$readiness.status -ne "ready") {
  throw "/wlt/readiness not ready: $($readiness.status)"
}
Write-Host "  /wlt/readiness: ready"

$paymentReference = Invoke-WltRead -Path "/wlt/references/payment-status?orderId=order-dev-0001"
if ([string]$paymentReference.reference.status -ne "captured") {
  throw "/wlt/references/payment-status wrong status: $($paymentReference.reference.status)"
}
Write-Host "  authenticated payment reference: captured"

$walletReference = Invoke-WltRead -Path "/wlt/references/wallet-status?actorId=partner-dev-0001&actorType=partner"
if ([string]$walletReference.reference.status -ne "active") {
  throw "/wlt/references/wallet-status wrong status: $($walletReference.reference.status)"
}
Write-Host "  authenticated wallet reference: active"

$mutationHeaders = @{
  Authorization = "Bearer $serviceToken"
  "X-Service-Caller" = "dsh"
  "X-Correlation-ID" = "wlt-session-$runIdentity"
  "Idempotency-Key" = "wlt-session-$runIdentity"
}
$sessionBody = @{
  checkoutIntentId = "checkout-$runIdentity"
  clientId = "client-local-001"
  storeId = "store-test-grocery"
  paymentMethod = "cod"
  amountMinorUnits = 1000
  currency = "YER"
  cartSnapshotHash = "runtime-smoke-$runIdentity"
} | ConvertTo-Json

$sessionEnvelope = Invoke-RestMethod `
  -Method Post `
  -Uri "$BaseUrl/wlt/payment-sessions" `
  -Headers $mutationHeaders `
  -ContentType "application/json" `
  -Body $sessionBody `
  -TimeoutSec 20 `
  -ErrorAction Stop

$sessionId = [string]$sessionEnvelope.paymentSession.id
if ([string]::IsNullOrWhiteSpace($sessionId)) {
  throw "/wlt/payment-sessions did not return an id."
}

$sessionRead = Invoke-WltRead -Path "/wlt/payment-sessions/$([Uri]::EscapeDataString($sessionId))"
if ([string]$sessionRead.paymentSession.status -ne "reference_created") {
  throw "/wlt/payment-sessions readback wrong status: $($sessionRead.paymentSession.status)"
}
Write-Host "  authenticated payment-session readback: reference_created"

Write-Host "WLT authenticated runtime smoke: PASS"
