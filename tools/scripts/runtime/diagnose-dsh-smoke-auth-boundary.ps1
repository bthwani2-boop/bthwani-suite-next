param(
  [string]$IdentityBaseUrl = "http://localhost:58082",
  [string]$DshBaseUrl = "http://localhost:58080",
  [string]$StoreId = "store-test-grocery"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$password = if ([string]::IsNullOrWhiteSpace([string]$env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD)) {
  "123456"
} else {
  [string]$env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD
}

function Invoke-CheckedJsonRequest {
  param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][string]$Method,
    [Parameter(Mandatory)][string]$Uri,
    [hashtable]$Headers = @{},
    [string]$Body = "",
    [int[]]$ExpectedStatusCodes = @(200, 201, 204)
  )

  Write-Host "  request=$Name method=$Method uri=$Uri"
  $parameters = @{
    Method = $Method
    Uri = $Uri
    Headers = $Headers
    TimeoutSec = 20
    SkipHttpErrorCheck = $true
  }
  if (-not [string]::IsNullOrWhiteSpace($Body)) {
    $parameters.ContentType = "application/json"
    $parameters.Body = $Body
  }

  $response = Invoke-WebRequest @parameters
  $responseBody = [string]$response.Content
  $statusCode = [int]$response.StatusCode
  Write-Host "  response=$Name status=$statusCode"

  if ($ExpectedStatusCodes -notcontains $statusCode) {
    Write-Host "  response-body=$responseBody"
    throw "$Name failed with HTTP ${statusCode}: $responseBody"
  }

  if ([string]::IsNullOrWhiteSpace($responseBody)) {
    return $null
  }
  return $responseBody | ConvertFrom-Json -Depth 100
}

function Get-ActorToken {
  param([Parameter(Mandatory)][string]$Username)

  $loginBody = @{
    username = $Username
    password = $password
    deviceFingerprint = "dsh-runtime-smoke"
  } | ConvertTo-Json

  $login = Invoke-CheckedJsonRequest `
    -Name "identity-$Username-login-fixed-fingerprint" `
    -Method "POST" `
    -Uri "$IdentityBaseUrl/auth/login" `
    -Body $loginBody

  $actorToken = [string]$login.accessToken
  if ([string]::IsNullOrWhiteSpace($actorToken)) {
    throw "identity-$Username-login-fixed-fingerprint returned no access token"
  }
  return $actorToken
}

function New-MutationHeaders {
  param(
    [Parameter(Mandatory)][string]$Token,
    [Parameter(Mandatory)][string]$Operation
  )
  $suffix = [Guid]::NewGuid().ToString('N')
  return @{
    Authorization = "Bearer $Token"
    "Idempotency-Key" = "$Operation-$suffix"
    "X-Correlation-ID" = "$Operation-$suffix"
  }
}

Write-Host "=== DSH smoke request-boundary diagnosis ==="

$operatorToken = Get-ActorToken -Username "operator"
$operatorHeaders = @{ Authorization = "Bearer $operatorToken" }
$list = Invoke-CheckedJsonRequest `
  -Name "dsh-operator-store-list" `
  -Method "GET" `
  -Uri "$DshBaseUrl/dsh/operator/stores" `
  -Headers $operatorHeaders
if (@($list.stores).Count -lt 1) {
  throw "dsh-operator-store-list returned no stores"
}

$detail = Invoke-CheckedJsonRequest `
  -Name "dsh-operator-store-detail" `
  -Method "GET" `
  -Uri "$DshBaseUrl/dsh/operator/stores/$([Uri]::EscapeDataString($StoreId))" `
  -Headers $operatorHeaders

$governanceBody = @{
  expectedVersion = [int]$detail.store.version
  action = "visibility"
  value = if ([bool]$detail.store.isVisible) { "visible" } else { "hidden" }
  reason = "runtime smoke request-boundary diagnosis"
} | ConvertTo-Json
$governance = Invoke-CheckedJsonRequest `
  -Name "dsh-operator-store-governance" `
  -Method "POST" `
  -Uri "$DshBaseUrl/dsh/operator/stores/$([Uri]::EscapeDataString($StoreId))/governance" `
  -Headers (New-MutationHeaders -Token $operatorToken -Operation "diagnose-governance") `
  -Body $governanceBody
if ([string]$governance.audit.actorRole -ne "operator") {
  throw "dsh-operator-store-governance returned no operator audit"
}

$hideBody = @{
  expectedVersion = [int]$governance.store.version
  action = "marketing-visibility"
  value = "hidden"
  reason = "runtime publication gate diagnosis"
} | ConvertTo-Json
$hidden = Invoke-CheckedJsonRequest `
  -Name "dsh-store-marketing-hide" `
  -Method "POST" `
  -Uri "$DshBaseUrl/dsh/operator/stores/$([Uri]::EscapeDataString($StoreId))/governance" `
  -Headers (New-MutationHeaders -Token $operatorToken -Operation "diagnose-hide") `
  -Body $hideBody

Invoke-CheckedJsonRequest `
  -Name "dsh-public-store-hidden-readback" `
  -Method "GET" `
  -Uri "$DshBaseUrl/dsh/stores/$([Uri]::EscapeDataString($StoreId))" `
  -ExpectedStatusCodes @(404) | Out-Null

$showBody = @{
  expectedVersion = [int]$hidden.store.version
  action = "marketing-visibility"
  value = "visible"
  reason = "restore runtime publication gate after diagnosis"
} | ConvertTo-Json
$visible = Invoke-CheckedJsonRequest `
  -Name "dsh-store-marketing-show" `
  -Method "POST" `
  -Uri "$DshBaseUrl/dsh/operator/stores/$([Uri]::EscapeDataString($StoreId))/governance" `
  -Headers (New-MutationHeaders -Token $operatorToken -Operation "diagnose-show") `
  -Body $showBody

$publicStore = Invoke-CheckedJsonRequest `
  -Name "dsh-public-store-restored-readback" `
  -Method "GET" `
  -Uri "$DshBaseUrl/dsh/stores/$([Uri]::EscapeDataString($StoreId))"
if (-not [bool]$publicStore.store.publicationEligible) {
  throw "dsh-public-store-restored-readback is not publication eligible"
}

$partnerToken = Get-ActorToken -Username "bthwani"
$diagnosticSuffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$proposalBody = @{
  proposedNameAr = "منتج تشخيص $diagnosticSuffix"
  proposedNameEn = "Runtime Diagnostic Product $diagnosticSuffix"
  domainId = "domain-groceries"
  categoryNodeId = "node-supermarket"
  brand = "بثواني"
  sourceSurface = "app-partner"
} | ConvertTo-Json
$proposal = Invoke-CheckedJsonRequest `
  -Name "dsh-partner-catalog-proposal-create" `
  -Method "POST" `
  -Uri "$DshBaseUrl/dsh/partner/catalog/product-proposals" `
  -Headers (New-MutationHeaders -Token $partnerToken -Operation "diagnose-proposal") `
  -Body $proposalBody
if ([string]::IsNullOrWhiteSpace([string]$proposal.proposal.id)) {
  throw "dsh-partner-catalog-proposal-create returned no proposal id"
}
if ([int]$proposal.proposal.version -lt 1) {
  throw "dsh-partner-catalog-proposal-create returned invalid proposal version: $($proposal.proposal.version)"
}

$proposalId = [Uri]::EscapeDataString([string]$proposal.proposal.id)
foreach ($transition in @(
  @{ Name = "partner-review"; Note = "diagnose partner review" },
  @{ Name = "marketing-review"; Note = "diagnose marketing review" },
  @{ Name = "catalog-adopted"; Note = "diagnose catalog adoption" }
)) {
  $transitionBody = @{
    nextStatus = $transition.Name
    note = $transition.Note
    expectedVersion = [int]$proposal.proposal.version
  } | ConvertTo-Json
  $proposal = Invoke-CheckedJsonRequest `
    -Name "dsh-catalog-transition-$($transition.Name)" `
    -Method "POST" `
    -Uri "$DshBaseUrl/dsh/operator/catalog/product-proposals/$proposalId/transition" `
    -Headers (New-MutationHeaders -Token $operatorToken -Operation "diagnose-transition-$($transition.Name)") `
    -Body $transitionBody
}

Write-Host "DSH smoke request-boundary diagnosis: PASS through catalog adoption"
