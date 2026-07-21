param(
  [string]$DshBaseUrl = "http://localhost:58080",
  [string]$IdentityBaseUrl = "http://localhost:58082"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location -LiteralPath $RepoRoot

$ComposeArgs = @(
  "--env-file", "infra/docker/env/runtime.env.example",
  "-f", "infra/docker/compose.runtime.yml",
  "--profile", "identity",
  "--profile", "dsh"
)

function Invoke-DshScalar {
  param([Parameter(Mandatory = $true)][string]$Sql)

  $result = $Sql |
    docker compose @ComposeArgs exec -T postgres `
      psql -U dsh_runtime -d dsh_runtime -v ON_ERROR_STOP=1 -tA
  if ($LASTEXITCODE -ne 0) {
    throw "JRN-009 runtime SQL failed (exit $LASTEXITCODE): $Sql"
  }
  return ($result -join "`n").Trim()
}

function Get-ActorSession {
  param([Parameter(Mandatory = $true)][string]$Username)

  $password = if ([string]::IsNullOrWhiteSpace($env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD)) {
    "123456"
  } else {
    $env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD
  }
  $body = @{
    username = $Username
    password = $password
    deviceFingerprint = "jrn-009-runtime-$Username"
  } | ConvertTo-Json
  $login = Invoke-RestMethod "$IdentityBaseUrl/auth/login" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 15
  if ([string]::IsNullOrWhiteSpace($login.accessToken)) {
    throw "Identity login for $Username did not return an access token"
  }
  $headers = @{ Authorization = "Bearer $($login.accessToken)" }
  $identity = Invoke-RestMethod "$IdentityBaseUrl/auth/session" -Headers $headers -TimeoutSec 15
  if ([string]::IsNullOrWhiteSpace($identity.subject)) {
    throw "Identity session for $Username did not return a subject"
  }
  return @{ Token = $login.accessToken; Subject = $identity.subject }
}

function Assert-HttpFailure {
  param(
    [Parameter(Mandatory = $true)][scriptblock]$Action,
    [Parameter(Mandatory = $true)][int]$ExpectedStatus,
    [Parameter(Mandatory = $true)][string]$Label
  )

  try {
    & $Action | Out-Null
    throw "$Label unexpectedly succeeded"
  } catch {
    $status = $null
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $status = [int]$_.Exception.Response.StatusCode
    }
    if ($status -ne $ExpectedStatus) {
      throw "$Label returned status '$status'; expected $ExpectedStatus. $($_.Exception.Message)"
    }
  }
}

Write-Host "=== JRN-009 all-slices runtime cart smoke ==="

$storeTruth = Invoke-DshScalar @"
SELECT service_area_code || '|' || city_code || '|' || COALESCE(latitude::text, '') || '|' || COALESCE(longitude::text, '')
FROM dsh_stores
WHERE id = 'store-test-grocery';
"@
$storeParts = $storeTruth.Split("|", 4)
if ($storeParts.Count -ne 4 -or [string]::IsNullOrWhiteSpace($storeParts[0])) {
  throw "store-test-grocery operational location truth is missing"
}
$serviceAreaCode = $storeParts[0]
$storeCityCode = $storeParts[1]
if ([string]::IsNullOrWhiteSpace($storeParts[2]) -or [string]::IsNullOrWhiteSpace($storeParts[3])) {
  throw "store-test-grocery coordinates are required for governed address smoke"
}
$storeLatitude = [double]::Parse($storeParts[2], [Globalization.CultureInfo]::InvariantCulture)
$storeLongitude = [double]::Parse($storeParts[3], [Globalization.CultureInfo]::InvariantCulture)

$assortment = Invoke-DshScalar @"
SELECT a.master_product_id || '|' || a.unit_price::text
FROM dsh_store_assortments a
WHERE a.store_id = 'store-test-grocery'
  AND a.available = TRUE
  AND a.unit_price > 0
ORDER BY a.master_product_id
LIMIT 1;
"@
if ([string]::IsNullOrWhiteSpace($assortment) -or -not $assortment.Contains("|")) {
  throw "No available priced assortment exists for store-test-grocery"
}
$parts = $assortment.Split("|", 2)
$masterProductId = $parts[0]
$expectedUnitPrice = [decimal]::Parse($parts[1], [Globalization.CultureInfo]::InvariantCulture)

$clientSession = Get-ActorSession "client"
$operatorSession = Get-ActorSession "operator"
$clientId = [string]$clientSession.Subject
$clientHeaders = @{
  Authorization = "Bearer $($clientSession.Token)"
  "X-Correlation-ID" = "jrn-009-client-$([guid]::NewGuid())"
}
$operatorHeaders = @{
  Authorization = "Bearer $($operatorSession.Token)"
  "X-Correlation-ID" = "jrn-009-operator-$([guid]::NewGuid())"
}

# Deterministic setup: retire any previous active cart for this runtime actor.
Invoke-DshScalar "UPDATE dsh_carts SET state='abandoned', version=version+1, updated_at=NOW() WHERE client_id='$clientId' AND state='active';" | Out-Null

# Ensure a governed zone, capacity policy, and SLA rule exist for the store.
$zoneId = "zone-jrn009-runtime"
$escapedArea = $serviceAreaCode.Replace("'", "''")
$escapedCity = $storeCityCode.Replace("'", "''")
Invoke-DshScalar @"
INSERT INTO dsh_platform_zones (id, name, city_code, is_active, description)
VALUES ('$zoneId', 'JRN-009 runtime zone', '$escapedArea', TRUE, 'Cart runtime policy zone')
ON CONFLICT (id) DO UPDATE SET city_code=EXCLUDED.city_code, is_active=TRUE, updated_at=NOW();
INSERT INTO dsh_platform_capacity_configs
  (id, zone_id, max_concurrent_orders, max_captains_online, throttle_threshold, updated_by)
VALUES ('capacity-jrn009-runtime', '$zoneId', 100000, 100000, 0.95, 'jrn-009-runtime')
ON CONFLICT (zone_id) DO UPDATE SET
  max_concurrent_orders=EXCLUDED.max_concurrent_orders,
  max_captains_online=EXCLUDED.max_captains_online,
  throttle_threshold=EXCLUDED.throttle_threshold,
  version=dsh_platform_capacity_configs.version+1,
  updated_by=EXCLUDED.updated_by,
  updated_at=NOW();
INSERT INTO dsh_platform_sla_rules
  (id, zone_id, category, max_prep_mins, max_delivery_mins, updated_by)
VALUES ('sla-jrn009-runtime', '$zoneId', 'default', 25, 45, 'jrn-009-runtime')
ON CONFLICT (zone_id, category) DO UPDATE SET
  max_prep_mins=EXCLUDED.max_prep_mins,
  max_delivery_mins=EXCLUDED.max_delivery_mins,
  version=dsh_platform_sla_rules.version+1,
  updated_by=EXCLUDED.updated_by,
  updated_at=NOW();
"@ | Out-Null

# Reuse a client-owned address or create one through the authenticated API.
$addressList = Invoke-RestMethod "$DshBaseUrl/dsh/client/addresses" -Headers $clientHeaders -TimeoutSec 15
$address = @($addressList.addresses) | Where-Object { $_.serviceAreaCode -eq $serviceAreaCode } | Select-Object -First 1
if ($null -eq $address) {
  $createAddressHeaders = @{}
  foreach ($key in $clientHeaders.Keys) { $createAddressHeaders[$key] = $clientHeaders[$key] }
  $createAddressHeaders["Idempotency-Key"] = "jrn009-address-$([guid]::NewGuid())"
  $createAddressHeaders["X-Correlation-ID"] = "jrn009-address-$([guid]::NewGuid())"
  $addressBody = @{
    label = "عنوان فحص الرحلة 9"
    recipientName = "عميل فحص الرحلة"
    phoneE164 = "+967770000009"
    addressLine = "عنوان فحص تشغيلي للرحلة التاسعة"
    serviceAreaCode = $serviceAreaCode
    latitude = $storeLatitude
    longitude = $storeLongitude
    makeDefault = $true
  } | ConvertTo-Json
  $createdAddress = Invoke-RestMethod "$DshBaseUrl/dsh/client/addresses" -Method Post -Headers $createAddressHeaders -ContentType "application/json" -Body $addressBody -TimeoutSec 15
  $address = $createdAddress.address
}
if ([string]::IsNullOrWhiteSpace($address.id)) {
  throw "governed client address was not resolved"
}

$serviceabilityBody = @{
  storeId = "store-test-grocery"
  addressId = $address.id
  fulfillmentMode = "bthwani_delivery"
} | ConvertTo-Json
$serviceability = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart/serviceability" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body $serviceabilityBody -TimeoutSec 15
if (-not $serviceability.serviceable) {
  throw "store-test-grocery is not serviceable: $($serviceability.code) $($serviceability.reason)"
}
if ($serviceability.addressId -ne $address.id -or $serviceability.addressVersion -ne $address.version) {
  throw "serviceability did not bind the owned address identity and version"
}
if (-not $serviceability.capacityConfigured -or $serviceability.capacityState -ne "available") {
  throw "serviceability did not expose available governed capacity"
}
if (-not $serviceability.slaConfigured -or $serviceability.slaPrepMinutes -ne 25 -or $serviceability.slaDeliveryMinutes -ne 45) {
  throw "serviceability did not expose governed SLA"
}
if (@($serviceability.availableModes).Count -eq 0) {
  throw "serviceability did not expose governed fulfillment modes"
}
$recordedChecks = Invoke-DshScalar "SELECT COUNT(*) FROM dsh_cart_serviceability_checks WHERE client_id='$clientId' AND address_id='$($address.id)' AND store_id='store-test-grocery';"
if ([int]$recordedChecks -lt 1) {
  throw "serviceability audit evidence was not persisted"
}

$cartBody = @{
  storeId = "store-test-grocery"
  fulfillmentMode = "bthwani_delivery"
  masterProductId = $masterProductId
  quantity = 2
} | ConvertTo-Json
$upsert = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart/items" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body $cartBody -TimeoutSec 15
if ([string]::IsNullOrWhiteSpace($upsert.cartId) -or [string]::IsNullOrWhiteSpace($upsert.item.id)) {
  throw "cart item mutation did not return persisted cart and item identifiers"
}
if ([decimal]$upsert.item.unitPrice -ne $expectedUnitPrice) {
  throw "cart unit price $($upsert.item.unitPrice) does not match server assortment price $expectedUnitPrice"
}
if ($upsert.item.quantity -ne 2 -or [string]::IsNullOrWhiteSpace($upsert.item.storeAssortmentId)) {
  throw "cart item did not preserve quantity and assortment snapshot"
}

$cartReadback = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart?storeId=store-test-grocery" -Headers $clientHeaders -TimeoutSec 15
if ($cartReadback.cart.id -ne $upsert.cartId -or @($cartReadback.cart.items).Count -ne 1) {
  throw "client cart readback did not return the persisted server cart"
}
if (-not $cartReadback.cart.validation.ready) {
  throw "newly written cart should reconcile as ready"
}

# Price changes are detected without silently replacing the original snapshot.
$newUnitPrice = $expectedUnitPrice + [decimal]1.00
$newUnitPriceText = $newUnitPrice.ToString([Globalization.CultureInfo]::InvariantCulture)
Invoke-DshScalar "UPDATE dsh_store_assortments SET unit_price=$newUnitPriceText, updated_at=NOW() WHERE store_id='store-test-grocery' AND master_product_id='$masterProductId';" | Out-Null
$priceChanged = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart?storeId=store-test-grocery" -Headers $clientHeaders -TimeoutSec 15
if ($priceChanged.cart.validation.ready -or -not $priceChanged.cart.validation.priceChanged) {
  throw "cart did not detect the live assortment price change"
}
if ([decimal]$priceChanged.cart.items[0].unitPrice -ne $expectedUnitPrice) {
  throw "price reconciliation silently rewrote the immutable cart snapshot"
}

# Explicit same-quantity upsert accepts the current server price and restores readiness.
$priceAccepted = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart/items" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body $cartBody -TimeoutSec 15
if ([decimal]$priceAccepted.item.unitPrice -ne $newUnitPrice) {
  throw "explicit price refresh did not snapshot the current server price"
}
$afterPriceAccept = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart?storeId=store-test-grocery" -Headers $clientHeaders -TimeoutSec 15
if (-not $afterPriceAccept.cart.validation.ready) {
  throw "cart remained blocked after explicit price refresh"
}

# Current assortment availability is reconciled and exposed to both surfaces.
Invoke-DshScalar "UPDATE dsh_store_assortments SET available=FALSE, updated_at=NOW() WHERE store_id='store-test-grocery' AND master_product_id='$masterProductId';" | Out-Null
$unavailable = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart?storeId=store-test-grocery" -Headers $clientHeaders -TimeoutSec 15
if ($unavailable.cart.validation.ready -or $unavailable.cart.validation.unavailableCount -lt 1) {
  throw "cart did not block an unavailable assortment item"
}
$operatorCarts = Invoke-RestMethod "$DshBaseUrl/dsh/operator/carts?state=active" -Headers $operatorHeaders -TimeoutSec 15
$operatorCart = @($operatorCarts.carts) | Where-Object { $_.id -eq $upsert.cartId } | Select-Object -First 1
if ($null -eq $operatorCart -or @($operatorCart.items).Count -ne 1) {
  throw "operator cart activity did not hydrate the persisted item"
}
if ($operatorCart.validation.ready -or $operatorCart.validation.unavailableCount -lt 1) {
  throw "operator cart activity did not expose the same reconciliation result"
}
Invoke-DshScalar "UPDATE dsh_store_assortments SET available=TRUE, unit_price=$newUnitPriceText, updated_at=NOW() WHERE store_id='store-test-grocery' AND master_product_id='$masterProductId';" | Out-Null

# A foreign product cannot enter the current store assortment.
$foreignProduct = Invoke-DshScalar @"
SELECT a.master_product_id
FROM dsh_store_assortments a
WHERE a.store_id <> 'store-test-grocery'
  AND a.available = TRUE
  AND a.unit_price > 0
  AND NOT EXISTS (
    SELECT 1
    FROM dsh_store_assortments grocery
    WHERE grocery.store_id = 'store-test-grocery'
      AND grocery.master_product_id = a.master_product_id
  )
ORDER BY a.master_product_id
LIMIT 1;
"@
if (-not [string]::IsNullOrWhiteSpace($foreignProduct)) {
  $foreignBody = @{
    storeId = "store-test-grocery"
    fulfillmentMode = "bthwani_delivery"
    masterProductId = $foreignProduct
    quantity = 1
  } | ConvertTo-Json
  Assert-HttpFailure -ExpectedStatus 422 -Label "cross-store assortment mutation" -Action {
    Invoke-RestMethod "$DshBaseUrl/dsh/client/cart/items" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body $foreignBody -TimeoutSec 15
  }
}

# Product Truth forbids a second active store cart for the same client.
$otherStoreProduct = Invoke-DshScalar @"
SELECT a.store_id || '|' || a.master_product_id
FROM dsh_store_assortments a
WHERE a.store_id <> 'store-test-grocery'
  AND a.available = TRUE
  AND a.unit_price > 0
ORDER BY a.store_id, a.master_product_id
LIMIT 1;
"@
if ([string]::IsNullOrWhiteSpace($otherStoreProduct) -or -not $otherStoreProduct.Contains("|")) {
  throw "No second store assortment exists to prove single-store cart isolation"
}
$otherParts = $otherStoreProduct.Split("|", 2)
$otherStoreBody = @{
  storeId = $otherParts[0]
  fulfillmentMode = "bthwani_delivery"
  masterProductId = $otherParts[1]
  quantity = 1
} | ConvertTo-Json
Assert-HttpFailure -ExpectedStatus 409 -Label "second active store cart" -Action {
  Invoke-RestMethod "$DshBaseUrl/dsh/client/cart/items" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body $otherStoreBody -TimeoutSec 15
}
$activeCartCount = Invoke-DshScalar "SELECT COUNT(*) FROM dsh_carts WHERE client_id='$clientId' AND state='active';"
if ([int]$activeCartCount -ne 1) {
  throw "single active cart database invariant failed: count=$activeCartCount"
}

Invoke-RestMethod "$DshBaseUrl/dsh/client/cart/items/$($upsert.item.id)?cartId=$($upsert.cartId)" -Method Delete -Headers $clientHeaders -TimeoutSec 15 | Out-Null
$afterDelete = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart?storeId=store-test-grocery" -Headers $clientHeaders -TimeoutSec 15
if (@($afterDelete.cart.items).Count -ne 0) {
  throw "owned item delete did not persist"
}

$reinsert = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart/items" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body $cartBody -TimeoutSec 15
Invoke-RestMethod "$DshBaseUrl/dsh/client/cart?cartId=$($reinsert.cartId)" -Method Delete -Headers $clientHeaders -TimeoutSec 15 | Out-Null
$afterClear = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart?storeId=store-test-grocery" -Headers $clientHeaders -TimeoutSec 15
if (@($afterClear.cart.items).Count -ne 0) {
  throw "owned cart clear did not persist"
}

Write-Host "JRN-009 all-slices runtime cart smoke: PASS"
