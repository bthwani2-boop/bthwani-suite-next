param(
  [Parameter(Mandatory = $true)]
  [string]$StatePath,

  [switch]$MediaEnabled
)

Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "../../../../tools/dev/local-actors.ps1")
. (Join-Path $PSScriptRoot "../../../../tools/dev/local-workforce-actors.ps1")
$ErrorActionPreference = "Stop"

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
$operatorHeaders = @{
  Authorization = "Bearer $operatorToken"
  "X-Correlation-ID" = "smoke-operator-$([guid]::NewGuid())"
}
$partnerToken = Get-LocalActorToken (Get-LocalUsername "partner")
$partnerActor = Get-LocalActor "partner"
$partnerHeaders = @{
  Authorization = "Bearer $partnerToken"
  "X-Correlation-ID" = "smoke-partner-$([guid]::NewGuid())"
}

if (-not (Test-Path -LiteralPath $StatePath -PathType Leaf)) {
  throw "Partner Onboarding & Store Publication requires catalog smoke state: $StatePath"
}
$catalogState = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
$smokeCatalogProductId = [string]$catalogState.masterProductId
if ([string]::IsNullOrWhiteSpace($smokeCatalogProductId)) {
  throw "Partner Onboarding & Store Publication catalog state has no masterProductId"
}

# Partner Onboarding & Store Publication: partner lifecycle from field draft to client-visible store readiness.
$fieldToken = Get-ProvisionedWorkforceActorToken `
  -Kind "field" `
  -OperatorToken $operatorToken `
  -DeviceFingerprint "dsh-partner-onboarding"
$fieldHeaders = @{
  Authorization = "Bearer $fieldToken"
  "X-Correlation-ID" = "smoke-partner-field-$([guid]::NewGuid())"
}
$partnerSuffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$partnerDraftBody = @{
  legalNameAr = "مؤسسة فحص الشركاء $partnerSuffix"
  legalNameEn = "Partner Activation Smoke $partnerSuffix"
  displayName = "شريك فحص $partnerSuffix"
  legalIdentityType = "commercial_register"
  legalIdentityNumber = "YE-SMOKE-$partnerSuffix"
  ownerActorId = [string]$partnerActor.actorId
  primaryPhone = "+96777$($partnerSuffix.ToString().Substring($partnerSuffix.ToString().Length - 7))"
  category = "grocery"
  notes = "Partner Onboarding & Store Publication runtime smoke"
} | ConvertTo-Json
$partnerDraftHeaders = @{}
foreach ($key in $fieldHeaders.Keys) {
  $partnerDraftHeaders[$key] = $fieldHeaders[$key]
}
$partnerDraftHeaders["X-Correlation-ID"] = "smoke-partner-draft-$([guid]::NewGuid())"
$partnerDraftHeaders["Idempotency-Key"] = "smoke-partner-draft-$partnerSuffix-$([guid]::NewGuid())"
$partnerDraft = Invoke-RestMethod "http://localhost:58080/dsh/field/partners/drafts" -Method Post -Headers $partnerDraftHeaders -ContentType "application/json" -Body $partnerDraftBody -TimeoutSec 10
if ([string]::IsNullOrWhiteSpace($partnerDraft.id)) { throw "Partner Onboarding & Store Publication draft create did not return partner id" }
if (-not $partnerDraft.version) { throw "Partner Onboarding & Store Publication draft create did not return partner version" }

# Draft creation owns the first store immediately. Complete the field-owned
# location and operating profile before submission because those readiness
# gates are server-enforced and must not be bypassed by the smoke flow.
$fieldStore = Invoke-RestMethod "http://localhost:58080/dsh/field/partners/$($partnerDraft.id)/store" -Headers $fieldHeaders -TimeoutSec 10
$smokeStoreId = [string]$fieldStore.storeId
if ([string]::IsNullOrWhiteSpace($smokeStoreId)) { throw "Partner Onboarding & Store Publication auto-created store id is empty" }

$storeProfileBody = @{
  displayName = "متجر فحص الشريك $partnerSuffix"
  cityCode = "sanaa"
  serviceAreaCode = "sanaa-haddah"
  addressLine = "حدة، شارع الخمسين، صنعاء"
  coverageSummary = "نطاق توصيل محلي ضمن حدة والمناطق المجاورة"
  operatingHours = "السبت-الخميس 08:00-23:00"
  deliveryReadiness = "ready"
  storefrontPhotoRef = "media_smoke_storefront.jpg"
  interiorPhotoRef = "media_smoke_interior.jpg"
  signagePhotoRef = "media_smoke_signage.jpg"
} | ConvertTo-Json
$storeProfileHeaders = @{}
foreach ($key in $fieldHeaders.Keys) {
  $storeProfileHeaders[$key] = $fieldHeaders[$key]
}
$storeProfileHeaders["X-Correlation-ID"] = "smoke-partner-store-profile-$([guid]::NewGuid())"
$storeProfileHeaders["Idempotency-Key"] = "smoke-partner-store-profile-$($partnerDraft.id)-$([guid]::NewGuid())"
$updatedStore = Invoke-RestMethod "http://localhost:58080/dsh/field/partners/$($partnerDraft.id)/store" -Method Patch -Headers $storeProfileHeaders -ContentType "application/json" -Body $storeProfileBody -TimeoutSec 10
if ($updatedStore.storeId -ne $smokeStoreId) { throw "Partner Onboarding & Store Publication store profile update returned another store" }
if ([string]::IsNullOrWhiteSpace($updatedStore.store.addressLine)) { throw "Partner Onboarding & Store Publication store location was not persisted" }
if ([string]::IsNullOrWhiteSpace($updatedStore.store.operatingHours)) { throw "Partner Onboarding & Store Publication store operating profile was not persisted" }
if ([string]::IsNullOrWhiteSpace($updatedStore.store.deliveryReadiness)) { throw "Partner Onboarding & Store Publication store delivery readiness was not persisted" }

# The authenticated owner configures bounded operating settings. This proves
# that the partner/store actor binding created by onboarding is usable and gives
# publication a real delivery mode instead of relying on seed defaults.
$settingsHeaders = @{}
foreach ($key in $partnerHeaders.Keys) {
  $settingsHeaders[$key] = $partnerHeaders[$key]
}
$settingsHeaders["X-Correlation-ID"] = "smoke-partner-store-settings-$([guid]::NewGuid())"
$settingsHeaders["Idempotency-Key"] = "smoke-partner-store-settings-$smokeStoreId-$([guid]::NewGuid())"
$settingsBody = @{
  expectedVersion = [int]$updatedStore.store.version
  status = "ready"
  deliveryModes = @("delivery", "pickup")
  reason = "Partner Onboarding & Store Publication operating settings complete"
} | ConvertTo-Json
$settings = Invoke-RestMethod "http://localhost:58080/dsh/partner/stores/$smokeStoreId/settings" -Method Patch -Headers $settingsHeaders -ContentType "application/json" -Body $settingsBody -TimeoutSec 10
if ($settings.store.status -ne "ready") { throw "Partner Onboarding & Store Publication store settings did not reach ready" }
if (@($settings.store.deliveryModes).Count -lt 1) { throw "Partner Onboarding & Store Publication store settings did not persist delivery modes" }

# Submission readiness reads a WLT-owned official-wallet destination. Configure
# the destination through the canonical DSH finance-control boundary first;
# direct partner self-service remains deliberately read-only. WLT owns the
# provider, encrypted reference and destination version; DSH stores only the
# durable reference and masked readiness projection.
$destinationBody = @{
  beneficiaryName = [string]$partnerDraft.displayName
  officialWalletProviderKey = "bthwani_local_wallet"
  destinationReference = "local-wallet-$partnerSuffix"
  reason = "Partner Onboarding & Store Publication runtime smoke payout setup"
  evidenceReference = "runtime-smoke:$($partnerDraft.id)"
} | ConvertTo-Json
$destinationHeaders = @{}
foreach ($key in $operatorHeaders.Keys) {
  $destinationHeaders[$key] = $operatorHeaders[$key]
}
$destinationHeaders["X-Correlation-ID"] = "smoke-partner-finance-payout-$([guid]::NewGuid())"
$destinationHeaders["Idempotency-Key"] = "smoke-partner-finance-payout-$($partnerDraft.id)-$([guid]::NewGuid())"
$destination = Invoke-RestMethod "http://localhost:58080/dsh/control-panel/finance/payout-destinations/partner/$($partnerActor.actorId)" -Method Put -Headers $destinationHeaders -ContentType "application/json" -Body $destinationBody -TimeoutSec 10
if ([string]::IsNullOrWhiteSpace([string]$destination.payoutDestination.id)) { throw "Partner Onboarding & Store Publication finance payout setup did not return a destination id" }
if ([string]$destination.payoutDestination.ownerActorId -ne [string]$partnerActor.actorId -or [string]$destination.payoutDestination.ownerActorType -ne "partner") { throw "Partner Onboarding & Store Publication finance payout setup owner mismatch" }
if ([string]$destination.payoutDestination.destinationVerificationStatus -ne "unverified") { throw "Partner Onboarding & Store Publication new payout destination must start unverified" }

# Partner self-service is deliberately read-only: destination master-data writes
# remain an operator-only boundary and are proved unavailable below.
$payoutHeaders = @{}
foreach ($key in $partnerHeaders.Keys) {
  $payoutHeaders[$key] = $partnerHeaders[$key]
}
$payoutHeaders["X-Correlation-ID"] = "smoke-partner-payout-$([guid]::NewGuid())"
$payoutReadback = Invoke-WebRequest "http://localhost:58080/dsh/partner/me/finance/payout-destination" -Headers $payoutHeaders -TimeoutSec 10 -SkipHttpErrorCheck
$payoutResult = $null
$payoutDestination = $null
if ($payoutReadback.StatusCode -eq 404) {
  $payoutError = $payoutReadback.Content | ConvertFrom-Json
  if ([string]$payoutError.code -ne "PAYOUT_DESTINATION_NOT_FOUND") {
    throw "Partner Onboarding & Store Publication returned an unexpected payout readback 404: $($payoutReadback.Content)"
  }
} elseif ($payoutReadback.StatusCode -ge 200 -and $payoutReadback.StatusCode -lt 300) {
  $payoutResult = $payoutReadback.Content | ConvertFrom-Json
  $payoutDestination = $payoutResult.payoutDestination
} else {
  throw "Partner Onboarding & Store Publication payout readback failed with HTTP $($payoutReadback.StatusCode): $($payoutReadback.Content)"
}
if ($null -ne $payoutDestination) {
  if ([string]$payoutDestination.ownerActorId -ne [string]$partnerActor.actorId -or $payoutDestination.ownerActorType -ne "partner") { throw "Partner Onboarding & Store Publication WLT payout destination ownership mismatch" }
  if ($payoutDestination.officialWalletProviderKey -ne "bthwani_local_wallet") { throw "Partner Onboarding & Store Publication WLT provider key mismatch" }
  if ($payoutDestination.destinationMethod -ne "official_wallet") { throw "Partner Onboarding & Store Publication payout destination is not official_wallet" }
  if ([int]$payoutDestination.destinationVersion -lt 1) { throw "Partner Onboarding & Store Publication payout destination has no governed version" }
  if ([string]::IsNullOrWhiteSpace($payoutDestination.maskedDestinationReference)) { throw "Partner Onboarding & Store Publication payout destination was not masked" }
}

$mutationProbe = Invoke-WebRequest "http://localhost:58080/dsh/partner/me/finance/payout-destination" -Method Put -Headers $payoutHeaders -ContentType "application/json" -Body '{}' -TimeoutSec 10 -SkipHttpErrorCheck
if ($mutationProbe.StatusCode -notin @(404, 405)) { throw "Partner Onboarding & Store Publication allowed a Partner payout destination mutation (HTTP $($mutationProbe.StatusCode))" }

$payoutPartner = Invoke-RestMethod "http://localhost:58080/dsh/field/partners/$($partnerDraft.id)" -Headers $fieldHeaders -TimeoutSec 10
if ($null -eq $payoutDestination) {
  if (-not [string]::IsNullOrWhiteSpace([string]$payoutPartner.payoutDestinationId)) { throw "Partner Onboarding & Store Publication DSH payout projection exposed a destination absent from WLT" }
} else {
  if ([string]$payoutPartner.payoutDestinationId -ne [string]$payoutDestination.id) { throw "Partner Onboarding & Store Publication DSH payout projection did not bind the WLT destination" }
  if ($payoutPartner.destinationMethod -ne "official_wallet") { throw "Partner Onboarding & Store Publication DSH payout projection is not official_wallet" }
  if ([string]$payoutPartner.maskedDestinationReference -ne [string]$payoutDestination.maskedDestinationReference) { throw "Partner Onboarding & Store Publication DSH payout mask diverged from WLT" }
}

$smokeTempPath = [System.IO.Path]::GetTempPath()
$visitEvidencePath = Join-Path $smokeTempPath ("dsh-partner-visit-" + [guid]::NewGuid().ToString("N") + ".png")
$onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
[System.IO.File]::WriteAllBytes($visitEvidencePath, [Convert]::FromBase64String($onePixelPng))
try {
  $visitEvidenceUpload = Invoke-RestMethod "http://localhost:58080/dsh/field/media/uploads" -Method Post -Headers $fieldHeaders -Form @{
    partnerId = [string]$partnerDraft.id
    storeId = $smokeStoreId
    mediaKind = "visit_evidence"
    file = Get-Item -LiteralPath $visitEvidencePath
  } -TimeoutSec 20
} finally {
  if (Test-Path -LiteralPath $visitEvidencePath) { Remove-Item -LiteralPath $visitEvidencePath -Force }
}
if ([string]::IsNullOrWhiteSpace([string]$visitEvidenceUpload.mediaRef)) { throw "Partner Onboarding & Store Publication visit evidence upload did not return mediaRef" }

$visitBody = @{
  storeId = $smokeStoreId
  visitNotes = "field visit for Partner Onboarding & Store Publication smoke"
  locationLatitude = 15.3229
  locationLongitude = 44.2075
  evidenceMediaRefs = @([string]$visitEvidenceUpload.mediaRef)
} | ConvertTo-Json

$visit = Invoke-RestMethod "http://localhost:58080/dsh/field/partners/$($partnerDraft.id)/visits" -Method Post -Headers $fieldHeaders -ContentType "application/json" -Body $visitBody -TimeoutSec 10
if ($visit.visitStatus -ne "submitted") { throw "Partner Onboarding & Store Publication field visit was not submitted" }

$documentEvidencePath = Join-Path $smokeTempPath ("dsh-partner-document-" + [guid]::NewGuid().ToString("N") + ".png")
[System.IO.File]::WriteAllBytes($documentEvidencePath, [Convert]::FromBase64String($onePixelPng))
try {
  $documentEvidenceUpload = Invoke-RestMethod "http://localhost:58080/dsh/field/media/uploads" -Method Post -Headers $fieldHeaders -Form @{
    partnerId = [string]$partnerDraft.id
    mediaKind = "legal_document"
    file = Get-Item -LiteralPath $documentEvidencePath
  } -TimeoutSec 20
} finally {
  if (Test-Path -LiteralPath $documentEvidencePath) { Remove-Item -LiteralPath $documentEvidencePath -Force }
}
if ([string]::IsNullOrWhiteSpace([string]$documentEvidenceUpload.mediaRef)) { throw "Partner Onboarding & Store Publication legal document upload did not return mediaRef" }

$docBody = @{
  documentType = "commercial_register"
  mediaRef = [string]$documentEvidenceUpload.mediaRef
  notes = "commercial register smoke document"
} | ConvertTo-Json
$doc = Invoke-RestMethod "http://localhost:58080/dsh/field/partners/$($partnerDraft.id)/documents" -Method Post -Headers $fieldHeaders -ContentType "application/json" -Body $docBody -TimeoutSec 10
if ([string]::IsNullOrWhiteSpace($doc.id)) { throw "Partner Onboarding & Store Publication document upload did not return document id" }

$submitBody = @{ reason = "field submitted Partner Onboarding & Store Publication smoke partner" } | ConvertTo-Json
$submitted = Invoke-RestMethod "http://localhost:58080/dsh/field/partners/$($partnerDraft.id)/submit" -Method Post -Headers $fieldHeaders -ContentType "application/json" -Body $submitBody -TimeoutSec 10
if ($submitted.partner.activationStatus -ne "submitted") { throw "Partner Onboarding & Store Publication submit did not reach submitted" }

$partnerStores = Invoke-RestMethod "http://localhost:58080/dsh/operator/partners/$($partnerDraft.id)/stores" -Headers $operatorHeaders -TimeoutSec 10
if ($partnerStores.total -lt 1) { throw "Partner Onboarding & Store Publication partner has no auto-created store" }
if (-not (@($partnerStores.stores).id -contains $smokeStoreId)) { throw "Partner Onboarding & Store Publication operator readback did not include the first store" }

function Invoke-PartnerTransition([string] $PartnerId, [string] $ToStatus) {
  $current = Invoke-RestMethod "http://localhost:58080/dsh/operator/partners/$PartnerId" -Headers $operatorHeaders -TimeoutSec 10
  if (-not $current.version) { throw "Partner Onboarding & Store Publication transition to $ToStatus could not read partner version" }

  $headers = @{}
  foreach ($key in $operatorHeaders.Keys) {
    $headers[$key] = $operatorHeaders[$key]
  }
  $headers["X-Correlation-ID"] = "smoke-partner-transition-$ToStatus-$([guid]::NewGuid())"
  $headers["Idempotency-Key"] = "smoke-partner-transition-$PartnerId-$ToStatus-$([guid]::NewGuid())"
  $headers["If-Match-Version"] = [string]$current.version

  $body = @{
    toStatus = $ToStatus
    reason = "Partner Onboarding & Store Publication runtime smoke transition to $ToStatus"
  } | ConvertTo-Json
  $result = Invoke-RestMethod "http://localhost:58080/dsh/operator/partners/$PartnerId/transition" -Method Post -Headers $headers -ContentType "application/json" -Body $body -TimeoutSec 10
  if ($result.partner.activationStatus -ne $ToStatus) { throw "Partner Onboarding & Store Publication transition to $ToStatus failed" }
  if ($result.partner.version -le $current.version) { throw "Partner Onboarding & Store Publication transition to $ToStatus did not advance partner version" }
  if ($result.event.actorSurface -ne "control-panel") { throw "Partner Onboarding & Store Publication transition actor_surface was $($result.event.actorSurface)" }
  return $result
}

Invoke-PartnerTransition $partnerDraft.id "documents_uploaded" | Out-Null
$reviewBody = @{
  decision = "approved"
  reason = "Partner Onboarding & Store Publication smoke review approved"
} | ConvertTo-Json
$review = Invoke-RestMethod "http://localhost:58080/dsh/operator/partners/$($partnerDraft.id)/documents/$($doc.id)/review" -Method Patch -Headers $operatorHeaders -ContentType "application/json" -Body $reviewBody -TimeoutSec 10
if ($review.document.documentStatus -ne "approved") { throw "Partner Onboarding & Store Publication document review did not approve document" }

foreach ($toStatus in @("documents_verified", "ops_review", "ops_approved", "partner_active")) {
  Invoke-PartnerTransition $partnerDraft.id $toStatus | Out-Null
}

function Invoke-SmokeStoreGovernance([string] $StoreId, [string] $Action, [string] $Value) {
  $detail = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/$StoreId" -Headers $operatorHeaders -TimeoutSec 10

  if (-not $detail.store.version) {
    throw "Partner Onboarding & Store Publication could not read store version for $StoreId"
  }

  $headers = @{}
  foreach ($key in $operatorHeaders.Keys) {
    $headers[$key] = $operatorHeaders[$key]
  }

  $headers["X-Correlation-ID"] = "smoke-store-governance-$Action-$([guid]::NewGuid())"
  $headers["Idempotency-Key"] = "smoke-$StoreId-$Action-$([guid]::NewGuid())"

  $body = @{
    expectedVersion = [int]$detail.store.version
    action = $Action
    value = $Value
    reason = "Partner Onboarding & Store Publication runtime smoke: $Action => $Value"
  } | ConvertTo-Json

  $result = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/$StoreId/governance" -Method Post -Headers $headers -ContentType "application/json" -Body $body -TimeoutSec 10

  if (-not $result.store) {
    throw "Partner Onboarding & Store Publication governance failed for $Action => $Value"
  }

  return $result.store
}

Invoke-SmokeStoreGovernance $smokeStoreId "serviceability" "serviceable" | Out-Null
Invoke-SmokeStoreGovernance $smokeStoreId "partner-readiness" "ready" | Out-Null
Invoke-SmokeStoreGovernance $smokeStoreId "catalog-approval" "approved" | Out-Null

if ($MediaEnabled) {
  # Reuse approved local DAM assets but bind them to this newly created store as
  # its own primary logo/cover. The API performs atomic primary replacement and
  # updates the transitional store projection from canonical DAM truth.
  foreach ($storeImage in @(
    @{ assetId = "asset-local-store-test-grocery-logo"; role = "store_logo" },
    @{ assetId = "asset-local-store-test-grocery-cover"; role = "store_cover" }
  )) {
    $imageLinkBody = @{
      entityType = "store"
      entityId = $smokeStoreId
      role = $storeImage.role
      sortOrder = 0
      isPrimary = $true
    } | ConvertTo-Json
    $imageLink = Invoke-RestMethod "http://localhost:58080/dsh/operator/catalog/assets/$($storeImage.assetId)/link" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $imageLinkBody -TimeoutSec 10
    if (-not $imageLink.link.isPrimary -or $imageLink.link.status -ne "approved") {
      throw "Partner Onboarding & Store Publication primary $($storeImage.role) DAM link was not approved"
    }
  }
}

# Attach a real approved central-catalog product to the new store. The preceding
# catalog-approval action owns and approves the store/domain association in the
# same transaction, so this assortment can satisfy the sovereign public gate.
$expectedAssortmentPublicationStatus = if ($MediaEnabled) { "client_visible" } else { "approved" }
$assortmentBody = @{
  unitPrice = 25.00
  currency = "YER"
  available = $true
  stockStatus = "in_stock"
  publicationStatus = $expectedAssortmentPublicationStatus
} | ConvertTo-Json
$assortment = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/$smokeStoreId/assortment/$smokeCatalogProductId" -Method Put -Headers $operatorHeaders -ContentType "application/json" -Body $assortmentBody -TimeoutSec 10
if ($assortment.assortment.publicationStatus -ne $expectedAssortmentPublicationStatus -or -not $assortment.assortment.available) {
  throw "Partner Onboarding & Store Publication approved assortment was not persisted"
}

if ($MediaEnabled) {
  # Marketing owns the canonical publication cutover. Its gate evaluation treats
  # partner_active as the next client_visible candidate, then atomically commits
  # the store publication and the partner activation transition with audit.
  $publicationWorkspace = Invoke-RestMethod "http://localhost:58080/dsh/operator/marketing/stores/$smokeStoreId/publication" -Headers $operatorHeaders -TimeoutSec 10
  $publicationHeaders = @{}
  foreach ($key in $operatorHeaders.Keys) {
    $publicationHeaders[$key] = $operatorHeaders[$key]
  }
  $publicationHeaders["X-Correlation-ID"] = "smoke-store-publication-$([guid]::NewGuid())"
  $publicationHeaders["Idempotency-Key"] = "smoke-store-publication-$smokeStoreId-$([guid]::NewGuid())"
  $publicationBody = @{
    expectedVersion = [int]$publicationWorkspace.store.version
    decision = "publish"
    reason = "Partner Onboarding & Store Publication runtime smoke: marketing publication publish"
  } | ConvertTo-Json
  $published = Invoke-RestMethod "http://localhost:58080/dsh/operator/marketing/stores/$smokeStoreId/publication" -Method Post -Headers $publicationHeaders -ContentType "application/json" -Body $publicationBody -TimeoutSec 10
  if ($published.store.publicationDecision -ne "PUBLISHED") { throw "Partner Onboarding & Store Publication marketing publication did not return a published store" }
} else {
  Write-Host "  Partner Onboarding & Store Publication media-neutral mode: public publication cutover skipped because no governed media overlay is active."
}

$readiness = Invoke-RestMethod "http://localhost:58080/dsh/operator/partners/$($partnerDraft.id)/readiness" -Headers $operatorHeaders -TimeoutSec 10
if ($readiness.partnerId -ne $partnerDraft.id) { throw "Partner Onboarding & Store Publication readiness response did not match partner" }
$audit = Invoke-RestMethod "http://localhost:58080/dsh/operator/partners/$($partnerDraft.id)/audit" -Headers $operatorHeaders -TimeoutSec 10
if ($audit.events.Count -lt 7) { throw "Partner Onboarding & Store Publication audit did not include the full transition chain" }
if ($MediaEnabled) {
  if ($audit.events[$audit.events.Count - 1].toStatus -ne "client_visible") { throw "Partner Onboarding & Store Publication audit final status is not client_visible" }
} elseif ($audit.events[$audit.events.Count - 1].toStatus -ne "partner_active") {
  throw "Partner Onboarding & Store Publication media-neutral audit final status is not partner_active"
}
$linkedStore = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/$smokeStoreId" -Headers $operatorHeaders -TimeoutSec 10
if ($linkedStore.store.partnerReadiness -ne "ready") { throw "Partner Onboarding & Store Publication linked store partner_readiness is not ready" }
if ($MediaEnabled -and $linkedStore.store.publicationDecision -ne "PUBLISHED") { throw "Partner Onboarding & Store Publication operator readback is not published" }

if ($MediaEnabled) {
  $publicStore = Invoke-RestMethod "http://localhost:58080/dsh/stores/$smokeStoreId" -TimeoutSec 10
  if ($publicStore.store.id -ne $smokeStoreId -or $publicStore.store.publicationDecision -ne "PUBLISHED") {
    throw "Partner Onboarding & Store Publication app-client store readback is not published"
  }
  $publicCatalog = Invoke-RestMethod "http://localhost:58080/dsh/stores/$smokeStoreId/catalog" -TimeoutSec 10
  if (@($publicCatalog.products).Count -lt 1) { throw "Partner Onboarding & Store Publication app-client catalog is empty" }
}

$partnerSelfStatus = Invoke-RestMethod "http://localhost:58080/dsh/partner/activation/status?storeId=$([uri]::EscapeDataString($smokeStoreId))" -Headers $partnerHeaders -TimeoutSec 10
if ([string]::IsNullOrWhiteSpace($partnerSelfStatus.activationStatus)) { throw "Partner Onboarding & Store Publication partner self status missing activationStatus" }
$partnerSelfReadiness = Invoke-RestMethod "http://localhost:58080/dsh/partner/activation/readiness?storeId=$([uri]::EscapeDataString($smokeStoreId))" -Headers $partnerHeaders -TimeoutSec 10
if ([string]::IsNullOrWhiteSpace($partnerSelfReadiness.partnerId)) { throw "Partner Onboarding & Store Publication partner self readiness missing partnerId" }
Write-Host "  Partner Onboarding & Store Publication partner lifecycle smoke: PASS"
