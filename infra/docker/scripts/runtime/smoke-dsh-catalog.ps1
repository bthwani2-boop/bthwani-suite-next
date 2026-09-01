param(
  [Parameter(Mandatory = $true)]
  [string]$StatePath,

  # Local seed-media is optional. Core smoke must not depend on a repository-
  # tracked placeholder asset; media mode proves the canonical local overlay.
  [switch]$MediaEnabled
)

Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "../../../../tools/dev/local-actors.ps1")
$ErrorActionPreference = "Stop"

$dshApiHostPort = if ([string]::IsNullOrWhiteSpace($env:BTHWANI_DSH_API_HOST_PORT)) { "18080" } else { $env:BTHWANI_DSH_API_HOST_PORT }
$dshBaseUrl = "http://localhost:$dshApiHostPort"

$identityApiHostPort = if ([string]::IsNullOrWhiteSpace($env:BTHWANI_IDENTITY_API_HOST_PORT)) { "18082" } else { $env:BTHWANI_IDENTITY_API_HOST_PORT }
$identityBaseUrl = if ([string]::IsNullOrWhiteSpace($env:IDENTITY_API_BASE_URL)) { "http://localhost:$identityApiHostPort" } else { $env:IDENTITY_API_BASE_URL }

Write-Host "`n--- DSH API smoke ---"

$health = Invoke-RestMethod "$dshBaseUrl/dsh/health" -TimeoutSec 10 -ErrorAction Stop
Write-Host "  /dsh/health: $($health | ConvertTo-Json -Compress)"
if ($health.status -ne "healthy") { throw "/dsh/health not healthy: $($health.status)" }

$readiness = $null
$readinessReady = $false
for ($i = 1; $i -le 10; $i++) {
  try {
    $readiness = Invoke-RestMethod "$dshBaseUrl/dsh/readiness" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "  /dsh/readiness attempt $i/10: $($readiness | ConvertTo-Json -Compress)"
    if ($readiness.status -eq "HEALTHY") {
      $readinessReady = $true
      break
    }
  } catch {
    Write-Host "  /dsh/readiness attempt $i/10 not ready: $_"
  }
  Start-Sleep -Seconds 3
}
if (-not $readinessReady) { throw "/dsh/readiness not ready after retries" }

$stores = Invoke-RestMethod "$dshBaseUrl/dsh/stores?limit=10&offset=0" -TimeoutSec 10 -ErrorAction Stop
$count = if ($stores.stores) { $stores.stores.Count } else { 0 }
Write-Host "  /dsh/stores: returned $count stores"
if ($null -eq $stores.stores) { throw "/dsh/stores missing 'stores' field" }
if ($count -eq 0) { throw "/dsh/stores returned 0 stores — seed may not have run" }

$store1 = Invoke-RestMethod "$dshBaseUrl/dsh/stores/store-test-grocery" -TimeoutSec 10 -ErrorAction Stop
Write-Host "  /dsh/stores/store-test-grocery: $($store1.store.displayName)"
if ($store1.store.id -ne "store-test-grocery") { throw "/dsh/stores/store-test-grocery returned wrong id" }

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

function Get-HttpFailureBody($Failure) {
  if ($null -eq $Failure.Exception.Response) { return "" }
  try {
    $stream = $Failure.Exception.Response.GetResponseStream()
    if ($null -eq $stream) { return "" }
    $reader = [System.IO.StreamReader]::new($stream)
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
  } catch { return "" }
}

$operatorToken = Get-LocalActorToken (Get-LocalUsername "operator")
$operatorHeaders = @{ Authorization = "Bearer $operatorToken" }
$operatorStores = Invoke-RestMethod "$dshBaseUrl/dsh/operator/stores" -Headers $operatorHeaders -TimeoutSec 10
if ($operatorStores.stores.Count -lt 1) { throw "operator store list returned no stores" }
$operatorStore = Invoke-RestMethod "$dshBaseUrl/dsh/operator/stores/store-test-grocery" -Headers $operatorHeaders -TimeoutSec 10
$publicationWorkspace = Invoke-RestMethod "$dshBaseUrl/dsh/operator/marketing/stores/store-test-grocery/publication" -Headers $operatorHeaders -TimeoutSec 10
if ($publicationWorkspace.store.id -ne "store-test-grocery") { throw "marketing publication workspace returned the wrong store" }

# DSH-JOURNEY-001: prove the publication gate changes persisted state.
$hideHeaders = @{
  Authorization = "Bearer $operatorToken"
  "Idempotency-Key" = "smoke-hide-$([guid]::NewGuid())"
  "X-Correlation-ID" = "smoke-hide-$([guid]::NewGuid())"
}
$hideBody = @{
  expectedVersion = $publicationWorkspace.store.version
  decision = "hide"
  reason = "runtime publication gate verification"
} | ConvertTo-Json
$hidden = Invoke-RestMethod "$dshBaseUrl/dsh/operator/marketing/stores/store-test-grocery/publication" -Method Post -Headers $hideHeaders -ContentType "application/json" -Body $hideBody -TimeoutSec 10
try {
  Invoke-RestMethod "$dshBaseUrl/dsh/stores/store-test-grocery" -TimeoutSec 10 -ErrorAction Stop | Out-Null
  throw "store remained publicly visible after marketing gate was hidden"
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 404) { throw }
}
$showHeaders = @{
  Authorization = "Bearer $operatorToken"
  "Idempotency-Key" = "smoke-show-$([guid]::NewGuid())"
  "X-Correlation-ID" = "smoke-show-$([guid]::NewGuid())"
}
$showBody = @{
  expectedVersion = $hidden.store.version
  decision = "publish"
  reason = "restore runtime publication gate"
} | ConvertTo-Json
$visible = Invoke-RestMethod "$dshBaseUrl/dsh/operator/marketing/stores/store-test-grocery/publication" -Method Post -Headers $showHeaders -ContentType "application/json" -Body $showBody -TimeoutSec 10
$publicStore = Invoke-RestMethod "$dshBaseUrl/dsh/stores/store-test-grocery" -TimeoutSec 10
if ($publicStore.store.publicationDecision -ne "PUBLISHED") { throw "store publication gates were not restored" }

# DSH-JOURNEY-002: product proposal, transition pipeline, and assortment management
$partnerToken = Get-LocalActorToken (Get-LocalUsername "partner")
$partnerHeaders = @{
  Authorization = "Bearer $partnerToken"
  "Idempotency-Key" = "smoke-catalog-proposal-$([guid]::NewGuid())"
  "X-Correlation-ID" = "smoke-catalog-$([guid]::NewGuid())"
}
$proposalBody = @{
  proposedNameAr = "شاي أحمر فاخر كبوس 225 جم"
  proposedNameEn = "Al-Kbous Premium Black Tea 225g"
  domainId = "domain-groceries"
  categoryNodeId = "node-supermarket"
  brand = "الكبوس"
  sourceSurface = "app-partner"
} | ConvertTo-Json
$proposal = Invoke-RestMethod "$dshBaseUrl/dsh/partner/catalog/product-proposals?storeId=$([uri]::EscapeDataString('store-test-grocery'))" -Method Post -Headers $partnerHeaders -ContentType "application/json" -Body $proposalBody -TimeoutSec 10
if ([string]::IsNullOrWhiteSpace($proposal.proposal.id)) { throw "product proposal create did not persist" }

$operatorToken = Get-LocalActorToken (Get-LocalUsername "operator")
$operatorHeaders = @{
  Authorization = "Bearer $operatorToken"
  "X-Correlation-ID" = "smoke-operator-$([guid]::NewGuid())"
}

$transBody1 = @{
  nextStatus = "partner-review"
  note = "smoke partner review"
  expectedVersion = [int]$proposal.proposal.version
} | ConvertTo-Json
$proposal = Invoke-RestMethod "$dshBaseUrl/dsh/operator/catalog/product-proposals/$($proposal.proposal.id)/transition" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $transBody1 -TimeoutSec 10

$transBody2 = @{
  nextStatus = "marketing-review"
  note = "smoke marketing review"
  expectedVersion = [int]$proposal.proposal.version
} | ConvertTo-Json
$proposal = Invoke-RestMethod "$dshBaseUrl/dsh/operator/catalog/product-proposals/$($proposal.proposal.id)/transition" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $transBody2 -TimeoutSec 10

$transBody3 = @{
  nextStatus = "catalog-adopted"
  note = "smoke adopt"
  expectedVersion = [int]$proposal.proposal.version
} | ConvertTo-Json
$proposal = Invoke-RestMethod "$dshBaseUrl/dsh/operator/catalog/product-proposals/$($proposal.proposal.id)/transition" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $transBody3 -TimeoutSec 10
if ([string]::IsNullOrWhiteSpace($proposal.proposal.adoptedMasterProductId)) { throw "master product was not created during adoption" }

# The platform policy decides whether an image is needed. The local seed-media
# overlay supplies a governed approved asset when explicitly enabled; core smoke
# must never rely on an absent repository placeholder.
if ($MediaEnabled) {
  $imageBody = @{ assetId = "asset-node-canned-food" } | ConvertTo-Json
  $imageUrl = "$dshBaseUrl/dsh/operator/catalog/master-products/$($proposal.proposal.adoptedMasterProductId)/images/canonical_product_image"
  try {
    Invoke-RestMethod $imageUrl -Method Put -Headers $operatorHeaders -ContentType "application/json" -Body $imageBody -TimeoutSec 10 | Out-Null
  } catch {
    $status = if ($null -ne $_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    $failureBody = Get-HttpFailureBody $_
    throw "master product image attach failed: status=$status body=$failureBody"
  }
}

$transBody4 = @{
  nextStatus = "catalog-approved"
  note = "smoke approve"
  expectedVersion = [int]$proposal.proposal.version
} | ConvertTo-Json
$proposal = Invoke-RestMethod "$dshBaseUrl/dsh/operator/catalog/product-proposals/$($proposal.proposal.id)/transition" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $transBody4 -TimeoutSec 10

$assortmentUrl = "$dshBaseUrl/dsh/operator/stores/store-test-grocery/assortment/$($proposal.proposal.adoptedMasterProductId)"
$assortmentList = Invoke-RestMethod "$dshBaseUrl/dsh/operator/stores/store-test-grocery/assortment" -Headers $operatorHeaders -TimeoutSec 10
$currentAssortment = @($assortmentList.assortments) |
  Where-Object { $_.masterProductId -eq $proposal.proposal.adoptedMasterProductId } |
  Select-Object -First 1

if ($null -eq $currentAssortment) {
  $draftAssortmentBody = @{
    localNote = "runtime smoke assortment"
    customImageObjectKey = $null
    publicationStatus = "draft"
  } | ConvertTo-Json
  $createdAssortment = Invoke-RestMethod $assortmentUrl -Method Put -Headers $operatorHeaders -ContentType "application/json" -Body $draftAssortmentBody -TimeoutSec 10
  $currentAssortment = $createdAssortment.assortment
}

$priceBody = @{
  amountMinor = 1000
  currency = "YER"
  prepTimeMin = 15
  prepTimeMax = 30
  effectiveFrom = [DateTimeOffset]::UtcNow.AddMinutes(-1).ToString("o")
} | ConvertTo-Json
$priceHeaders = @{
  Authorization = "Bearer $operatorToken"
  "Idempotency-Key" = "smoke-catalog-price-$([guid]::NewGuid())"
  "X-Correlation-ID" = "smoke-catalog-price-$([guid]::NewGuid())"
}
Invoke-RestMethod "$assortmentUrl/prices" -Method Post -Headers $priceHeaders -ContentType "application/json" -Body $priceBody -TimeoutSec 10 | Out-Null

$inventoryBody = @{
  policyType = "quantity"
  quantity = 100
  minOrderQuantity = 1
  maxOrderQuantity = 100
  stepQuantity = 1
  expectedVersion = 0
} | ConvertTo-Json
Invoke-RestMethod "$assortmentUrl/inventory" -Method Put -Headers $operatorHeaders -ContentType "application/json" -Body $inventoryBody -TimeoutSec 10 | Out-Null

$inventory = Invoke-RestMethod "$assortmentUrl/inventory" -Headers $operatorHeaders -TimeoutSec 10
if ($null -eq $inventory.inventory -or [int]$inventory.inventory.quantity -ne 100 -or
    [int]$inventory.inventory.reservedQuantity -ne 0 -or
    $inventory.inventory.policyType -ne "quantity") {
  throw "normalized assortment inventory truth was not persisted"
}
$prices = Invoke-RestMethod "$assortmentUrl/prices" -Headers $operatorHeaders -TimeoutSec 10
$currentPrice = @($prices.prices) | Select-Object -First 1
if ($null -eq $currentPrice -or [int]$currentPrice.amountMinor -ne 1000 -or $currentPrice.currency -ne "YER") {
  throw "normalized assortment effective price was not persisted"
}

$expectedPublicationStatus = if ($MediaEnabled) { "client_visible" } else { "approved" }
$publishAssortmentBody = @{
  localNote = [string]$currentAssortment.localNote
  customImageObjectKey = $currentAssortment.customImageObjectKey
  publicationStatus = $expectedPublicationStatus
  expectedVersion = [int]$currentAssortment.version
} | ConvertTo-Json
$assortment = Invoke-RestMethod $assortmentUrl -Method Put -Headers $operatorHeaders -ContentType "application/json" -Body $publishAssortmentBody -TimeoutSec 10
if ($assortment.assortment.publicationStatus -ne $expectedPublicationStatus) {
  throw "normalized assortment publication was not persisted"
}

if ($MediaEnabled) {
  $transBody5 = @{
    nextStatus = "client-visible"
    note = "smoke publish"
    expectedVersion = [int]$proposal.proposal.version
  } | ConvertTo-Json
  $proposal = Invoke-RestMethod "$dshBaseUrl/dsh/operator/catalog/product-proposals/$($proposal.proposal.id)/transition" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $transBody5 -TimeoutSec 10

  $publishedCatalog = Invoke-RestMethod "$dshBaseUrl/dsh/stores/store-test-grocery/catalog" -TimeoutSec 10
  if ($publishedCatalog.products.Count -lt 1) { throw "approved catalog is not visible to app-client" }
  $publishedCheckoutProduct = @($publishedCatalog.products) |
    Where-Object { [string]$_.id -eq [string]$proposal.proposal.adoptedMasterProductId } |
    Select-Object -First 1
  if ($null -eq $publishedCheckoutProduct) {
    throw "newly approved catalog product is not visible to app-client"
  }
  $clientCheckoutProductId = [string]$proposal.proposal.adoptedMasterProductId
} else {
  # Media-neutral mode deliberately leaves the newly adopted product at
  # publication_status=approved because no governed product image overlay is
  # active. Checkout must consume a separate canonical client-visible product
  # readback; it must never reinterpret approved as client-visible.
  $clientCatalog = Invoke-RestMethod "$dshBaseUrl/dsh/stores/store-test-grocery/catalog" -TimeoutSec 10
  $clientCheckoutProduct = @($clientCatalog.products) | Select-Object -First 1
  if ($null -eq $clientCheckoutProduct -or [string]::IsNullOrWhiteSpace([string]$clientCheckoutProduct.id)) {
    throw "media-neutral catalog has no canonical client-visible product for checkout handoff"
  }
  $clientCheckoutProductId = [string]$clientCheckoutProduct.id
  Write-Host "  DSH catalog media-neutral mode: client-visible cutover skipped; checkout uses canonical product $clientCheckoutProductId."
}

$smokeCatalogProductId = $proposal.proposal.adoptedMasterProductId
@{
  masterProductId = [string]$smokeCatalogProductId
  clientCheckoutProductId = [string]$clientCheckoutProductId
} |
  ConvertTo-Json | Set-Content -LiteralPath $StatePath -Encoding utf8
Write-Host "DSH catalog smoke: PASS"
