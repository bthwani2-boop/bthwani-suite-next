param(
  [string]$BaseUrl = $env:WLT_BASE_URL
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  $BaseUrl = "http://localhost:58083"
}

function Invoke-WltJson {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [object]$Body = $null
  )

  $headers = @{
    "X-Correlation-ID" = "wlt-provider-smoke-$([guid]::NewGuid())"
    "Idempotency-Key" = "wlt-provider-smoke-$([guid]::NewGuid())"
  }
  $uri = "$BaseUrl$Path"
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -TimeoutSec 20
  }
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 8) -TimeoutSec 20
}

$health = Invoke-WltJson -Method "GET" -Path "/wlt/health"
if ($health.status -ne "healthy") { throw "WLT health failed" }

$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$session = Invoke-WltJson -Method "POST" -Path "/wlt/payment-sessions" -Body @{
  checkoutIntentId = "checkout-provider-smoke-$suffix"
  clientId = "client-local-001"
  storeId = "store-1001"
  paymentMethod = "official_wallet"
}
if ([string]::IsNullOrWhiteSpace($session.paymentSession.id)) { throw "WLT did not create payment session" }

$sessionId = $session.paymentSession.id
$authorize = Invoke-WltJson -Method "POST" -Path "/wlt/payment-sessions/$sessionId/authorize" -Body @{
  amountMinorUnits = 1000
  currency = "SAR"
}
if ($authorize.paymentSession.status -ne "authorized") { throw "WLT authorize did not return authorized status" }
if ($authorize.paymentSession.providerReference -ne "card-auth-001") { throw "WLT authorize did not persist providerReference from provider" }

$capture = Invoke-WltJson -Method "POST" -Path "/wlt/payment-sessions/$sessionId/capture"
if ($capture.paymentSession.status -ne "captured") { throw "WLT capture did not return captured status" }
if ($capture.paymentSession.providerReference -ne "card-capture-001") { throw "WLT capture did not persist providerReference from provider" }

$readback = Invoke-WltJson -Method "GET" -Path "/wlt/payment-sessions/$sessionId"
if ($readback.paymentSession.status -ne "captured") { throw "WLT readback did not preserve captured status" }
if ($readback.paymentSession.providerReference -ne "card-capture-001") { throw "WLT readback did not preserve providerReference" }

Write-Host "WLT provider-through-WLT smoke: PASS"
