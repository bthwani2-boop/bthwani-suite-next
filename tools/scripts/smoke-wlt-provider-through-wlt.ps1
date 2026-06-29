param(
  [string]$BaseUrl = $env:WLT_BASE_URL,
  [string]$WiremockUrl = "http://localhost:58090"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  $BaseUrl = "http://localhost:58083"
}

# 1. Generate run-fixed Correlation ID and Idempotency Key
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$CorrelationId = "wlt-provider-smoke-$timestamp"
$IdempotencyKey = "wlt-provider-smoke-idemp-$timestamp"

function Invoke-WltJson {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [object]$Body = $null
  )

  $headers = @{
    "X-Correlation-ID" = $CorrelationId
    "Idempotency-Key" = $IdempotencyKey
  }
  $uri = "$BaseUrl$Path"
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -TimeoutSec 20
  }
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 8) -TimeoutSec 20
}

# GET /wlt/health
$health = Invoke-WltJson -Method "GET" -Path "/wlt/health"
if ($health.status -ne "healthy") { throw "WLT health failed" }

# POST /wlt/payment-sessions
$session = Invoke-WltJson -Method "POST" -Path "/wlt/payment-sessions" -Body @{
  checkoutIntentId = "checkout-provider-smoke-$timestamp"
  clientId = "client-local-001"
  storeId = "store-1001"
  paymentMethod = "official_wallet"
}
if ([string]::IsNullOrWhiteSpace($session.paymentSession.id)) { throw "WLT did not create payment session" }

$sessionId = $session.paymentSession.id

# POST /wlt/payment-sessions/{id}/authorize
$authorize = Invoke-WltJson -Method "POST" -Path "/wlt/payment-sessions/$sessionId/authorize" -Body @{
  amountMinorUnits = 1000
  currency = "SAR"
}
if ($authorize.paymentSession.status -ne "authorized") { throw "WLT authorize did not return authorized status" }
if ($authorize.paymentSession.providerReference -ne "card-auth-001") { throw "WLT authorize did not persist providerReference from provider" }

# POST /wlt/payment-sessions/{id}/capture
$capture = Invoke-WltJson -Method "POST" -Path "/wlt/payment-sessions/$sessionId/capture"
if ($capture.paymentSession.status -ne "captured") { throw "WLT capture did not return captured status" }
if ($capture.paymentSession.providerReference -ne "card-capture-001") { throw "WLT capture did not persist providerReference from provider" }

# GET /wlt/payment-sessions/{id}
$readback = Invoke-WltJson -Method "GET" -Path "/wlt/payment-sessions/$sessionId"
if ($readback.paymentSession.status -ne "captured") { throw "WLT readback did not preserve captured status" }
if ($readback.paymentSession.providerReference -ne "card-capture-001") { throw "WLT readback did not preserve providerReference" }

# 2. WireMock requests journal verification
Write-Host "Verifying WireMock request journal at $WiremockUrl..."
$wmResponse = Invoke-RestMethod -Method "GET" -Uri "$WiremockUrl/__admin/requests" -TimeoutSec 15
$foundAuthorize = $false
$foundCapture = $false

foreach ($r in $wmResponse.requests) {
  $req = $r.request
  $headers = $req.headers
  
  $corrHeader = $null
  if ($headers.'X-Correlation-ID') {
    $corrHeader = $headers.'X-Correlation-ID'
  } elseif ($headers.'x-correlation-id') {
    $corrHeader = $headers.'x-correlation-id'
  }

  if ($null -ne $corrHeader) {
    $corrVal = "$corrHeader"
    if ($corrVal -like "*$CorrelationId*") {
      if ($req.url -eq "/financial/card/authorize" -and $req.method -eq "POST") {
        $foundAuthorize = $true
      }
      if ($req.url -eq "/financial/card/capture" -and $req.method -eq "POST") {
        $foundCapture = $true
      }
    }
  }
}

if (-not $foundAuthorize) {
  throw "WireMock request journal did not record authorize request with X-Correlation-ID: $CorrelationId"
}
if (-not $foundCapture) {
  throw "WireMock request journal did not record capture request with X-Correlation-ID: $CorrelationId"
}

Write-Host "WireMock journal validation: PASS"
Write-Host "WLT provider-through-WLT smoke: PASS"
