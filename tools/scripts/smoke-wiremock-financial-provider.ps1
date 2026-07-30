param(
  [string]$BaseUrl = $env:WLT_FINANCIAL_PROVIDER_BASE_URL
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  $BaseUrl = "http://localhost:58090"
}

function Invoke-Json {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [object]$Body = $null
  )

  $headers = @{
    "X-Correlation-ID" = "wiremock-provider-smoke-$([guid]::NewGuid())"
    "Idempotency-Key" = "wiremock-provider-smoke-$([guid]::NewGuid())"
  }
  $uri = "$BaseUrl$Path"
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -TimeoutSec 15
  }
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 8) -TimeoutSec 15
}

$health = Invoke-Json -Method "GET" -Path "/financial/health"
if ($health.status -ne "healthy") { throw "financial provider health failed" }

$bill = Invoke-Json -Method "GET" -Path "/financial/electricity/bills/100200"
if ($bill.status -ne "unpaid") { throw "electricity inquiry success failed" }

try {
  Invoke-Json -Method "GET" -Path "/financial/electricity/bills/not-found" | Out-Null
  throw "bill not found scenario did not fail"
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 404) { throw }
}

$recharge = Invoke-Json -Method "POST" -Path "/financial/telecom/recharges" -Body @{ mobileNumber = "0500000000"; amountMinorUnits = 2500 }
if ($recharge.status -ne "accepted") { throw "telecom recharge success failed" }

try {
  Invoke-Json -Method "POST" -Path "/financial/telecom/recharges/invalid-mobile" -Body @{ mobileNumber = "1"; amountMinorUnits = 2500 } | Out-Null
  throw "invalid mobile scenario did not fail"
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw }
}

$authorize = Invoke-Json -Method "POST" -Path "/financial/card/authorize" -Body @{ amountMinorUnits = 1000; currency = "YER" }
if ($authorize.status -ne "authorized") { throw "card authorize success failed" }

try {
  Invoke-Json -Method "POST" -Path "/financial/card/authorize-declined" -Body @{ amountMinorUnits = 1000; currency = "YER" } | Out-Null
  throw "card declined scenario did not fail"
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 402) { throw }
}

try {
  Invoke-Json -Method "POST" -Path "/financial/common/duplicate" -Body @{ providerReference = "duplicate" } | Out-Null
  throw "duplicate transaction scenario did not fail"
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 409) { throw }
}

try {
  Invoke-Json -Method "GET" -Path "/financial/common/timeout" | Out-Null
  throw "provider timeout scenario did not fail"
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 504) { throw }
}

$refund = Invoke-Json -Method "POST" -Path "/financial/card/refund" -Body @{ amountMinorUnits = 1000; currency = "YER" }
if ($refund.status -ne "refunded") { throw "refund success failed" }

Write-Host "WireMock financial provider smoke: PASS"
