param(
  [string]$DshBaseUrl = "http://localhost:58080",
  [string]$IdentityBaseUrl = "http://localhost:58082"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location -LiteralPath $RepoRoot
$ComposeArgs = @("--env-file", "infra/docker/env/runtime.env.example", "-f", "infra/docker/compose.runtime.yml", "--profile", "identity", "--profile", "dsh")

function Invoke-DshScalar {
  param([Parameter(Mandatory = $true)][string]$Sql)
  $result = $Sql | docker compose @ComposeArgs exec -T postgres psql -U dsh_runtime -d dsh_runtime -v ON_ERROR_STOP=1 -tA
  if ($LASTEXITCODE -ne 0) { throw "JRN-009 runtime SQL failed: $Sql" }
  return ($result -join "`n").Trim()
}

function Get-ActorSession {
  param([Parameter(Mandatory = $true)][string]$Username)
  $password = if ($env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD) { $env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD } else { "123456" }
  $login = Invoke-RestMethod "$IdentityBaseUrl/auth/login" -Method Post -ContentType "application/json" -Body (@{
    username = $Username
    password = $password
    deviceFingerprint = "jrn-009-runtime-$Username"
  } | ConvertTo-Json) -TimeoutSec 15
  $identity = Invoke-RestMethod "$IdentityBaseUrl/auth/session" -Headers @{ Authorization = "Bearer $($login.accessToken)" } -TimeoutSec 15
  if (-not $login.accessToken -or -not $identity.subject) { throw "Identity session failed for $Username" }
  return @{ Token = $login.accessToken; Subject = $identity.subject }
}

function Assert-HttpFailure {
  param([scriptblock]$Action, [int]$ExpectedStatus, [string]$Label)
  try {
    & $Action | Out-Null
    throw "$Label unexpectedly succeeded"
  } catch {
    $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { $null }
    if ($status -ne $ExpectedStatus) { throw "$Label returned $status instead of $ExpectedStatus. $($_.Exception.Message)" }
  }
}

Write-Host "=== JRN-009 all-slices runtime cart smoke ==="

$storeTruth = Invoke-DshScalar "SELECT service_area_code || '|' || city_code || '|' || COALESCE(latitude::text,'') || '|' || COALESCE(longitude::text,'') FROM dsh_stores WHERE id='store-test-grocery';"
$storeParts = $storeTruth.Split("|", 4)
if ($storeParts.Count -ne 4 -or -not $storeParts[0] -or -not $storeParts[2] -or -not $storeParts[3]) { throw "Store operational location truth is incomplete" }
$serviceAreaCode = $storeParts[0]
$storeLatitude = [double]::Parse($storeParts[2], [Globalization.CultureInfo]::InvariantCulture)
$storeLongitude = [double]::Parse($storeParts[3], [Globalization.CultureInfo]::InvariantCulture)

$assortment = Invoke-DshScalar "SELECT master_product_id || '|' || unit_price::text FROM dsh_store_assortments WHERE store_id='store-test-grocery' AND available=TRUE AND unit_price>0 ORDER BY master_product_id LIMIT 1;"
if (-not $assortment.Contains("|")) { throw "No priced grocery assortment" }
$parts = $assortment.Split("|", 2)
$masterProductId = $parts[0]
$expectedUnitPrice = [decimal]::Parse($parts[1], [Globalization.CultureInfo]::InvariantCulture)

$clientSession = Get-ActorSession "client"
$operatorSession = Get-ActorSession "operator"
$clientId = [string]$clientSession.Subject
$clientHeaders = @{ Authorization = "Bearer $($clientSession.Token)"; "X-Correlation-ID" = "jrn009-client-$([guid]::NewGuid())" }
$operatorHeaders = @{ Authorization = "Bearer $($operatorSession.Token)"; "X-Correlation-ID" = "jrn009-operator-$([guid]::NewGuid())" }
Invoke-DshScalar "UPDATE dsh_carts SET state='abandoned', version=version+1, updated_at=NOW() WHERE client_id='$clientId' AND state='active';" | Out-Null

$zoneId = "00000000-0000-0000-0000-000000009009"
$capacityId = "00000000-0000-0000-0000-000000009010"
$slaId = "00000000-0000-0000-0000-000000009011"
$escapedArea = $serviceAreaCode.Replace("'", "''")
Invoke-DshScalar @"
INSERT INTO dsh_platform_zones (id,name,city_code,is_active,description)
VALUES ('$zoneId'::uuid,'JRN-009 runtime zone','$escapedArea',TRUE,'Cart runtime policy zone')
ON CONFLICT (id) DO UPDATE SET city_code=EXCLUDED.city_code,is_active=TRUE,updated_at=NOW();
INSERT INTO dsh_platform_capacity_configs (id,zone_id,max_concurrent_orders,max_captains_online,throttle_threshold,updated_by)
VALUES ('$capacityId'::uuid,'$zoneId'::uuid,100000,100000,0.95,'jrn-009-runtime')
ON CONFLICT (zone_id) DO UPDATE SET max_concurrent_orders=EXCLUDED.max_concurrent_orders,max_captains_online=EXCLUDED.max_captains_online,throttle_threshold=EXCLUDED.throttle_threshold,version=dsh_platform_capacity_configs.version+1,updated_by=EXCLUDED.updated_by,updated_at=NOW();
INSERT INTO dsh_platform_sla_rules (id,zone_id,category,max_prep_mins,max_delivery_mins,updated_by)
VALUES ('$slaId'::uuid,'$zoneId'::uuid,'default',25,45,'jrn-009-runtime')
ON CONFLICT (zone_id,category) DO UPDATE SET max_prep_mins=EXCLUDED.max_prep_mins,max_delivery_mins=EXCLUDED.max_delivery_mins,version=dsh_platform_sla_rules.version+1,updated_by=EXCLUDED.updated_by,updated_at=NOW();
"@ | Out-Null

$addressList = Invoke-RestMethod "$DshBaseUrl/dsh/client/addresses" -Headers $clientHeaders -TimeoutSec 15
$address = @($addressList.addresses) | Where-Object { $_.serviceAreaCode -eq $serviceAreaCode } | Select-Object -First 1
if ($null -eq $address) {
  $addressHeaders = @{}; foreach ($key in $clientHeaders.Keys) { $addressHeaders[$key] = $clientHeaders[$key] }
  $addressHeaders["Idempotency-Key"] = "jrn009-address-$([guid]::NewGuid())"
  $addressHeaders["X-Correlation-ID"] = "jrn009-address-$([guid]::NewGuid())"
  $created = Invoke-RestMethod "$DshBaseUrl/dsh/client/addresses" -Method Post -Headers $addressHeaders -ContentType "application/json" -Body (@{
    label = "عنوان فحص الرحلة 9"
    recipientName = "عميل فحص الرحلة"
    phoneE164 = "+967770000009"
    addressLine = "عنوان فحص تشغيلي للرحلة التاسعة"
    serviceAreaCode = $serviceAreaCode
    latitude = $storeLatitude
    longitude = $storeLongitude
    makeDefault = $true
  } | ConvertTo-Json) -TimeoutSec 15
  $address = $created.address
}
if (-not $address.id) { throw "Owned address was not resolved" }

$serviceability = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart/serviceability" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body (@{
  storeId = "store-test-grocery"
  addressId = $address.id
  fulfillmentMode = "bthwani_delivery"
} | ConvertTo-Json) -TimeoutSec 15
if (-not $serviceability.serviceable -or $serviceability.addressId -ne $address.id) { throw "Owned-address serviceability failed: $($serviceability.code)" }
if (-not $serviceability.capacityConfigured -or $serviceability.capacityState -ne "available") { throw "Capacity policy was not evaluated" }
if (-not $serviceability.slaConfigured -or $serviceability.slaPrepMinutes -ne 25 -or $serviceability.slaDeliveryMinutes -ne 45) { throw "SLA policy was not evaluated" }
$checkCount = Invoke-DshScalar "SELECT COUNT(*) FROM dsh_cart_serviceability_checks WHERE client_id='$clientId' AND address_id='$($address.id)' AND store_id='store-test-grocery';"
if ([int]$checkCount -lt 1) { throw "Serviceability evidence was not persisted" }

$cartBody = @{ storeId="store-test-grocery"; fulfillmentMode="bthwani_delivery"; masterProductId=$masterProductId; quantity=2 } | ConvertTo-Json
$upsert = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart/items" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body $cartBody -TimeoutSec 15
if (-not $upsert.cartId -or -not $upsert.item.id -or [decimal]$upsert.item.unitPrice -ne $expectedUnitPrice -or -not $upsert.item.storeAssortmentId) { throw "Server snapshot write failed" }
$cartReadback = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart?storeId=store-test-grocery" -Headers $clientHeaders -TimeoutSec 15
if (-not $cartReadback.cart.validation.ready -or @($cartReadback.cart.items).Count -ne 1) { throw "Initial cart reconciliation failed" }

$newUnitPrice = $expectedUnitPrice + [decimal]1.00
$newPriceText = $newUnitPrice.ToString([Globalization.CultureInfo]::InvariantCulture)
Invoke-DshScalar "UPDATE dsh_store_assortments SET unit_price=$newPriceText,updated_at=NOW() WHERE store_id='store-test-grocery' AND master_product_id='$masterProductId';" | Out-Null
$priceChanged = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart?storeId=store-test-grocery" -Headers $clientHeaders -TimeoutSec 15
if ($priceChanged.cart.validation.ready -or -not $priceChanged.cart.validation.priceChanged -or [decimal]$priceChanged.cart.items[0].unitPrice -ne $expectedUnitPrice) { throw "Immutable price-change reconciliation failed" }
$priceAccepted = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart/items" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body $cartBody -TimeoutSec 15
if ([decimal]$priceAccepted.item.unitPrice -ne $newUnitPrice) { throw "Explicit price refresh failed" }

Invoke-DshScalar "UPDATE dsh_store_assortments SET available=FALSE,updated_at=NOW() WHERE store_id='store-test-grocery' AND master_product_id='$masterProductId';" | Out-Null
$unavailable = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart?storeId=store-test-grocery" -Headers $clientHeaders -TimeoutSec 15
if ($unavailable.cart.validation.ready -or $unavailable.cart.validation.unavailableCount -lt 1) { throw "Unavailable-item reconciliation failed" }
$operatorCarts = Invoke-RestMethod "$DshBaseUrl/dsh/operator/carts?state=active" -Headers $operatorHeaders -TimeoutSec 15
$operatorCart = @($operatorCarts.carts) | Where-Object { $_.id -eq $upsert.cartId } | Select-Object -First 1
if ($null -eq $operatorCart -or @($operatorCart.items).Count -ne 1 -or $operatorCart.validation.ready) { throw "Operator reconciliation readback failed" }
Invoke-DshScalar "UPDATE dsh_store_assortments SET available=TRUE,unit_price=$newPriceText,updated_at=NOW() WHERE store_id='store-test-grocery' AND master_product_id='$masterProductId';" | Out-Null

$foreignProduct = Invoke-DshScalar "SELECT a.master_product_id FROM dsh_store_assortments a WHERE a.store_id<>'store-test-grocery' AND a.available=TRUE AND a.unit_price>0 AND NOT EXISTS (SELECT 1 FROM dsh_store_assortments g WHERE g.store_id='store-test-grocery' AND g.master_product_id=a.master_product_id) ORDER BY a.master_product_id LIMIT 1;"
if ($foreignProduct) {
  $foreignBody = @{ storeId="store-test-grocery"; fulfillmentMode="bthwani_delivery"; masterProductId=$foreignProduct; quantity=1 } | ConvertTo-Json
  Assert-HttpFailure -ExpectedStatus 422 -Label "cross-store assortment mutation" -Action { Invoke-RestMethod "$DshBaseUrl/dsh/client/cart/items" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body $foreignBody -TimeoutSec 15 }
}

$otherStoreProduct = Invoke-DshScalar "SELECT store_id || '|' || master_product_id FROM dsh_store_assortments WHERE store_id<>'store-test-grocery' AND available=TRUE AND unit_price>0 ORDER BY store_id,master_product_id LIMIT 1;"
if (-not $otherStoreProduct.Contains("|")) { throw "Second store assortment is missing" }
$other = $otherStoreProduct.Split("|",2)
$otherBody = @{ storeId=$other[0]; fulfillmentMode="bthwani_delivery"; masterProductId=$other[1]; quantity=1 } | ConvertTo-Json
Assert-HttpFailure -ExpectedStatus 409 -Label "second active store cart" -Action { Invoke-RestMethod "$DshBaseUrl/dsh/client/cart/items" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body $otherBody -TimeoutSec 15 }
$activeCount = Invoke-DshScalar "SELECT COUNT(*) FROM dsh_carts WHERE client_id='$clientId' AND state='active';"
if ([int]$activeCount -ne 1) { throw "Single-active-cart invariant failed" }

Invoke-RestMethod "$DshBaseUrl/dsh/client/cart/items/$($upsert.item.id)?cartId=$($upsert.cartId)" -Method Delete -Headers $clientHeaders -TimeoutSec 15 | Out-Null
$afterDelete = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart?storeId=store-test-grocery" -Headers $clientHeaders -TimeoutSec 15
if (@($afterDelete.cart.items).Count -ne 0) { throw "Owned item delete failed" }
$reinsert = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart/items" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body $cartBody -TimeoutSec 15
Invoke-RestMethod "$DshBaseUrl/dsh/client/cart?cartId=$($reinsert.cartId)" -Method Delete -Headers $clientHeaders -TimeoutSec 15 | Out-Null
$afterClear = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart?storeId=store-test-grocery" -Headers $clientHeaders -TimeoutSec 15
if ($null -ne $afterClear.cart) { throw "Explicit clear did not abandon the active cart" }

Write-Host "JRN-009 all-slices runtime cart smoke: PASS"
