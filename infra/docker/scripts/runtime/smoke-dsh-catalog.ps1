param(
  [Parameter(Mandatory = $true)]
  [string]$StatePath
)

Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "../../../../tools/dev/local-actors.ps1")
$ErrorActionPreference = "Stop"

Write-Host "`n--- DSH API smoke ---"

$health = Invoke-RestMethod "http://localhost:58080/dsh/health" -TimeoutSec 10 -ErrorAction Stop
Write-Host "  /dsh/health: $($health | ConvertTo-Json -Compress)"
if ($health.status -ne "healthy") { throw "/dsh/health not healthy: $($health.status)" }

$readiness = $null
$readinessReady = $false
for ($i = 1; $i -le 10; $i++) {
  try {
    $readiness = Invoke-RestMethod "http://localhost:58080/dsh/readiness" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "  /dsh/readiness attempt $i/10: $($readiness | ConvertTo-Json -Compress)"
    if ($readiness.status -eq "ready") {
      $readinessReady = $true
      break
    }
  } catch {
    Write-Host "  /dsh/readiness attempt $i/10 not ready: $_"
  }
  Start-Sleep -Seconds 3
}
if (-not $readinessReady) { throw "/dsh/readiness not ready after retries" }

$stores = Invoke-RestMethod "http://localhost:58080/dsh/stores?limit=10&offset=0" -TimeoutSec 10 -ErrorAction Stop
$count = if ($stores.stores) { $stores.stores.Count } else { 0 }
Write-Host "  /dsh/stores: returned $count stores"
if ($null -eq $stores.stores) { throw "/dsh/stores missing 'stores' field" }
if ($count -eq 0) { throw "/dsh/stores returned 0 stores — seed may not have run" }

$store1 = Invoke-RestMethod "http://localhost:58080/dsh/stores/store-test-grocery" -TimeoutSec 10 -ErrorAction Stop
Write-Host "  /dsh/stores/store-test-grocery: $($store1.store.displayName)"
if ($store1.store.id -ne "store-test-grocery") { throw "/dsh/stores/store-test-grocery returned wrong id" }

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
$operatorStores = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores" -Headers $operatorHeaders -TimeoutSec 10
if ($operatorStores.stores.Count -lt 1) { throw "operator store list returned no stores" }
$operatorStore = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/store-test-grocery" -Headers $operatorHeaders -TimeoutSec 10
$governanceHeaders = @{
  Authorization = "Bearer $operatorToken"
  "Idempotency-Key" = "smoke-operator-$([guid]::NewGuid())"
  "X-Correlation-ID" = "smoke-operator-$([guid]::NewGuid())"
}
$governanceBody = @{
  expectedVersion = $operatorStore.store.version
  action = "visibility"
  value = "visible"
  reason = "runtime smoke verification"
} | ConvertTo-Json
$governance = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/store-test-grocery/governance" -Method Post -Headers $governanceHeaders -ContentType "application/json" -Body $governanceBody -TimeoutSec 10
if ($governance.audit.actorRole -ne "operator") { throw "operator governance audit missing" }

# DSH-JOURNEY-001: prove the publication gate changes persisted state.
$hideHeaders = @{
  Authorization = "Bearer $operatorToken"
  "Idempotency-Key" = "smoke-hide-$([guid]::NewGuid())"
  "X-Correlation-ID" = "smoke-hide-$([guid]::NewGuid())"
}
$hideBody = @{
  expectedVersion = $governance.store.version
  action = "marketing-visibility"
  value = "hidden"
  reason = "runtime publication gate verification"
} | ConvertTo-Json
$hidden = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/store-test-grocery/governance" -Method Post -Headers $hideHeaders -ContentType "application/json" -Body $hideBody -TimeoutSec 10
try {
  Invoke-RestMethod "http://localhost:58080/dsh/stores/store-test-grocery" -TimeoutSec 10 -ErrorAction Stop | Out-Null
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
  action = "marketing-visibility"
  value = "visible"
  reason = "restore runtime publication gate"
} | ConvertTo-Json
$visible = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/store-test-grocery/governance" -Method Post -Headers $showHeaders -ContentType "application/json" -Body $showBody -TimeoutSec 10
$publicStore = Invoke-RestMethod "http://localhost:58080/dsh/stores/store-test-grocery" -TimeoutSec 10
if (-not $publicStore.store.publicationEligible) { throw "store publication gates were not restored" }

# DSH-JOURNEY-002: product proposal, transition pipeline, and assortment management
$partnerToken = Get-LocalActorToken (Get-LocalUsername "partner")
$partnerHeaders = @{
  Authorization = "Bearer $partnerToken"
  "X-Correlation-ID" = "smoke-catalog-$([guid]::NewGuid())"
}
$proposalBody = @{
  proposedNameAr = "منتج فحص الشريك"
  proposedNameEn = "Partner Smoke Product"
  domainId = "domain-groceries"
  categoryNodeId = "node-supermarket"
  brand = "بثواني"
  sourceSurface = "app-partner"
} | ConvertTo-Json
$proposal = Invoke-RestMethod "http://localhost:58080/dsh/partner/catalog/product-proposals" -Method Post -Headers $partnerHeaders -ContentType "application/json" -Body $proposalBody -TimeoutSec 10
if ([string]::IsNullOrWhiteSpace($proposal.proposal.id)) { throw "product proposal create did not persist" }

$operatorToken = Get-LocalActorToken (Get-LocalUsername "operator")
$operatorHeaders = @{
  Authorization = "Bearer $operatorToken"
  "X-Correlation-ID" = "smoke-operator-$([guid]::NewGuid())"
}

# Transition to partner-review using the proposal version returned by create.
$transBody1 = @{
  nextStatus = "partner-review"
  note = "smoke partner review"
  expectedVersion = [int]$proposal.proposal.version
} | ConvertTo-Json
$proposal = Invoke-RestMethod "http://localhost:58080/dsh/operator/catalog/product-proposals/$($proposal.proposal.id)/transition" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $transBody1 -TimeoutSec 10

# Transition to marketing-review using the version returned by partner review.
$transBody2 = @{
  nextStatus = "marketing-review"
  note = "smoke marketing review"
  expectedVersion = [int]$proposal.proposal.version
} | ConvertTo-Json
$proposal = Invoke-RestMethod "http://localhost:58080/dsh/operator/catalog/product-proposals/$($proposal.proposal.id)/transition" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $transBody2 -TimeoutSec 10

# Transition to catalog-adopted using the version returned by marketing review.
$transBody3 = @{
  nextStatus = "catalog-adopted"
  note = "smoke adopt"
  expectedVersion = [int]$proposal.proposal.version
} | ConvertTo-Json
$proposal = Invoke-RestMethod "http://localhost:58080/dsh/operator/catalog/product-proposals/$($proposal.proposal.id)/transition" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $transBody3 -TimeoutSec 10
if ([string]::IsNullOrWhiteSpace($proposal.proposal.adoptedMasterProductId)) { throw "master product was not created during adoption" }

# Attach an image to the Master Product so it can be approved and client-visible.
$imageBody = @{ assetId = "asset-node-canned-food" } | ConvertTo-Json
Invoke-RestMethod "http://localhost:58080/dsh/operator/catalog/master-products/$($proposal.proposal.adoptedMasterProductId)/images/canonical_product_image" -Method Put -Headers $operatorHeaders -ContentType "application/json" -Body $imageBody -TimeoutSec 10

# Transition to catalog-approved using the version returned by adoption.
$transBody4 = @{
  nextStatus = "catalog-approved"
  note = "smoke approve"
  expectedVersion = [int]$proposal.proposal.version
} | ConvertTo-Json
$proposal = Invoke-RestMethod "http://localhost:58080/dsh/operator/catalog/product-proposals/$($proposal.proposal.id)/transition" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $transBody4 -TimeoutSec 10

# Configure the store assortment price and availability with optimistic concurrency
# when an existing store-product link is being updated.
$assortmentList = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/store-test-grocery/assortment" -Headers $operatorHeaders -TimeoutSec 10
$currentAssortment = @($assortmentList.assortment) |
  Where-Object { $_.masterProductId -eq $proposal.proposal.adoptedMasterProductId } |
  Select-Object -First 1
$assortmentPayload = @{
  unitPrice = 10.00
  currency = "YER"
  available = $true
  stockStatus = "in_stock"
  publicationStatus = "client_visible"
}
if ($null -ne $currentAssortment) {
  $assortmentPayload.expectedVersion = [int]$currentAssortment.version
}
$assortmentBody = $assortmentPayload | ConvertTo-Json
$assortment = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/store-test-grocery/assortment/$($proposal.proposal.adoptedMasterProductId)" -Method Put -Headers $operatorHeaders -ContentType "application/json" -Body $assortmentBody -TimeoutSec 10

# Transition to client-visible using the version returned by catalog approval.
$transBody5 = @{
  nextStatus = "client-visible"
  note = "smoke publish"
  expectedVersion = [int]$proposal.proposal.version
} | ConvertTo-Json
$proposal = Invoke-RestMethod "http://localhost:58080/dsh/operator/catalog/product-proposals/$($proposal.proposal.id)/transition" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $transBody5 -TimeoutSec 10

# Verify catalog client exposure
$publishedCatalog = Invoke-RestMethod "http://localhost:58080/dsh/stores/store-test-grocery/catalog" -TimeoutSec 10
if ($publishedCatalog.products.Count -lt 1) { throw "approved catalog is not visible to app-client" }

$smokeCatalogProductId = $proposal.proposal.adoptedMasterProductId

@{
  masterProductId = [string]$smokeCatalogProductId
} | ConvertTo-Json | Set-Content -LiteralPath $StatePath -Encoding utf8
Write-Host "DSH catalog smoke: PASS"
