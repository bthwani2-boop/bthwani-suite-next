[CmdletBinding()]
param(
  [string]$DshBaseUrl = "http://127.0.0.1:18080",
  [string]$IdentityBaseUrl = "http://127.0.0.1:18082",
  [string]$IdentityPassword = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
. (Join-Path $RepoRoot "tools/dev/local-actors.ps1")
. (Join-Path $RepoRoot "tools/dev/local-workforce-actors.ps1")
if ([string]::IsNullOrWhiteSpace($IdentityPassword)) {
  $IdentityPassword = Get-LocalPassword
}

function Get-Value([object]$Object, [string]$Name) {
  if ($null -eq $Object) { return $null }
  $Property = $Object.PSObject.Properties[$Name]
  if ($null -eq $Property) { return $null }
  return $Property.Value
}

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Uri,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )

  $Request = @{
    Method = $Method
    Uri = $Uri
    Headers = $Headers
    TimeoutSec = 30
    SkipHttpErrorCheck = $true
  }
  if ($null -ne $Body) {
    $Request.ContentType = "application/json"
    $Request.Body = $Body | ConvertTo-Json -Depth 10
  }
  $Response = Invoke-WebRequest @Request
  $Json = $null
  if (-not [string]::IsNullOrWhiteSpace($Response.Content)) {
    $Json = $Response.Content | ConvertFrom-Json
  }
  return [pscustomobject]@{
    Status = [int]$Response.StatusCode
    Json = $Json
    Content = $Response.Content
  }
}

$OperatorUsername = Get-LocalUsername "operator"
$Login = Invoke-JsonRequest POST "$IdentityBaseUrl/auth/login" @{} @{
  username = $OperatorUsername
  password = $IdentityPassword
  deviceFingerprint = "runtime-dispatch-fixture-$([guid]::NewGuid().ToString('N'))"
}
if ($Login.Status -ne 200) {
  throw "operator login for dispatch fixture failed with HTTP $($Login.Status): $($Login.Content)"
}
$OperatorToken = "$(Get-Value $Login.Json 'accessToken')"
if ([string]::IsNullOrWhiteSpace($OperatorToken)) {
  throw "operator login for dispatch fixture returned no access token"
}

$CaptainProvider = Get-ProvisionedWorkforceActor -Kind "captain"
$CaptainId = ([string]$CaptainProvider.actorId).Trim()
if ([string]::IsNullOrWhiteSpace($CaptainId)) {
  throw "provisioned runtime captain has no actor id"
}

$CorrelationId = "runtime-dispatch-fixture-$([guid]::NewGuid().ToString('N'))"
$Profile = Invoke-JsonRequest PUT "$DshBaseUrl/dsh/operator/dispatch/captains/$CaptainId/profile" @{
  Authorization = "Bearer $OperatorToken"
  "X-Correlation-ID" = $CorrelationId
  "Idempotency-Key" = $CorrelationId
} @{
  accreditationStatus = "approved"
  availabilityStatus = "available"
  maxActiveAssignments = 1
  priorityScore = 100
}
if ($Profile.Status -ne 200) {
  throw "DSH captain dispatch profile setup failed with HTTP $($Profile.Status): $($Profile.Content)"
}

$Candidate = Get-Value $Profile.Json 'candidate'
if ($null -eq $Candidate) {
  throw "DSH captain dispatch profile setup returned no candidate"
}
$ReturnedCaptainId = "$(Get-Value $Candidate 'captainId')"
$AccreditationStatus = "$(Get-Value $Candidate 'accreditationStatus')"
$AvailabilityStatus = "$(Get-Value $Candidate 'availabilityStatus')"
$MaxActiveAssignments = [int](Get-Value $Candidate 'maxActiveAssignments')
if ($ReturnedCaptainId -ne $CaptainId -or
    $AccreditationStatus -ne "approved" -or
    $AvailabilityStatus -ne "available" -or
    $MaxActiveAssignments -ne 1) {
  throw "DSH captain dispatch profile setup returned invalid operational readiness: $($Profile.Content)"
}

# Financial eligibility is intentionally not seeded here. The assignment API
# must refresh the short-lived WLT decision itself, preserving the real DSH/WLT
# integration boundary and fail-closed financial gate.
Write-Host "DSH runtime captain dispatch profile: PASS captain=$CaptainId accreditation=$AccreditationStatus availability=$AvailabilityStatus capacity=$MaxActiveAssignments"
