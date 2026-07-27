param(
  [Parameter(Mandatory = $true)]
  [string]$StatePath,

  [switch]$WltEnabled
)

Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "../../../../tools/dev/local-actors.ps1")
$ErrorActionPreference = "Stop"

$state = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
$smokeCatalogProductId = [string]$state.masterProductId
if ([string]::IsNullOrWhiteSpace($smokeCatalogProductId)) {
  throw "DSH client smoke state is missing masterProductId"
}

$identityPassword = Get-LocalPassword
function Get-LocalActorToken([string] $Username) {
  $loginBody = @{
    username = $Username
    password = $identityPassword
    deviceFingerprint = "dsh-runtime-smoke"
  } | ConvertTo-Json
  $login = Invoke-RestMethod "http://localhost:58082/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -TimeoutSec 10
  return $login.accessToken
}

$operatorToken = Get-LocalActorToken (Get-LocalUsername "operator")
$operatorHeaders = @{ Authorization = "Bearer $operatorToken" }

if ($WltEnabled) {
  $clientToken = Get-LocalActorToken (Get-LocalUsername "client")
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
  @{ username = (Get-LocalUsername "partner"); expectedRole = "partner" },
  @{ username = (Get-LocalUsername "field"); expectedRole = "field" },
  @{ username = (Get-LocalUsername "captain"); expectedRole = "captain" }
)) {
  $token = Get-LocalActorToken $actor.username
  $headers = @{ Authorization = "Bearer $token" }
  $context = Invoke-RestMethod "http://localhost:58080/dsh/store-context" -Headers $headers -TimeoutSec 10
  if ($context.actorRole -ne $actor.expectedRole) { throw "wrong actor role for $($actor.username)" }
  if ([string]::IsNullOrWhiteSpace($context.store.id)) { throw "missing scoped store for $($actor.username)" }
}

# Home Discovery: every visible card must resolve to an openable storefront and
# a non-empty public catalog. This is the runtime closure for the historical
# drift where home discovery returned stores rejected by store detail with 404.
$homeDisc = Invoke-RestMethod "http://localhost:58080/dsh/home-discovery?limit=50" -TimeoutSec 10 -ErrorAction Stop
$bannerCount    = if ($homeDisc.banners)    { $homeDisc.banners.Count }    else { 0 }
$promoCount     = if ($homeDisc.promos)     { $homeDisc.promos.Count }     else { 0 }
$categoryCount  = if ($homeDisc.categories) { $homeDisc.categories.Count } else { 0 }
$filterCount    = if ($homeDisc.filters)    { $homeDisc.filters.Count }    else { 0 }
$homeStores     = @($homeDisc.stores)
$homeStoreCount = $homeStores.Count
Write-Host "  /dsh/home-discovery: banners=$bannerCount promos=$promoCount categories=$categoryCount filters=$filterCount stores=$homeStoreCount"
if ($bannerCount    -eq 0) { throw "/dsh/home-discovery: 0 banners" }
if ($promoCount     -eq 0) { throw "/dsh/home-discovery: 0 promos" }
if ($categoryCount  -eq 0) { throw "/dsh/home-discovery: 0 categories" }
if ($filterCount    -eq 0) { throw "/dsh/home-discovery: 0 filters" }
if ($homeStoreCount -eq 0) { throw "/dsh/home-discovery: 0 stores" }

foreach ($homeStore in $homeStores) {
  $storeId = [string]$homeStore.id
  if ([string]::IsNullOrWhiteSpace($storeId)) {
    throw "/dsh/home-discovery returned a store without id"
  }

  $encodedStoreId = [uri]::EscapeDataString($storeId)
  $detail = Invoke-RestMethod "http://localhost:58080/dsh/stores/$encodedStoreId" -TimeoutSec 10 -ErrorAction Stop
  if ($null -eq $detail.store) {
    throw "/dsh/stores/$storeId response is missing store"
  }
  if ([string]$detail.store.id -ne $storeId) {
    throw "/dsh/stores/$storeId returned mismatched store id: $($detail.store.id)"
  }

  $catalog = Invoke-RestMethod "http://localhost:58080/dsh/stores/$encodedStoreId/catalog" -TimeoutSec 15 -ErrorAction Stop
  $productCount = if ($catalog.products) { @($catalog.products).Count } else { 0 }
  if ($productCount -eq 0) {
    throw "/dsh/stores/$storeId/catalog returned no client-visible products"
  }
  Write-Host "  storefront=$storeId detail=PASS catalogProducts=$productCount"
}

Write-Host "DSH API smoke: PASS"
