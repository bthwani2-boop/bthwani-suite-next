param(
  [Parameter(Mandatory = $true)]
  [string]$StatePath,

  [switch]$WltEnabled,
  [switch]$MediaEnabled
)

Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "../../../../tools/dev/local-actors.ps1")
. (Join-Path $PSScriptRoot "../../../../tools/dev/local-workforce-actors.ps1")
$ErrorActionPreference = "Stop"

$identityApiHostPort = if ([string]::IsNullOrWhiteSpace($env:BTHWANI_IDENTITY_API_HOST_PORT)) { "18082" } else { $env:BTHWANI_IDENTITY_API_HOST_PORT }
$identityBaseUrl = if ([string]::IsNullOrWhiteSpace($env:IDENTITY_API_BASE_URL)) { "http://localhost:$identityApiHostPort" } else { $env:IDENTITY_API_BASE_URL }

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
  $login = Invoke-RestMethod "$identityBaseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -TimeoutSec 10
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

$scopedActors = @(
  @{
    label = (Get-LocalUsername "partner")
    token = (Get-LocalActorToken (Get-LocalUsername "partner"))
    expectedRole = "partner"
    storeId = "store-test-grocery"
  },
  @{
    label = "provisioned-field"
    token = (Get-ProvisionedWorkforceActorToken -Kind "field" -OperatorToken $operatorToken -DeviceFingerprint "dsh-client-home")
    expectedRole = "field"
    storeId = "store-1002"
  },
  @{
    label = "provisioned-captain"
    token = (Get-ProvisionedWorkforceActorToken -Kind "captain" -OperatorToken $operatorToken -DeviceFingerprint "dsh-client-home")
    expectedRole = "captain"
    storeId = "store-1005"
  }
)
foreach ($actor in $scopedActors) {
  $token = [string]$actor.token
  $headers = @{ Authorization = "Bearer $token" }
  $storeId = [Uri]::EscapeDataString([string]$actor.storeId)
  $context = Invoke-RestMethod "http://localhost:58080/dsh/store-context?storeId=$storeId" -Headers $headers -TimeoutSec 10
  if ($context.actorRole -ne $actor.expectedRole) { throw "wrong actor role for $($actor.label)" }
  if ([string]$context.store.id -ne [string]$actor.storeId) { throw "wrong scoped store for $($actor.label)" }
}

# Home banners/promos are local seed-media projections; categories/filters/store
# discovery are DSH core. Prove both sides explicitly rather than treating a
# missing optional overlay as a core failure.
$homeDisc = Invoke-RestMethod "http://localhost:58080/dsh/home-discovery?limit=50" -TimeoutSec 10 -ErrorAction Stop
$bannerCount    = if ($homeDisc.banners)    { $homeDisc.banners.Count }    else { 0 }
$promoCount     = if ($homeDisc.promos)     { $homeDisc.promos.Count }     else { 0 }
$categoryCount  = if ($homeDisc.categories) { $homeDisc.categories.Count } else { 0 }
$filterCount    = if ($homeDisc.filters)    { $homeDisc.filters.Count }    else { 0 }
$homeStores     = @($homeDisc.stores)
$homeStoreCount = $homeStores.Count
Write-Host "  /dsh/home-discovery: banners=$bannerCount promos=$promoCount categories=$categoryCount filters=$filterCount stores=$homeStoreCount media=$MediaEnabled"
if ($MediaEnabled) {
  if ($bannerCount -eq 0) { throw "/dsh/home-discovery: media overlay active but banners are absent" }
  if ($promoCount -eq 0) { throw "/dsh/home-discovery: media overlay active but promos are absent" }
} else {
  if ($bannerCount -ne 0) { throw "/dsh/home-discovery: core mode leaked local-media banners" }
  if ($promoCount -ne 0) { throw "/dsh/home-discovery: core mode leaked local-media promos" }
}
if ($categoryCount  -eq 0) { throw "/dsh/home-discovery: 0 categories" }
if ($filterCount    -eq 0) { throw "/dsh/home-discovery: 0 filters" }
if ($homeStoreCount -eq 0) { throw "/dsh/home-discovery: 0 stores" }

foreach ($homeStore in $homeStores) {
  $storeId = [string]$homeStore.id
  if ([string]::IsNullOrWhiteSpace($storeId)) { throw "/dsh/home-discovery returned a store without id" }

  $encodedStoreId = [uri]::EscapeDataString($storeId)
  $detail = Invoke-RestMethod "http://localhost:58080/dsh/stores/$encodedStoreId" -TimeoutSec 10 -ErrorAction Stop
  if ($null -eq $detail.store) { throw "/dsh/stores/$storeId response is missing store" }
  if ([string]$detail.store.id -ne $storeId) {
    throw "/dsh/stores/$storeId returned mismatched store id: $($detail.store.id)"
  }

  $catalog = Invoke-RestMethod "http://localhost:58080/dsh/stores/$encodedStoreId/catalog" -TimeoutSec 15 -ErrorAction Stop
  $productCount = if ($catalog.products) { @($catalog.products).Count } else { 0 }
  if ($MediaEnabled -and $productCount -eq 0) { throw "/dsh/stores/$storeId/catalog returned no client-visible products" }
  Write-Host "  storefront=$storeId detail=PASS catalogProducts=$productCount media=$MediaEnabled"
}

Write-Host "DSH API smoke: PASS"
