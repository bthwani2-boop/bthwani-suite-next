param(
  [string]$BaseUrl = "http://127.0.0.1:58083",
  [string]$WiremockUrl = "http://127.0.0.1:58090"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$TenantId = "tenant-runtime-matrix"
$CorrelationId = "wlt-runtime-matrix-$Timestamp"
$ServiceToken = "dev-only-dsh-wlt-shared-secret"

function Invoke-WltResponse {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [object]$Body = $null,
    [string]$IdempotencyKey = "",
    [string]$Token = $ServiceToken,
    [switch]$OmitIdempotency
  )

  $Headers = @{
    Authorization = "Bearer $Token"
    "X-Service-Caller" = "dsh"
    "X-Tenant-ID" = $TenantId
    "X-Correlation-ID" = $CorrelationId
  }
  if (-not $OmitIdempotency) {
    if ([string]::IsNullOrWhiteSpace($IdempotencyKey)) {
      $IdempotencyKey = "wlt-matrix-$Timestamp-$([guid]::NewGuid())"
    }
    $Headers["Idempotency-Key"] = $IdempotencyKey
  }

  $Parameters = @{
    Method = $Method
    Uri = "$BaseUrl$Path"
    Headers = $Headers
    TimeoutSec = 20
    SkipHttpErrorCheck = $true
  }
  if ($null -ne $Body) {
    $Parameters.ContentType = "application/json"
    $Parameters.Body = $Body | ConvertTo-Json -Depth 12
  }

  $Response = Invoke-WebRequest @Parameters
  $Json = $null
  if (-not [string]::IsNullOrWhiteSpace($Response.Content)) {
    try { $Json = $Response.Content | ConvertFrom-Json } catch { }
  }
  return [pscustomobject]@{
    Status = [int]$Response.StatusCode
    Json = $Json
    Content = $Response.Content
  }
}

function Assert-Status {
  param(
    [Parameter(Mandatory = $true)]$Response,
    [Parameter(Mandatory = $true)][int[]]$Expected,
    [Parameter(Mandatory = $true)][string]$Name
  )
  if ($Expected -notcontains $Response.Status) {
    throw "$Name expected HTTP $($Expected -join '/') but received $($Response.Status): $($Response.Content)"
  }
}

function New-SessionBody {
  param(
    [Parameter(Mandatory = $true)][string]$CheckoutIntentId,
    [Parameter(Mandatory = $true)][string]$ClientId,
    [int64]$AmountMinorUnits = 2500
  )
  return @{
    checkoutIntentId = $CheckoutIntentId
    tenantId = $TenantId
    clientId = $ClientId
    storeId = "store-test-grocery"
    paymentMethod = "official_wallet"
    amountMinorUnits = $AmountMinorUnits
    currency = "YER"
    cartSnapshotHash = "wlt-runtime-matrix-$CheckoutIntentId"
  }
}

$Health = Invoke-WltResponse -Method GET -Path "/wlt/health"
Assert-Status -Response $Health -Expected @(200) -Name "WLT health"
if ($Health.Json.status -ne "healthy") { throw "WLT health payload is not healthy" }

$CheckoutIntentId = "checkout-runtime-matrix-$Timestamp"
$ClientId = "client-runtime-matrix-$Timestamp"
$CreateKey = "wlt-runtime-matrix-create-$Timestamp"
$Body = New-SessionBody -CheckoutIntentId $CheckoutIntentId -ClientId $ClientId

$CreateFirst = Invoke-WltResponse -Method POST -Path "/wlt/payment-sessions" -Body $Body -IdempotencyKey $CreateKey
Assert-Status -Response $CreateFirst -Expected @(201) -Name "first payment-session create"
$SessionId = "$($CreateFirst.Json.paymentSession.id)"
if ([string]::IsNullOrWhiteSpace($SessionId)) { throw "first create returned no paymentSession.id" }

$CreateReplay = Invoke-WltResponse -Method POST -Path "/wlt/payment-sessions" -Body $Body -IdempotencyKey $CreateKey
Assert-Status -Response $CreateReplay -Expected @(201) -Name "payment-session replay"
if ("$($CreateReplay.Json.paymentSession.id)" -ne $SessionId) {
  throw "payment-session replay created a different session"
}

$ChangedBody = New-SessionBody -CheckoutIntentId $CheckoutIntentId -ClientId $ClientId -AmountMinorUnits 2600
$Conflict = Invoke-WltResponse -Method POST -Path "/wlt/payment-sessions" -Body $ChangedBody -IdempotencyKey "wlt-runtime-matrix-conflict-$Timestamp"
Assert-Status -Response $Conflict -Expected @(409) -Name "changed-payload source replay"
if ($Conflict.Json.code -ne "IDEMPOTENCY_CONFLICT") { throw "changed-payload replay did not return IDEMPOTENCY_CONFLICT" }

$MissingIdempotency = Invoke-WltResponse -Method POST -Path "/wlt/payment-sessions" `
  -Body (New-SessionBody -CheckoutIntentId "checkout-missing-idempotency-$Timestamp" -ClientId $ClientId) `
  -OmitIdempotency
Assert-Status -Response $MissingIdempotency -Expected @(400) -Name "missing idempotency key"

$WrongAuth = Invoke-WltResponse -Method POST -Path "/wlt/payment-sessions" `
  -Body (New-SessionBody -CheckoutIntentId "checkout-wrong-auth-$Timestamp" -ClientId $ClientId) `
  -IdempotencyKey "wlt-runtime-matrix-wrong-auth-$Timestamp" -Token "wrong-token"
Assert-Status -Response $WrongAuth -Expected @(401, 403) -Name "wrong service token"

$PrematureCapture = Invoke-WltResponse -Method POST -Path "/wlt/payment-sessions/$SessionId/capture" `
  -IdempotencyKey "wlt-runtime-matrix-capture-before-authorize-$Timestamp"
Assert-Status -Response $PrematureCapture -Expected @(400) -Name "capture before authorize"

$AuthorizeKey = "wlt-runtime-matrix-authorize-$Timestamp"
$Authorized = Invoke-WltResponse -Method POST -Path "/wlt/payment-sessions/$SessionId/authorize" -IdempotencyKey $AuthorizeKey
Assert-Status -Response $Authorized -Expected @(200) -Name "authorize"
if ($Authorized.Json.paymentSession.status -ne "authorized") { throw "authorize did not reach authorized" }

$AuthorizeReplay = Invoke-WltResponse -Method POST -Path "/wlt/payment-sessions/$SessionId/authorize" -IdempotencyKey $AuthorizeKey
Assert-Status -Response $AuthorizeReplay -Expected @(409) -Name "authorize replay fail-closed"

$AfterAuthorize = Invoke-WltResponse -Method GET -Path "/wlt/payment-sessions/$SessionId"
Assert-Status -Response $AfterAuthorize -Expected @(200) -Name "authorized readback"
if ($AfterAuthorize.Json.paymentSession.status -ne "authorized") { throw "authorize replay changed the persisted state" }

$CaptureKey = "wlt-runtime-matrix-capture-$Timestamp"
$Captured = Invoke-WltResponse -Method POST -Path "/wlt/payment-sessions/$SessionId/capture" -IdempotencyKey $CaptureKey
Assert-Status -Response $Captured -Expected @(200) -Name "capture"
if ($Captured.Json.paymentSession.status -ne "captured") { throw "capture did not reach captured" }

$CaptureReplay = Invoke-WltResponse -Method POST -Path "/wlt/payment-sessions/$SessionId/capture" -IdempotencyKey $CaptureKey
Assert-Status -Response $CaptureReplay -Expected @(400) -Name "capture replay fail-closed"

$ExpireCaptured = Invoke-WltResponse -Method POST -Path "/wlt/payment-sessions/$SessionId/expire" `
  -IdempotencyKey "wlt-runtime-matrix-expire-captured-$Timestamp"
Assert-Status -Response $ExpireCaptured -Expected @(409) -Name "expire captured session"

$FinalReadback = Invoke-WltResponse -Method GET -Path "/wlt/payment-sessions/$SessionId"
Assert-Status -Response $FinalReadback -Expected @(200) -Name "captured readback"
if ($FinalReadback.Json.paymentSession.status -ne "captured") { throw "failure matrix corrupted captured state" }
if ($FinalReadback.Json.paymentSession.amountMinorUnits -ne 2500) { throw "failure matrix changed the sovereign amount" }

$Journal = Invoke-RestMethod -Method GET -Uri "$WiremockUrl/__admin/requests" -TimeoutSec 20
$AuthorizeCalls = 0
$CaptureCalls = 0
foreach ($Record in @($Journal.requests)) {
  $Request = $Record.request
  $Headers = $Request.headers
  $CorrelationHeader = if ($Headers.'X-Correlation-ID') { $Headers.'X-Correlation-ID' } else { $Headers.'x-correlation-id' }
  if ($null -eq $CorrelationHeader -or "$CorrelationHeader" -notlike "*$CorrelationId*") { continue }
  if ($Request.url -eq "/financial/card/authorize" -and $Request.method -eq "POST") { $AuthorizeCalls++ }
  if ($Request.url -eq "/financial/card/capture" -and $Request.method -eq "POST") { $CaptureCalls++ }
}
if ($AuthorizeCalls -ne 1) { throw "authorize duplicate protection failed; provider calls=$AuthorizeCalls" }
if ($CaptureCalls -ne 1) { throw "capture duplicate protection failed; provider calls=$CaptureCalls" }

[pscustomobject]@{
  state = "PASS"
  paymentSessionId = $SessionId
  createReplayReturnedSameId = $true
  changedPayloadRejected = $true
  missingIdempotencyRejected = $true
  wrongServiceTokenRejected = $true
  captureBeforeAuthorizeRejected = $true
  authorizeReplayFailedClosed = $true
  captureReplayFailedClosed = $true
  capturedSessionCouldNotExpire = $true
  authorizeProviderCalls = $AuthorizeCalls
  captureProviderCalls = $CaptureCalls
} | ConvertTo-Json -Depth 6

Write-Host "WLT duplicate, replay, authorization, ordering, and provider-call matrix: PASS"
