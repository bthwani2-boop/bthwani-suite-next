[CmdletBinding()]
param(
  [string]$BaseUrl = $env:WLT_BASE_URL,
  [string]$PostgresContainer = $env:BTHWANI_POSTGRES_CONTAINER,
  [string]$DatabaseUser = $env:BTHWANI_WLT_DB_USER,
  [string]$DatabaseName = $env:BTHWANI_WLT_DB_NAME
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ([string]::IsNullOrWhiteSpace($BaseUrl)) { $BaseUrl = 'http://localhost:58083' }
if ([string]::IsNullOrWhiteSpace($PostgresContainer)) { $PostgresContainer = 'bthwani-postgres-runtime' }
if ([string]::IsNullOrWhiteSpace($DatabaseUser)) { $DatabaseUser = 'wlt_runtime' }
if ([string]::IsNullOrWhiteSpace($DatabaseName)) { $DatabaseName = 'wlt_runtime' }

$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$actorId = "payout-smoke-actor-$timestamp"
$idempotencyKey = "payout-smoke-idem-$timestamp"
$correlationId = "payout-smoke-correlation-$timestamp"
$amount = 2500

function Invoke-PsqlScalar {
  param([Parameter(Mandatory = $true)][string]$Sql)
  $output = & docker exec $PostgresContainer psql -U $DatabaseUser -d $DatabaseName -v ON_ERROR_STOP=1 -tA -c $Sql
  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL command failed with exit code $LASTEXITCODE"
  }
  return (($output | ForEach-Object { "$_" }) -join "`n").Trim()
}

function Invoke-WltJson {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('GET','POST','PUT')][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [object]$Body = $null,
    [string]$OperationIdempotencyKey = $idempotencyKey
  )

  $headers = @{
    'Authorization' = 'Bearer dev-only-dsh-wlt-shared-secret'
    'X-Service-Caller' = 'dsh'
    'X-Correlation-ID' = $correlationId
    'Idempotency-Key' = $OperationIdempotencyKey
  }
  $uri = "$BaseUrl$Path"
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -TimeoutSec 25
  }
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 10) -TimeoutSec 25
}

$health = Invoke-WltJson -Method GET -Path '/wlt/health'
if ($health.status -ne 'healthy') { throw 'WLT health failed before payout journey' }

$walletSql = @"
INSERT INTO wlt_wallets (
  actor_id, actor_type, status, currency,
  available_balance_minor_units, pending_balance_minor_units,
  held_balance_minor_units, earned_total_minor_units, paid_total_minor_units
)
VALUES ('$actorId', 'captain', 'active', 'YER', 10000, 0, 0, 10000, 0)
ON CONFLICT (actor_type, actor_id)
DO UPDATE SET
  status = 'active',
  currency = 'YER',
  available_balance_minor_units = 10000,
  pending_balance_minor_units = 0,
  held_balance_minor_units = 0,
  earned_total_minor_units = GREATEST(wlt_wallets.earned_total_minor_units, 10000),
  paid_total_minor_units = 0,
  updated_at = now();
"@
Invoke-PsqlScalar -Sql $walletSql | Out-Null

$created = Invoke-WltJson -Method POST -Path '/wlt/payout-requests' -Body @{
  beneficiaryActorId = $actorId
  beneficiaryActorType = 'captain'
  amountMinorUnits = $amount
  currency = 'YER'
  idempotencyKey = $idempotencyKey
}
$payoutId = "$($created.payoutRequest.id)"
if ([string]::IsNullOrWhiteSpace($payoutId)) { throw 'Payout request was not created' }
if ($created.payoutRequest.status -ne 'pending') { throw "Unexpected created payout status: $($created.payoutRequest.status)" }

$approved = Invoke-WltJson -Method POST -Path "/wlt/payout-requests/$payoutId/approve" -OperationIdempotencyKey "$idempotencyKey-approve" -Body @{
  operatorId = 'finance-maker-1'
}
if ($approved.payoutRequest.status -ne 'approved') { throw "Payout approval failed: $($approved.payoutRequest.status)" }

$processed = Invoke-WltJson -Method POST -Path "/wlt/payout-requests/$payoutId/process" -OperationIdempotencyKey "$idempotencyKey-process" -Body @{
  operatorId = 'finance-processor-2'
}
if ($processed.payoutRequest.status -ne 'processing') { throw "Payout provider processing failed: $($processed.payoutRequest.status)" }

$completed = Invoke-WltJson -Method POST -Path "/wlt/payout-requests/$payoutId/complete" -OperationIdempotencyKey "$idempotencyKey-complete" -Body @{
  operatorId = 'finance-checker-3'
}
if ($completed.payoutRequest.status -ne 'completed') { throw "Payout completion failed: $($completed.payoutRequest.status)" }

$proofSql = @"
SELECT status || '|' || provider_reference || '|' || provider_status
FROM wlt_payout_requests
WHERE id = '$payoutId';
"@
$proof = Invoke-PsqlScalar -Sql $proofSql
$proofParts = $proof.Split('|')
if ($proofParts.Count -ne 3) { throw "Invalid payout provider proof row: $proof" }
if ($proofParts[0] -ne 'completed') { throw "Payout database status is not completed: $proof" }
if ([string]::IsNullOrWhiteSpace($proofParts[1])) { throw 'Payout provider reference was not persisted' }
if ($proofParts[2] -notin @('processed','succeeded')) { throw "Unexpected payout provider status: $($proofParts[2])" }

$walletReadbackSql = @"
SELECT available_balance_minor_units || '|' || held_balance_minor_units || '|' || paid_total_minor_units
FROM wlt_wallets
WHERE actor_id = '$actorId' AND actor_type = 'captain';
"@
$walletReadback = Invoke-PsqlScalar -Sql $walletReadbackSql
if ($walletReadback -ne '7500|0|2500') {
  throw "Unexpected wallet readback after payout: $walletReadback"
}

$journalSql = @"
SELECT
  COALESCE(SUM(l.amount_minor_units) FILTER (WHERE l.debit_credit = 'debit'), 0)
  || '|' ||
  COALESCE(SUM(l.amount_minor_units) FILTER (WHERE l.debit_credit = 'credit'), 0)
  || '|' || COUNT(*)
FROM wlt_ledger_transactions t
JOIN wlt_ledger_lines l ON l.ledger_transaction_id = t.id
WHERE t.transaction_type = 'payout_completed'
  AND t.reference_type = 'payout_request'
  AND t.reference_id = '$payoutId';
"@
$journal = Invoke-PsqlScalar -Sql $journalSql
if ($journal -ne '2500|2500|2') {
  throw "Payout journal is missing or unbalanced: $journal"
}

Write-Host "Provider-backed payout journey: PASS"
Write-Host "Payout ID: $payoutId"
Write-Host "Provider reference: $($proofParts[1])"
Write-Host "Wallet readback: $walletReadback"
Write-Host "Ledger readback: $journal"
