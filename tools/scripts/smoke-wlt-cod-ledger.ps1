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
$tenantId = 'tenant-dev-001'
$checkoutIntentId = "cod-smoke-checkout-$timestamp"
$orderId = "cod-smoke-order-$timestamp"
$captainId = "cod-smoke-captain-$timestamp"
$partnerId = "cod-smoke-partner-$timestamp"
$correlationId = "cod-smoke-correlation-$timestamp"
$idempotencyKey = "cod-smoke-idempotency-$timestamp"
$amount = 4200

function Invoke-PsqlScalar {
  param([Parameter(Mandatory = $true)][string]$Sql)
  $output = & docker exec $PostgresContainer psql -U $DatabaseUser -d $DatabaseName -v ON_ERROR_STOP=1 -tA -c $Sql
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL command failed with exit code $LASTEXITCODE" }
  return (($output | ForEach-Object { "$_" }) -join "`n").Trim()
}

function Invoke-WltJson {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('GET','POST')][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [object]$Body = $null,
    [string]$OperationIdempotencyKey = $idempotencyKey
  )
  $headers = @{
    Authorization = 'Bearer dev-only-dsh-wlt-shared-secret'
    'X-Service-Caller' = 'dsh'
    'X-Correlation-ID' = $correlationId
    'Idempotency-Key' = $OperationIdempotencyKey
    'X-Tenant-ID' = $tenantId
  }
  $uri = "$BaseUrl$Path"
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -TimeoutSec 25
  }
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 10) -TimeoutSec 25
}

$session = Invoke-WltJson -Method POST -Path '/wlt/payment-sessions' -Body @{
  checkoutIntentId = $checkoutIntentId
  tenantId = $tenantId
  clientId = "cod-smoke-client-$timestamp"
  storeId = "cod-smoke-store-$timestamp"
  paymentMethod = 'cod'
  amountMinorUnits = $amount
  currency = 'YER'
  cartSnapshotHash = "cod-smoke-snapshot-$timestamp"
}
if ($session.paymentSession.status -ne 'reference_created') { throw "Unexpected COD payment-session status: $($session.paymentSession.status)" }

$created = Invoke-WltJson -Method POST -Path '/wlt/cod-records' -OperationIdempotencyKey "$idempotencyKey-create" -Body @{
  orderId = $orderId
  captainId = $captainId
  partnerId = $partnerId
  checkoutIntentId = $checkoutIntentId
}
$codRecordId = "$($created.codRecord.id)"
if ([string]::IsNullOrWhiteSpace($codRecordId)) { throw 'COD record was not created' }
if ($created.codRecord.status -ne 'pending_collection') { throw "Unexpected COD creation status: $($created.codRecord.status)" }
if ($created.codRecord.amountMinorUnits -ne $amount) { throw 'COD amount was not derived from WLT payment session' }

$collected = Invoke-WltJson -Method POST -Path "/wlt/cod-records/$codRecordId/collect" -OperationIdempotencyKey "$idempotencyKey-collect"
if ($collected.codRecord.status -ne 'collected') { throw "COD collection failed: $($collected.codRecord.status)" }

$collectionJournalSql = @"
SELECT
  COALESCE(SUM(l.amount_minor_units) FILTER (WHERE l.debit_credit = 'debit'), 0)
  || '|' || COALESCE(SUM(l.amount_minor_units) FILTER (WHERE l.debit_credit = 'credit'), 0)
  || '|' || string_agg(a.account_type || ':' || l.debit_credit, ',' ORDER BY a.account_type, l.debit_credit)
FROM wlt_ledger_transactions t
JOIN wlt_ledger_lines l ON l.ledger_transaction_id = t.id
JOIN wlt_ledger_accounts a ON a.id = l.account_id
WHERE t.transaction_type = 'cod_collected'
  AND t.reference_type = 'cod_record'
  AND t.reference_id = '$codRecordId';
"@
$collectionJournal = Invoke-PsqlScalar -Sql $collectionJournalSql
if ($collectionJournal -notlike "$amount|$amount|*") { throw "COD collection journal is unbalanced: $collectionJournal" }
if ($collectionJournal -notlike '*cash_in_transit:debit*' -or $collectionJournal -notlike '*platform_payable:credit*') {
  throw "COD collection accounts are incorrect: $collectionJournal"
}

try {
  Invoke-WltJson -Method POST -Path "/wlt/cod-records/$codRecordId/collect" -OperationIdempotencyKey "$idempotencyKey-collect-duplicate" | Out-Null
  throw 'Duplicate COD collect unexpectedly succeeded'
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  if ($statusCode -ne 409) { throw }
}

$remitted = Invoke-WltJson -Method POST -Path "/wlt/cod-records/$codRecordId/remit" -OperationIdempotencyKey "$idempotencyKey-remit"
if ($remitted.codRecord.status -ne 'remitted') { throw "COD remittance failed: $($remitted.codRecord.status)" }

$remittanceJournalSql = @"
SELECT
  COALESCE(SUM(l.amount_minor_units) FILTER (WHERE l.debit_credit = 'debit'), 0)
  || '|' || COALESCE(SUM(l.amount_minor_units) FILTER (WHERE l.debit_credit = 'credit'), 0)
  || '|' || string_agg(a.account_type || ':' || l.debit_credit, ',' ORDER BY a.account_type, l.debit_credit)
FROM wlt_ledger_transactions t
JOIN wlt_ledger_lines l ON l.ledger_transaction_id = t.id
JOIN wlt_ledger_accounts a ON a.id = l.account_id
WHERE t.transaction_type = 'cod_remitted'
  AND t.reference_type = 'cod_record'
  AND t.reference_id = '$codRecordId';
"@
$remittanceJournal = Invoke-PsqlScalar -Sql $remittanceJournalSql
if ($remittanceJournal -notlike "$amount|$amount|*") { throw "COD remittance journal is unbalanced: $remittanceJournal" }
if ($remittanceJournal -notlike '*cash_in_transit:credit*' -or $remittanceJournal -notlike '*provider_clearing:debit*') {
  throw "COD remittance accounts are incorrect: $remittanceJournal"
}

$readback = Invoke-WltJson -Method GET -Path "/wlt/cod-records/$codRecordId"
if ($readback.codRecord.status -ne 'remitted') { throw 'COD readback did not preserve remitted status' }

Write-Host 'COD collection/remittance journey: PASS'
Write-Host "COD record: $codRecordId"
Write-Host "Collection journal: $collectionJournal"
Write-Host "Remittance journal: $remittanceJournal"
