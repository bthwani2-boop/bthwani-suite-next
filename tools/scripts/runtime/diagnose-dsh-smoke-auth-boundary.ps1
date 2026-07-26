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
    [string]$Body = ""
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
  Write-Host "  response=$Name status=$([int]$response.StatusCode)"

  if ([int]$response.StatusCode -lt 200 -or [int]$response.StatusCode -ge 300) {
    Write-Host "  response-body=$responseBody"
    throw "$Name failed with HTTP $([int]$response.StatusCode): $responseBody"
  }

  if ([string]::IsNullOrWhiteSpace($responseBody)) {
    return $null
  }
  return $responseBody | ConvertFrom-Json -Depth 100
}

Write-Host "=== DSH smoke auth-boundary diagnosis ==="

$loginBody = @{
  username = "operator"
  password = $password
  deviceFingerprint = "dsh-runtime-smoke"
} | ConvertTo-Json

$login = Invoke-CheckedJsonRequest `
  -Name "identity-operator-login-fixed-fingerprint" `
  -Method "POST" `
  -Uri "$IdentityBaseUrl/auth/login" `
  -Body $loginBody

$token = [string]$login.accessToken
if ([string]::IsNullOrWhiteSpace($token)) {
  throw "identity-operator-login-fixed-fingerprint returned no access token"
}

$headers = @{ Authorization = "Bearer $token" }
$list = Invoke-CheckedJsonRequest `
  -Name "dsh-operator-store-list" `
  -Method "GET" `
  -Uri "$DshBaseUrl/dsh/operator/stores" `
  -Headers $headers
if (@($list.stores).Count -lt 1) {
  throw "dsh-operator-store-list returned no stores"
}

$detail = Invoke-CheckedJsonRequest `
  -Name "dsh-operator-store-detail" `
  -Method "GET" `
  -Uri "$DshBaseUrl/dsh/operator/stores/$([Uri]::EscapeDataString($StoreId))" `
  -Headers $headers

$mutationHeaders = @{
  Authorization = "Bearer $token"
  "Idempotency-Key" = "dsh-smoke-diagnosis-$([Guid]::NewGuid().ToString('N'))"
  "X-Correlation-ID" = "dsh-smoke-diagnosis-$([Guid]::NewGuid().ToString('N'))"
}
$governanceBody = @{
  expectedVersion = [int]$detail.store.version
  action = "visibility"
  value = if ([bool]$detail.store.isVisible) { "visible" } else { "hidden" }
  reason = "runtime smoke auth-boundary diagnosis"
} | ConvertTo-Json

$governance = Invoke-CheckedJsonRequest `
  -Name "dsh-operator-store-governance" `
  -Method "POST" `
  -Uri "$DshBaseUrl/dsh/operator/stores/$([Uri]::EscapeDataString($StoreId))/governance" `
  -Headers $mutationHeaders `
  -Body $governanceBody

if ([string]$governance.audit.actorRole -ne "operator") {
  throw "dsh-operator-store-governance returned no operator audit"
}

Write-Host "DSH smoke auth-boundary diagnosis: PASS"
