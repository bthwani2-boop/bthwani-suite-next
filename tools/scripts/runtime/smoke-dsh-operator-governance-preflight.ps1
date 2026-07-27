param(
  [string]$IdentityBaseUrl = "http://localhost:58082",
  [string]$DshBaseUrl = "http://localhost:58080",
  [string]$StoreId = "store-test-grocery"
)

Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "../../dev/local-actors.ps1")
$ErrorActionPreference = "Stop"

$password = Get-LocalPassword

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

$loginBody = @{
  username = (Get-LocalUsername "operator")
  password = $password
  deviceFingerprint = "dsh-governance-preflight-$([Guid]::NewGuid().ToString('N'))"
} | ConvertTo-Json

$login = Invoke-CheckedJsonRequest `
  -Name "identity-operator-login" `
  -Method "POST" `
  -Uri "$IdentityBaseUrl/auth/login" `
  -Body $loginBody

$token = [string]$login.accessToken
if ([string]::IsNullOrWhiteSpace($token)) {
  throw "identity-operator-login returned no access token"
}

$readHeaders = @{ Authorization = "Bearer $token" }
$list = Invoke-CheckedJsonRequest `
  -Name "dsh-operator-store-list" `
  -Method "GET" `
  -Uri "$DshBaseUrl/dsh/operator/stores" `
  -Headers $readHeaders
if (@($list.stores).Count -lt 1) {
  throw "dsh-operator-store-list returned no stores"
}

$detail = Invoke-CheckedJsonRequest `
  -Name "dsh-operator-store-detail" `
  -Method "GET" `
  -Uri "$DshBaseUrl/dsh/operator/stores/$([Uri]::EscapeDataString($StoreId))" `
  -Headers $readHeaders
if ([string]$detail.store.id -ne $StoreId) {
  throw "dsh-operator-store-detail returned the wrong store"
}

$governanceHeaders = @{
  Authorization = "Bearer $token"
  "Idempotency-Key" = "dsh-governance-preflight-$([Guid]::NewGuid().ToString('N'))"
  "X-Correlation-ID" = "dsh-governance-preflight-$([Guid]::NewGuid().ToString('N'))"
}
$governanceBody = @{
  expectedVersion = [int]$detail.store.version
  action = "visibility"
  value = if ([bool]$detail.store.isVisible) { "visible" } else { "hidden" }
  reason = "runtime operator governance boundary preflight"
} | ConvertTo-Json

$governance = Invoke-CheckedJsonRequest `
  -Name "dsh-operator-store-governance" `
  -Method "POST" `
  -Uri "$DshBaseUrl/dsh/operator/stores/$([Uri]::EscapeDataString($StoreId))/governance" `
  -Headers $governanceHeaders `
  -Body $governanceBody

if ([string]$governance.audit.actorRole -ne "operator") {
  throw "dsh-operator-store-governance returned no operator audit"
}

Write-Host "DSH operator governance preflight: PASS"
