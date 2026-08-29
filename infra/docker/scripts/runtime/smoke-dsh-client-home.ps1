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
$smokeCatalogProductId = [string]$state.clientCheckoutProductId
if ([string]::IsNullOrWhiteSpace($smokeCatalogProductId)) {
  throw "DSH client smoke state is missing clientCheckoutProductId"
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

function Get-GovernedStoreServicePoint([string] $StoreId) {
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../../..")).Path
  $composeFile = Join-Path $repoRoot "infra/docker/compose.runtime.yml"
  $envFile = Join-Path $repoRoot "infra/docker/env/runtime.env.example"
  $statement = @"
WITH target_store AS (
  SELECT latitude, longitude
  FROM dsh_stores
  WHERE id = '$StoreId'
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
), effective_versions AS (
  SELECT DISTINCT ON (service_area_code)
         service_area_code, polygon, active, priority, effective_from, expires_at, version
  FROM dsh_service_area_versions
  WHERE effective_from <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY service_area_code, effective_from DESC, version DESC
)
SELECT v.service_area_code || '|' || s.latitude::text || '|' || s.longitude::text
FROM target_store s
JOIN effective_versions v
  ON v.active = TRUE
 AND ST_Contains(v.polygon, ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326))
ORDER BY v.priority DESC, v.service_area_code ASC
LIMIT 1;
"@
  $output = docker compose --env-file $envFile -f $composeFile exec -T postgres psql -X -v ON_ERROR_STOP=1 -U dsh_runtime -d dsh_runtime -qAt -c $statement
  if ($LASTEXITCODE -ne 0) { throw "governed DSH service-point readback failed" }
  $parts = (($output -join "`n").Trim()).Split("|", [StringSplitOptions]::None)
  if ($parts.Count -ne 3 -or [string]::IsNullOrWhiteSpace($parts[0])) { throw "governed DSH service-point readback was empty or malformed" }
  return [pscustomobject]@{
    ServiceAreaCode = [string]$parts[0]
    Latitude = [double]$parts[1]
    Longitude = [double]$parts[2]
  }
}

$operatorToken = Get-LocalActorToken (Get-LocalUsername "operator")
$operatorHeaders = @{ Authorization = "Bearer $operatorToken" }

if ($WltEnabled) {
  $clientToken = Get-LocalActorToken (Get-LocalUsername "client")
  $checkoutAttempt = [guid]::NewGuid().ToString()
  $clientHeaders = @{
    Authorization = "Bearer $clientToken"
    "X-Correlation-ID" = "smoke-checkout-cart-$checkoutAttempt"
    "Idempotency-Key" = "smoke-checkout-cart-$checkoutAttempt"
  }
  $cartBody = @{
    storeId = "store-test-grocery"
    fulfillmentMode = "bthwani_delivery"
    masterProductId = $smokeCatalogProductId
    quantity = 1
  } | ConvertTo-Json
  $cartItem = Invoke-RestMethod "http://localhost:18080/dsh/client/cart/items" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body $cartBody -TimeoutSec 10
  if ([string]::IsNullOrWhiteSpace($cartItem.cartId)) { throw "cart item did not return cartId" }
  $clientReadHeaders = @{ Authorization = "Bearer $clientToken" }
  $cartReadback = Invoke-RestMethod "http://localhost:18080/dsh/client/cart?storeId=store-test-grocery" -Headers $clientReadHeaders -TimeoutSec 10
  if ($null -eq $cartReadback.cart -or $cartReadback.cart.id -ne $cartItem.cartId) { throw "client cart canonical readback did not match the committed cart mutation" }
  $cartVersion = [int]$cartReadback.cart.version
  if ($cartVersion -lt 1) { throw "cart item did not return a positive canonical cart version" }

  # Store discovery deliberately withholds exact coordinates. Resolve the
  # effective DSH geofence from the canonical store/geofence read model so the
  # address writer receives the same service-area truth checkout will enforce.
  $servicePoint = Get-GovernedStoreServicePoint "store-test-grocery"
  $serviceAreaCode = $servicePoint.ServiceAreaCode
  $storeLatitude = $servicePoint.Latitude
  $storeLongitude = $servicePoint.Longitude

  $addressList = Invoke-RestMethod "http://localhost:18080/dsh/client/addresses" -Headers $clientReadHeaders -TimeoutSec 10
  $deliveryAddress = @($addressList.addresses | Where-Object {
    $_.serviceAreaCode -eq $serviceAreaCode -and
    [math]::Abs([double]$_.latitude - $storeLatitude) -lt 0.000001 -and
    [math]::Abs([double]$_.longitude - $storeLongitude) -lt 0.000001
  } | Select-Object -First 1)
  if ($deliveryAddress.Count -eq 0) {
    $addressHeaders = @{
      Authorization = "Bearer $clientToken"
      "X-Correlation-ID" = "smoke-checkout-address-$checkoutAttempt"
      "Idempotency-Key" = "smoke-checkout-address-$checkoutAttempt"
    }
    $addressBody = @{
      label = "runtime-checkout"
      recipientName = "Runtime Smoke Client"
      phoneE164 = "+967711111111"
      addressLine = "حدة، عنوان فحص checkout"
      serviceAreaCode = $serviceAreaCode
      latitude = $storeLatitude
      longitude = $storeLongitude
      makeDefault = $true
    } | ConvertTo-Json
    $createdAddress = Invoke-RestMethod "http://localhost:18080/dsh/client/addresses" -Method Post -Headers $addressHeaders -ContentType "application/json" -Body $addressBody -TimeoutSec 10
    $deliveryAddress = @($createdAddress.address)
  }
  $deliveryAddressId = [string]$deliveryAddress[0].id
  if ([string]::IsNullOrWhiteSpace($deliveryAddressId)) { throw "client checkout did not resolve a canonical delivery address" }

  $checkoutHeaders = @{}
  foreach ($key in $clientHeaders.Keys) {
    $checkoutHeaders[$key] = $clientHeaders[$key]
  }
  $checkoutHeaders["X-Correlation-ID"] = "smoke-checkout-intent-$checkoutAttempt"
  $checkoutHeaders["Idempotency-Key"] = "smoke-checkout-intent-$checkoutAttempt"
  $checkoutBody = @{
    cartId = $cartItem.cartId
    storeId = "store-test-grocery"
    expectedCartVersion = $cartVersion
    fulfillmentMode = "bthwani_delivery"
    paymentMethod = "cod"
    deliveryAddressId = $deliveryAddressId
    note = "runtime Checkout & WLT Handoff smoke"
  } | ConvertTo-Json
  $checkout = Invoke-RestMethod "http://localhost:18080/dsh/client/checkout-intents" -Method Post -Headers $checkoutHeaders -ContentType "application/json" -Body $checkoutBody -TimeoutSec 10
  Write-Host "  /dsh/client/checkout-intents: $($checkout.intent.id) / WLT=$($checkout.intent.wltPaymentSessionId)"
  if ([string]::IsNullOrWhiteSpace($checkout.intent.wltPaymentSessionId)) { throw "checkout intent missing WLT payment session reference" }
  $operatorCheckout = Invoke-RestMethod "http://localhost:18080/dsh/operator/checkout-intents" -Headers $operatorHeaders -TimeoutSec 10
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
  $context = Invoke-RestMethod "http://localhost:18080/dsh/store-context?storeId=$storeId" -Headers $headers -TimeoutSec 10
  if ($context.actorRole -ne $actor.expectedRole) { throw "wrong actor role for $($actor.label)" }
  if ([string]$context.store.id -ne [string]$actor.storeId) { throw "wrong scoped store for $($actor.label)" }
}

# Home banners/promos are local seed-media projections; categories/filters/store
# discovery are DSH core. Prove both sides explicitly rather than treating a
# missing optional overlay as a core failure.
$homeDisc = Invoke-RestMethod "http://localhost:18080/dsh/home-discovery?limit=50" -TimeoutSec 10 -ErrorAction Stop
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
  $detail = Invoke-RestMethod "http://localhost:18080/dsh/stores/$encodedStoreId" -TimeoutSec 10 -ErrorAction Stop
  if ($null -eq $detail.store) { throw "/dsh/stores/$storeId response is missing store" }
  if ([string]$detail.store.id -ne $storeId) {
    throw "/dsh/stores/$storeId returned mismatched store id: $($detail.store.id)"
  }

  $catalog = Invoke-RestMethod "http://localhost:18080/dsh/stores/$encodedStoreId/catalog" -TimeoutSec 15 -ErrorAction Stop
  $productCount = if ($catalog.products) { @($catalog.products).Count } else { 0 }
  if ($MediaEnabled -and $productCount -eq 0) { throw "/dsh/stores/$storeId/catalog returned no client-visible products" }
  Write-Host "  storefront=$storeId detail=PASS catalogProducts=$productCount media=$MediaEnabled"
}

Write-Host "DSH API smoke: PASS"
