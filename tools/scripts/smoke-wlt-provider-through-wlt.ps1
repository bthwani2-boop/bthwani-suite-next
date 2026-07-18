param(
  [string]$BaseUrl = $env:WLT_BASE_URL,
  [string]$WiremockUrl = "http://localhost:58090"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  $BaseUrl = "http://localhost:58083"
}

$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$CorrelationId = "wlt-provider-smoke-$timestamp"
$IdempotencyKey = "wlt-provider-smoke-idemp-$timestamp"
$TenantId = "tenant-dev-001"
$ClientId = "client-provider-smoke-$timestamp"
$CheckoutIntentId = "checkout-provider-smoke-$timestamp"
$OrderId = "order-provider-smoke-$timestamp"

function Invoke-WltJson {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [object]$Body = $null,
    [string]$OperationIdempotencyKey = $IdempotencyKey
  )

  $headers = @{
    "X-Correlation-ID" = $CorrelationId
    "Idempotency-Key" = $OperationIdempotencyKey
    "Authorization" = "Bearer dev-only-dsh-wlt-shared-secret"
    "X-Service-Caller" = "dsh"
    "X-Tenant-ID" = $TenantId
  }
  $uri = "$BaseUrl$Path"
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -TimeoutSec 20
  }
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 8) -TimeoutSec 20
}

$health = Invoke-WltJson -Method "GET" -Path "/wlt/health"
if ($health.status -ne "healthy") { throw "WLT health failed" }

$session = Invoke-WltJson -Method "POST" -Path "/wlt/payment-sessions" -Body @{
  checkoutIntentId = $CheckoutIntentId
  tenantId = $TenantId
  clientId = $ClientId
  storeId = "store-test-grocery"
  paymentMethod = "official_wallet"
  amountMinorUnits = 1000
  currency = "YER"
  cartSnapshotHash = "provider-smoke-$timestamp"
}
if ([string]::IsNullOrWhiteSpace($session.paymentSession.id)) { throw "WLT did not create payment session" }
$sessionId = $session.paymentSession.id

$authorize = Invoke-WltJson -Method "POST" -Path "/wlt/payment-sessions/$sessionId/authorize" -OperationIdempotencyKey "$IdempotencyKey-authorize"
if ($authorize.paymentSession.status -ne "authorized") { throw "WLT authorize did not return authorized status" }
if ($authorize.paymentSession.providerReference -ne "card-auth-001") { throw "WLT authorize did not persist providerReference from provider" }
if ($authorize.paymentSession.currency -ne "YER") { throw "WLT authorize did not return YER currency: $($authorize.paymentSession.currency)" }

$capture = Invoke-WltJson -Method "POST" -Path "/wlt/payment-sessions/$sessionId/capture" -OperationIdempotencyKey "$IdempotencyKey-capture"
if ($capture.paymentSession.status -ne "captured") { throw "WLT capture did not return captured status" }
if ($capture.paymentSession.providerReference -ne "card-capture-001") { throw "WLT capture did not persist providerReference from provider" }
if ($capture.paymentSession.currency -ne "YER") { throw "WLT capture did not return YER currency: $($capture.paymentSession.currency)" }

$readback = Invoke-WltJson -Method "GET" -Path "/wlt/payment-sessions/$sessionId"
if ($readback.paymentSession.status -ne "captured") { throw "WLT readback did not preserve captured status" }
if ($readback.paymentSession.tenantId -ne $TenantId) { throw "WLT readback did not preserve tenant identity" }

$refund = Invoke-WltJson -Method "POST" -Path "/wlt/refunds" -OperationIdempotencyKey "$IdempotencyKey-refund-create" -Body @{
  paymentSessionId = $sessionId
  orderId = $OrderId
  clientId = $ClientId
  reason = "automated provider refund smoke"
}
$refundId = "$($refund.refund.id)"
if ([string]::IsNullOrWhiteSpace($refundId)) { throw "WLT did not create refund" }
if ($refund.refund.status -ne "requested") { throw "Unexpected refund creation status: $($refund.refund.status)" }

$approvedRefund = Invoke-WltJson -Method "POST" -Path "/wlt/refunds/$refundId/approve" -OperationIdempotencyKey "$IdempotencyKey-refund-approve"
if ($approvedRefund.refund.status -ne "approved") { throw "Refund approval failed" }

$completedRefund = Invoke-WltJson -Method "POST" -Path "/wlt/refunds/$refundId/complete" -OperationIdempotencyKey "$IdempotencyKey-refund-complete"
if ($completedRefund.refund.status -ne "completed") { throw "Provider-backed refund completion failed" }

$refundReadback = Invoke-WltJson -Method "GET" -Path "/wlt/refunds/$refundId"
if ($refundReadback.refund.status -ne "completed") { throw "Refund readback did not preserve completed status" }
if ($refundReadback.refund.amountMinorUnits -ne 1000) { throw "Refund amount was not derived from payment session" }

Write-Host "Verifying WireMock request journal at $WiremockUrl..."
$wmResponse = Invoke-RestMethod -Method "GET" -Uri "$WiremockUrl/__admin/requests" -TimeoutSec 15
$foundAuthorize = $false
$foundCapture = $false
$foundRefund = $false

foreach ($record in $wmResponse.requests) {
  $req = $record.request
  $headers = $req.headers
  $corrHeader = if ($headers.'X-Correlation-ID') { $headers.'X-Correlation-ID' } else { $headers.'x-correlation-id' }
  if ($null -eq $corrHeader -or "$corrHeader" -notlike "*$CorrelationId*") { continue }
  if ($req.url -eq "/financial/card/authorize" -and $req.method -eq "POST") { $foundAuthorize = $true }
  if ($req.url -eq "/financial/card/capture" -and $req.method -eq "POST") { $foundCapture = $true }
  if ($req.url -eq "/financial/card/refund" -and $req.method -eq "POST") { $foundRefund = $true }
}

if (-not $foundAuthorize) { throw "WireMock journal did not record authorize with correlation ID $CorrelationId" }
if (-not $foundCapture) { throw "WireMock journal did not record capture with correlation ID $CorrelationId" }
if (-not $foundRefund) { throw "WireMock journal did not record refund with correlation ID $CorrelationId" }

Write-Host "WireMock journal validation: PASS"
Write-Host "WLT card capture and provider refund smoke: PASS"
