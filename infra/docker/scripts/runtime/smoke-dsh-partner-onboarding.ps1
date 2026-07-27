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

$submitBody = @{ reason = "field submitted Partner Onboarding & Store Publication smoke partner" } | ConvertTo-Json
$submitted = Invoke-RestMethod "http://localhost:58080/dsh/field/partners/$($partnerDraft.id)/submit" -Method Post -Headers $fieldHeaders -ContentType "application/json" -Body $submitBody -TimeoutSec 10
if ($submitted.partner.activationStatus -ne "submitted") { throw "Partner Onboarding & Store Publication submit did not reach submitted" }

$partnerStores = Invoke-RestMethod "http://localhost:58080/dsh/operator/partners/$($partnerDraft.id)/stores" -Headers $operatorHeaders -TimeoutSec 10
if ($partnerStores.total -lt 1) { throw "Partner Onboarding & Store Publication partner has no auto-created store" }

$smokeStoreId = @($partnerStores.stores)[0].id
if ([string]::IsNullOrWhiteSpace($smokeStoreId)) { throw "Partner Onboarding & Store Publication auto-created store id is empty" }

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

$transitionHeaders = @{
  Authorization = "Bearer $operatorToken"
  "X-Correlation-ID" = "smoke-partner-transition-$([guid]::NewGuid())"
}
function Invoke-PartnerTransition([string] $PartnerId, [string] $ToStatus) {
  $body = @{
    toStatus = $ToStatus
    reason = "Partner Onboarding & Store Publication runtime smoke transition to $ToStatus"
  } | ConvertTo-Json
  $result = Invoke-RestMethod "http://localhost:58080/dsh/operator/partners/$PartnerId/transition" -Method Post -Headers $transitionHeaders -ContentType "application/json" -Body $body -TimeoutSec 10
  if ($result.partner.activationStatus -ne $ToStatus) { throw "Partner Onboarding & Store Publication transition to $ToStatus failed" }
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
  $headers["Idempotency-Key"]  = "smoke-$StoreId-$Action-$([guid]::NewGuid())"

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
