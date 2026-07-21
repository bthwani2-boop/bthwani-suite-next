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

function Get-ActorToken {
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
  return $login.accessToken
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

Write-Host "=== JRN-009 runtime cart smoke ==="

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

$clientToken = Get-ActorToken "client"
$operatorToken = Get-ActorToken "operator"
$clientHeaders = @{
  Authorization = "Bearer $clientToken"
  "X-Correlation-ID" = "jrn-009-client-$([guid]::NewGuid())"
}
$operatorHeaders = @{
  Authorization = "Bearer $operatorToken"
  "X-Correlation-ID" = "jrn-009-operator-$([guid]::NewGuid())"
}

# Start from a deterministic empty client cart for the governed store.
try {
  Invoke-RestMethod "$DshBaseUrl/dsh/client/cart?storeId=store-test-grocery" -Method Delete -Headers $clientHeaders -TimeoutSec 15 | Out-Null
} catch {
  if (-not $_.Exception.Response -or [int]$_.Exception.Response.StatusCode -notin @(204, 404)) { throw }
}

$serviceabilityBody = @{ storeId = "store-test-grocery" } | ConvertTo-Json
$serviceability = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart/serviceability" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body $serviceabilityBody -TimeoutSec 15
if (-not $serviceability.serviceable) {
  throw "store-test-grocery is not serviceable: $($serviceability.code) $($serviceability.reason)"
}
if (@($serviceability.availableModes).Count -eq 0) {
  throw "serviceability did not expose governed fulfillment modes"
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
if ($upsert.item.quantity -ne 2) {
  throw "cart item quantity readback was $($upsert.item.quantity), expected 2"
}

$cartReadback = Invoke-RestMethod "$DshBaseUrl/dsh/client/cart?storeId=store-test-grocery" -Headers $clientHeaders -TimeoutSec 15
if ($cartReadback.cart.id -ne $upsert.cartId) {
  throw "client cart readback returned a different cart"
}
if (@($cartReadback.cart.items).Count -ne 1) {
  throw "client cart readback did not return exactly one persisted item"
}
if ([decimal]$cartReadback.cart.items[0].unitPrice -ne $expectedUnitPrice) {
  throw "client cart readback lost the server price snapshot"
}

$operatorCarts = Invoke-RestMethod "$DshBaseUrl/dsh/operator/carts?state=active" -Headers $operatorHeaders -TimeoutSec 15
$operatorCart = @($operatorCarts.carts) | Where-Object { $_.id -eq $upsert.cartId } | Select-Object -First 1
if ($null -eq $operatorCart) {
  throw "operator cart activity did not include the persisted client cart"
}
if (@($operatorCart.items).Count -ne 1) {
  throw "operator cart activity did not hydrate persisted cart items"
}

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
  Assert-HttpFailure -ExpectedStatus 400 -Label "cross-store assortment mutation" -Action {
    Invoke-RestMethod "$DshBaseUrl/dsh/client/cart/items" -Method Post -Headers $clientHeaders -ContentType "application/json" -Body $foreignBody -TimeoutSec 15
  }
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

Write-Host "JRN-009 runtime cart smoke: PASS"
