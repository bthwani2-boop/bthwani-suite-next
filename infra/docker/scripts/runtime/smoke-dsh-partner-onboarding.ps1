Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "../../../../tools/dev/local-actors.ps1")
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
$partnerHeaders = @{
  Authorization = "Bearer $partnerToken"
  "X-Correlation-ID" = "smoke-partner-$([guid]::NewGuid())"
}

# Partner Onboarding & Store Publication: partner lifecycle from field draft to client-visible store readiness.
$fieldToken = Get-LocalActorToken (Get-LocalUsername "field")
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
  ownerName = "مالك فحص الشركاء"
  primaryPhone = "+96777$($partnerSuffix.ToString().Substring($partnerSuffix.ToString().Length - 7))"
  category = "grocery"
  notes = "Partner Onboarding & Store Publication runtime smoke"
} | ConvertTo-Json
$partnerDraft = Invoke-RestMethod "http://localhost:58080/dsh/field/partners/drafts" -Method Post -Headers $fieldHeaders -ContentType "application/json" -Body $partnerDraftBody -TimeoutSec 10
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

# Submission readiness also requires an active WLT-owned payout destination.
# DSH receives only the durable WLT reference and masked display fields.
$payoutHeaders = @{}
foreach ($key in $fieldHeaders.Keys) {
  $payoutHeaders[$key] = $fieldHeaders[$key]
}
$payoutHeaders["X-Correlation-ID"] = "smoke-partner-payout-$([guid]::NewGuid())"
$payoutHeaders["Idempotency-Key"] = "smoke-partner-payout-$($partnerDraft.id)-$([guid]::NewGuid())"
$payoutHeaders["If-Match-Version"] = [string]$partnerDraft.version
$payoutBody = @{
  displayName = "شريك فحص $partnerSuffix"
  ownerName = "مالك فحص الشركاء"
  primaryPhone = "+96777$($partnerSuffix.ToString().Substring($partnerSuffix.ToString().Length - 7))"
  beneficiaryName = "مالك فحص الشركاء"
  bankName = "بنك فحص بثواني"
  bankBranch = "صنعاء"
  accountNumber = "700$partnerSuffix"
  settlementPreference = "bank_transfer"
  bankAccountHolderMatchesOwner = $true
  bankNotes = "Partner Onboarding & Store Publication runtime smoke payout destination"
} | ConvertTo-Json
$payoutPartner = Invoke-RestMethod "http://localhost:58080/dsh/field/partners/$($partnerDraft.id)" -Method Patch -Headers $payoutHeaders -ContentType "application/json" -Body $payoutBody -TimeoutSec 10
if ([string]::IsNullOrWhiteSpace($payoutPartner.payoutDestinationId)) { throw "Partner Onboarding & Store Publication WLT payout destination was not bound" }
if ($payoutPartner.version -le $partnerDraft.version) { throw "Partner Onboarding & Store Publication payout binding did not advance partner version" }

$visitBody = @{
  storeId = $smokeStoreId
  visitNotes = "field visit for Partner Onboarding & Store Publication smoke"
  locationLatitude = 15.3229
  locationLongitude = 44.2075
  evidenceMediaRefs = @("media_visit_smoke_front.jpg")
} | ConvertTo-Json

$visit = Invoke-RestMethod "http://localhost:58080/dsh/field/partners/$($partnerDraft.id)/visits" -Method Post -Headers $fieldHeaders -ContentType "application/json" -Body $visitBody -TimeoutSec 10
if ($visit.visitStatus -ne "submitted") { throw "Partner Onboarding & Store Publication field visit was not submitted" }

$docBody = @{
  documentType = "commercial_register"
  mediaRef = "media_smoke_commercial_register.jpg"
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

Invoke-SmokeStoreGovernance $smokeStoreId "lifecycle" "active" | Out-Null
Invoke-SmokeStoreGovernance $smokeStoreId "visibility" "visible" | Out-Null
Invoke-SmokeStoreGovernance $smokeStoreId "serviceability" "serviceable" | Out-Null
Invoke-SmokeStoreGovernance $smokeStoreId "partner-readiness" "ready" | Out-Null
Invoke-SmokeStoreGovernance $smokeStoreId "catalog-approval" "approved" | Out-Null
Invoke-SmokeStoreGovernance $smokeStoreId "marketing-visibility" "visible" | Out-Null

Invoke-PartnerTransition $partnerDraft.id "client_visible" | Out-Null
$readiness = Invoke-RestMethod "http://localhost:58080/dsh/operator/partners/$($partnerDraft.id)/readiness" -Headers $operatorHeaders -TimeoutSec 10
if ($readiness.partnerId -ne $partnerDraft.id) { throw "Partner Onboarding & Store Publication readiness response did not match partner" }
$audit = Invoke-RestMethod "http://localhost:58080/dsh/operator/partners/$($partnerDraft.id)/audit" -Headers $operatorHeaders -TimeoutSec 10
if ($audit.events.Count -lt 7) { throw "Partner Onboarding & Store Publication audit did not include the full transition chain" }
if ($audit.events[$audit.events.Count - 1].toStatus -ne "client_visible") { throw "Partner Onboarding & Store Publication audit final status is not client_visible" }
$linkedStore = Invoke-RestMethod "http://localhost:58080/dsh/operator/stores/$smokeStoreId" -Headers $operatorHeaders -TimeoutSec 10
if ($linkedStore.store.partnerReadiness -ne "ready") { throw "Partner Onboarding & Store Publication linked store partner_readiness is not ready" }

$partnerSelfStatus = Invoke-RestMethod "http://localhost:58080/dsh/partner/activation/status" -Headers $partnerHeaders -TimeoutSec 10
if ([string]::IsNullOrWhiteSpace($partnerSelfStatus.activationStatus)) { throw "Partner Onboarding & Store Publication partner self status missing activationStatus" }
$partnerSelfReadiness = Invoke-RestMethod "http://localhost:58080/dsh/partner/activation/readiness" -Headers $partnerHeaders -TimeoutSec 10
if ([string]::IsNullOrWhiteSpace($partnerSelfReadiness.partnerId)) { throw "Partner Onboarding & Store Publication partner self readiness missing partnerId" }
Write-Host "  Partner Onboarding & Store Publication partner lifecycle smoke: PASS"
