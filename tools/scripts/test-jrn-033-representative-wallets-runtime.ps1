[CmdletBinding()]
param(
  [string]$DshBaseUrl = "http://127.0.0.1:58080",
  [string]$IdentityBaseUrl = "http://127.0.0.1:58082",
  [string]$WltBaseUrl = "http://127.0.0.1:58083",
  [string]$IdentityPassword = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ([string]::IsNullOrWhiteSpace($IdentityPassword)) {
  $IdentityPassword = if ([string]::IsNullOrWhiteSpace($env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD)) { "123456" } else { $env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD }
}

$RunId = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

function Invoke-Api {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )
  $request = @{
    Method = $Method
    Uri = $Url
    Headers = $Headers
    TimeoutSec = 30
    SkipHttpErrorCheck = $true
  }
  if ($null -ne $Body) {
    $request.ContentType = "application/json"
    $request.Body = $Body | ConvertTo-Json -Depth 12
  }
  $response = Invoke-WebRequest @request
  $json = $null
  if (-not [string]::IsNullOrWhiteSpace($response.Content)) {
    try { $json = $response.Content | ConvertFrom-Json } catch { }
  }
  return [pscustomobject]@{
    Status = [int]$response.StatusCode
    Headers = $response.Headers
    Json = $json
    Content = $response.Content
  }
}

function Require([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

function Require-Status([object]$Response, [int[]]$Expected, [string]$Name) {
  if ($Expected -notcontains $Response.Status) {
    throw "$Name expected HTTP $($Expected -join '/') but received $($Response.Status): $($Response.Content)"
  }
}

function Get-Property([object]$Object, [string]$Name) {
  if ($null -eq $Object) { return $null }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) { return $null }
  return $property.Value
}

function Login-Actor([string]$Username, [string]$ExpectedRole, [string]$ExpectedSubject) {
  $login = Invoke-Api POST "$IdentityBaseUrl/auth/login" @{} @{
    username = $Username
    password = $IdentityPassword
    deviceFingerprint = "jrn-033-$RunId-$Username"
  }
  Require-Status $login @(200) "login $Username"
  $token = "$(Get-Property $login.Json 'accessToken')"
  Require (-not [string]::IsNullOrWhiteSpace($token)) "login returned no accessToken for $Username"

  $session = Invoke-Api GET "$IdentityBaseUrl/auth/session" @{ Authorization = "Bearer $token" }
  Require-Status $session @(200) "session $Username"
  Require ("$(Get-Property $session.Json 'subject')" -eq $ExpectedSubject) "session subject mismatch for $Username"
  $roles = @((Get-Property $session.Json 'roles'))
  Require ($roles -contains $ExpectedRole) "session role mismatch for $Username"

  return [pscustomobject]@{
    Username = $Username
    Role = $ExpectedRole
    Subject = $ExpectedSubject
    Token = $token
  }
}

function Actor-Headers([object]$Actor) {
  return @{
    Authorization = "Bearer $($Actor.Token)"
    "X-Correlation-ID" = "jrn-033-$RunId-$([guid]::NewGuid().ToString('N'))"
  }
}

function Require-NoStore([object]$Response, [string]$Name) {
  $cacheControl = "$(Get-Property $Response.Headers 'Cache-Control')"
  Require ($cacheControl -match 'private' -and $cacheControl -match 'no-store') "$Name did not return private, no-store: '$cacheControl'"
}

$actors = @(
  Login-Actor "client" "client" "client-local-001"
  Login-Actor "bthwani" "partner" "partner-local-001"
  Login-Actor "captain" "captain" "captain-local-001"
  Login-Actor "field" "field" "field-local-001"
)
$operator = Login-Actor "operator" "operator" "operator-local-001"

$walletEvidence = @()
foreach ($actor in $actors) {
  $base = "$DshBaseUrl/dsh/$($actor.Role)/me/finance"
  $wallet = Invoke-Api GET "$base/wallet" (Actor-Headers $actor)
  Require-Status $wallet @(200) "$($actor.Role) own wallet"
  Require-NoStore $wallet "$($actor.Role) own wallet"
  $walletBody = Get-Property $wallet.Json 'wallet'
  Require ("$(Get-Property $walletBody 'actorId')" -eq $actor.Subject) "$($actor.Role) wallet leaked or returned the wrong actor"
  Require ("$(Get-Property $walletBody 'actorType')" -eq $actor.Role) "$($actor.Role) wallet returned the wrong actor type"
  Require ([long](Get-Property $walletBody 'availableBalanceMinorUnits') -gt 0) "$($actor.Role) wallet did not expose the seeded WLT balance"

  $ledger = Invoke-Api GET "$base/ledger-entries?actorId=other&actorType=operator&limit=30" (Actor-Headers $actor)
  Require-Status $ledger @(200) "$($actor.Role) own ledger"
  Require-NoStore $ledger "$($actor.Role) own ledger"
  $entries = @((Get-Property $ledger.Json 'ledgerEntries'))
  Require ($entries.Count -gt 0) "$($actor.Role) ledger returned no WLT evidence"
  foreach ($entry in $entries) {
    Require ("$(Get-Property $entry 'actorId')" -eq $actor.Subject) "$($actor.Role) ledger accepted a cross-actor override"
    Require ("$(Get-Property $entry 'actorType')" -eq $actor.Role) "$($actor.Role) ledger accepted a cross-type override"
  }

  $operatorWallet = Invoke-Api GET "$DshBaseUrl/dsh/control-panel/finance/wallets/$($actor.Role)/$($actor.Subject)" (Actor-Headers $operator)
  Require-Status $operatorWallet @(200) "operator $($actor.Role) wallet lookup"
  Require-NoStore $operatorWallet "operator $($actor.Role) wallet lookup"

  $operatorLedger = Invoke-Api GET "$DshBaseUrl/dsh/control-panel/finance/wallets/$($actor.Role)/$($actor.Subject)/ledger-entries?actorId=other&actorType=operator&limit=50" (Actor-Headers $operator)
  Require-Status $operatorLedger @(200) "operator $($actor.Role) ledger lookup"
  Require-NoStore $operatorLedger "operator $($actor.Role) ledger lookup"
  $operatorEntries = @((Get-Property $operatorLedger.Json 'ledgerEntries'))
  Require ($operatorEntries.Count -gt 0) "operator $($actor.Role) ledger lookup returned no entries"
  foreach ($entry in $operatorEntries) {
    Require ("$(Get-Property $entry 'actorId')" -eq $actor.Subject) "operator ledger query overrode the path actor"
    Require ("$(Get-Property $entry 'actorType')" -eq $actor.Role) "operator ledger query overrode the path actor type"
  }

  $walletEvidence += [ordered]@{
    actorType = $actor.Role
    actorId = $actor.Subject
    status = "$(Get-Property $walletBody 'status')"
    currency = "$(Get-Property $walletBody 'currency')"
    availableBalanceMinorUnits = [long](Get-Property $walletBody 'availableBalanceMinorUnits')
    ledgerEntryCount = $entries.Count
  }
}

$anonymous = Invoke-Api GET "$DshBaseUrl/dsh/client/me/finance/wallet"
Require-Status $anonymous @(401) "anonymous wallet read"

$crossRole = Invoke-Api GET "$DshBaseUrl/dsh/client/me/finance/wallet" (Actor-Headers $actors[1])
Require-Status $crossRole @(403) "partner reading client wallet"

$operatorLookupWithoutPermission = Invoke-Api GET "$DshBaseUrl/dsh/control-panel/finance/wallets/client/client-local-001" (Actor-Headers $actors[0])
Require-Status $operatorLookupWithoutPermission @(403) "client using operator wallet lookup"

$unsupportedActor = Invoke-Api GET "$DshBaseUrl/dsh/control-panel/finance/wallets/operator/operator-local-001" (Actor-Headers $operator)
Require-Status $unsupportedActor @(400) "unsupported representative actor"
Require ("$(Get-Property $unsupportedActor.Json 'code')" -eq "UNSUPPORTED_ACTOR_TYPE") "unsupported actor returned the wrong error code"

$crossTenant = Invoke-Api GET "$DshBaseUrl/dsh/control-panel/finance/wallets/client/client-other-tenant-001" (Actor-Headers $operator)
Require-Status $crossTenant @(404) "cross-tenant wallet lookup"
Require ("$(Get-Property $crossTenant.Json 'code')" -eq "NOT_FOUND") "cross-tenant wallet lookup did not fail closed as not found"

$crossTenantLedger = Invoke-Api GET "$DshBaseUrl/dsh/control-panel/finance/wallets/client/client-other-tenant-001/ledger-entries?limit=50" (Actor-Headers $operator)
Require-Status $crossTenantLedger @(200) "cross-tenant ledger lookup"
Require-NoStore $crossTenantLedger "cross-tenant ledger lookup"
Require (@((Get-Property $crossTenantLedger.Json 'ledgerEntries')).Count -eq 0) "cross-tenant ledger entries leaked into the operator tenant"

$suspendedWallet = Invoke-Api GET "$DshBaseUrl/dsh/control-panel/finance/wallets/partner/partner-dev-0002" (Actor-Headers $operator)
Require-Status $suspendedWallet @(200) "suspended wallet lookup"
Require ("$(Get-Property (Get-Property $suspendedWallet.Json 'wallet') 'status')" -eq "suspended") "suspended wallet state was not preserved"

$frozenWallet = Invoke-Api GET "$DshBaseUrl/dsh/control-panel/finance/wallets/captain/captain-dev-0002" (Actor-Headers $operator)
Require-Status $frozenWallet @(200) "frozen wallet lookup"
Require ("$(Get-Property (Get-Property $frozenWallet.Json 'wallet') 'status')" -eq "frozen") "frozen wallet state was not preserved"

$directWlt = Invoke-Api GET "$WltBaseUrl/wlt/wallets/client/client-local-001"
Require ($directWlt.Status -eq 401 -or $directWlt.Status -eq 403) "internal WLT wallet route was readable without service authentication"

[ordered]@{
  state = "PASS"
  journey = "JRN-033"
  runId = $RunId
  surfaces = @("app-client", "app-partner", "app-captain", "app-field", "control-panel")
  wallets = $walletEvidence
  negativeEvidence = @(
    "anonymous wallet read rejected",
    "cross-role self-service read rejected",
    "operator lookup without finance permission rejected",
    "unsupported wallet actor rejected",
    "cross-tenant wallet and ledger reads rejected",
    "query actor override ignored",
    "suspended and frozen states preserved",
    "direct browser-style WLT financial read rejected"
  )
  truthOwner = "WLT"
} | ConvertTo-Json -Depth 12

Write-Host "JRN-033 representative wallet runtime matrix: PASS"
