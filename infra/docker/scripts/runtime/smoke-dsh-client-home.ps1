param(
  [Parameter(Mandatory = $true)]
  [string]$StatePath,

  [switch]$WltEnabled
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$state = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
$smokeCatalogProductId = [string]$state.masterProductId
if ([string]::IsNullOrWhiteSpace($smokeCatalogProductId)) {
  throw "DSH client smoke state is missing masterProductId"
}

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

if ($WltEnabled) {
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
