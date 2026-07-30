param(
  [string]$IdentityBaseUrl = "http://localhost:58082",
  [string]$DshBaseUrl = "http://localhost:58080"
)

Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "../../dev/local-actors.ps1")
$ErrorActionPreference = "Stop"

$password = Get-LocalPassword

function Get-ActorToken {
  param(
    [Parameter(Mandatory = $true)][string]$Username
  )

  $body = @{
    username = $Username
    password = $password
    deviceFingerprint = "financial-readback-$Username"
  } | ConvertTo-Json

  $login = Invoke-RestMethod `
    -Method Post `
    -Uri "$IdentityBaseUrl/auth/login" `
    -ContentType "application/json" `
    -Body $body `
    -TimeoutSec 15 `
    -ErrorAction Stop

  if ([string]::IsNullOrWhiteSpace([string]$login.accessToken)) {
    throw "Identity login for '$Username' did not return accessToken."
  }
  return [string]$login.accessToken
}

function Invoke-DshRead {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Token,
    [Parameter(Mandatory = $true)][string]$CorrelationId
  )

  return Invoke-RestMethod `
    -Method Get `
    -Uri "$DshBaseUrl$Path" `
    -Headers @{
      Authorization = "Bearer $Token"
      "X-Correlation-ID" = $CorrelationId
    } `
    -TimeoutSec 20 `
    -ErrorAction Stop
}

function Assert-Property {
  param(
    [Parameter(Mandatory = $true)][object]$Value,
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Context
  )

  if ($null -eq $Value -or $Value.PSObject.Properties.Name -notcontains $Name) {
    throw "$Context is missing property '$Name'."
  }
}

function Assert-WalletParity {
  param(
    [Parameter(Mandatory = $true)][object]$SelfWallet,
    [Parameter(Mandatory = $true)][object]$OperatorWallet,
    [Parameter(Mandatory = $true)][string]$ActorType,
    [Parameter(Mandatory = $true)][string]$ActorId
  )

  foreach ($field in @(
    "actorId",
    "actorType",
    "status",
    "currency",
    "availableBalanceMinorUnits",
    "pendingBalanceMinorUnits",
    "heldBalanceMinorUnits",
    "earnedTotalMinorUnits",
    "settledTotalMinorUnits",
    "paidTotalMinorUnits"
  )) {
    Assert-Property -Value $SelfWallet -Name $field -Context "$ActorType self wallet"
    Assert-Property -Value $OperatorWallet -Name $field -Context "$ActorType operator wallet"
    if ([string]$SelfWallet.$field -ne [string]$OperatorWallet.$field) {
      throw "$ActorType/$ActorId wallet mismatch for '$field': self='$($SelfWallet.$field)' operator='$($OperatorWallet.$field)'."
    }
  }

  if ([string]$SelfWallet.actorType -ne $ActorType -or [string]$SelfWallet.actorId -ne $ActorId) {
    throw "Self wallet returned the wrong owner for $ActorType/$ActorId."
  }
}

function Assert-LedgerParity {
  param(
    [Parameter(Mandatory = $true)][object[]]$SelfEntries,
    [Parameter(Mandatory = $true)][object[]]$OperatorEntries,
    [Parameter(Mandatory = $true)][string]$ActorType,
    [Parameter(Mandatory = $true)][string]$ActorId
  )

  if ($SelfEntries.Count -lt 1) {
    throw "$ActorType/$ActorId self ledger returned no entries."
  }
  if ($OperatorEntries.Count -lt 1) {
    throw "$ActorType/$ActorId operator ledger returned no entries."
  }

  $selfIds = @($SelfEntries | ForEach-Object { [string]$_.id } | Sort-Object -Unique)
  $operatorIds = @($OperatorEntries | ForEach-Object { [string]$_.id } | Sort-Object -Unique)
  $difference = @(Compare-Object -ReferenceObject $selfIds -DifferenceObject $operatorIds)
  if ($difference.Count -ne 0) {
    throw "$ActorType/$ActorId ledger differs between the self and control-panel boundaries."
  }

  foreach ($entry in $SelfEntries) {
    if ([string]$entry.actorType -ne $ActorType -or [string]$entry.actorId -ne $ActorId) {
      throw "$ActorType/$ActorId self ledger leaked an entry owned by '$($entry.actorType)/$($entry.actorId)'."
    }
  }
}

$health = Invoke-RestMethod -Method Get -Uri "$DshBaseUrl/dsh/health" -TimeoutSec 15 -ErrorAction Stop
if ([string]$health.status -ne "healthy") {
  throw "DSH health is not healthy."
}

$operatorToken = Get-ActorToken -Username (Get-LocalUsername "operator")
$actors = @(
  @{ Username = (Get-LocalUsername "client");  ActorType = "client";  ActorId = "client-local-001" },
  @{ Username = (Get-LocalUsername "partner"); ActorType = "partner"; ActorId = "partner-local-001" },
  @{ Username = (Get-LocalUsername "captain"); ActorType = "captain"; ActorId = "captain-local-001" },
  @{ Username = (Get-LocalUsername "field");   ActorType = "field";   ActorId = "field-local-001" }
)

foreach ($actor in $actors) {
  $actorType = [string]$actor.ActorType
  $actorId = [string]$actor.ActorId
  $actorToken = Get-ActorToken -Username ([string]$actor.Username)
  $encodedType = [Uri]::EscapeDataString($actorType)
  $encodedId = [Uri]::EscapeDataString($actorId)
  $correlationPrefix = "financial-readback-$actorType-$([Guid]::NewGuid())"

  $selfWalletEnvelope = Invoke-DshRead `
    -Path "/dsh/$actorType/me/finance/wallet" `
    -Token $actorToken `
    -CorrelationId "$correlationPrefix-self-wallet"
  Assert-Property -Value $selfWalletEnvelope -Name "wallet" -Context "$actorType self wallet response"

  $operatorWalletEnvelope = Invoke-DshRead `
    -Path "/dsh/control-panel/finance/wallets/$encodedType/$encodedId" `
    -Token $operatorToken `
    -CorrelationId "$correlationPrefix-operator-wallet"
  Assert-Property -Value $operatorWalletEnvelope -Name "wallet" -Context "$actorType operator wallet response"

  Assert-WalletParity `
    -SelfWallet $selfWalletEnvelope.wallet `
    -OperatorWallet $operatorWalletEnvelope.wallet `
    -ActorType $actorType `
    -ActorId $actorId

  $selfLedgerEnvelope = Invoke-DshRead `
    -Path "/dsh/$actorType/me/finance/ledger-entries?limit=50" `
    -Token $actorToken `
    -CorrelationId "$correlationPrefix-self-ledger"
  Assert-Property -Value $selfLedgerEnvelope -Name "ledgerEntries" -Context "$actorType self ledger response"

  $operatorLedgerEnvelope = Invoke-DshRead `
    -Path "/dsh/control-panel/finance/wallets/$encodedType/$encodedId/ledger-entries?limit=50" `
    -Token $operatorToken `
    -CorrelationId "$correlationPrefix-operator-ledger"
  Assert-Property -Value $operatorLedgerEnvelope -Name "ledgerEntries" -Context "$actorType operator ledger response"

  Assert-LedgerParity `
    -SelfEntries @($selfLedgerEnvelope.ledgerEntries) `
    -OperatorEntries @($operatorLedgerEnvelope.ledgerEntries) `
    -ActorType $actorType `
    -ActorId $actorId

  if ($actorType -ne "client") {
    $commissions = Invoke-DshRead `
      -Path "/dsh/$actorType/me/finance/commissions" `
      -Token $actorToken `
      -CorrelationId "$correlationPrefix-commissions"
    Assert-Property -Value $commissions -Name "commissions" -Context "$actorType commissions response"

    $payouts = Invoke-DshRead `
      -Path "/dsh/$actorType/me/finance/payout-requests" `
      -Token $actorToken `
      -CorrelationId "$correlationPrefix-payouts"
    Assert-Property -Value $payouts -Name "payoutRequests" -Context "$actorType payout response"
  }

  Write-Host "  $actorType/$actorId representative finance parity: PASS"
}

Write-Host "DSH/WLT representative financial readback smoke: PASS"
