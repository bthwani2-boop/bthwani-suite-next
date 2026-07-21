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
$partnerId = "settlement-smoke-partner-$timestamp"
$orderOne = "settlement-smoke-order-a-$timestamp"
$orderTwo = "settlement-smoke-order-b-$timestamp"
$operatorId = "settlement-smoke-operator-$timestamp"
$correlationId = "settlement-smoke-correlation-$timestamp"
$idempotencyKey = "settlement-smoke-idempotency-$timestamp"
$businessDate = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd')
$deliveredAt = (Get-Date).ToUniversalTime().ToString('o')
$grossOne = 10000
$grossTwo = 5000
$gross = $grossOne + $grossTwo
$feeBasisPoints = 1250
$expectedFee = [int64](($gross * $feeBasisPoints + 5000) / 10000)
$expectedNet = $gross - $expectedFee

function Invoke-PsqlScalar {
  param([Parameter(Mandatory = $true)][string]$Sql)
  $output = & docker exec $PostgresContainer psql -U $DatabaseUser -d $DatabaseName -v ON_ERROR_STOP=1 -tA -c $Sql
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL command failed with exit code $LASTEXITCODE" }
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
    Authorization = 'Bearer dev-only-dsh-wlt-shared-secret'
    'X-Service-Caller' = 'dsh'
    'X-Correlation-ID' = $correlationId
    'Idempotency-Key' = $OperationIdempotencyKey
  }
  $uri = "$BaseUrl$Path"
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -TimeoutSec 25
  }
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 12) -TimeoutSec 25
}

$policy = Invoke-WltJson -Method PUT -Path "/wlt/settlement-policies/$partnerId" -OperationIdempotencyKey "$idempotencyKey-policy" -Body @{
  feeBasisPoints = $feeBasisPoints
  currency = 'YER'
  status = 'active'
  operatorId = $operatorId
}
if ($policy.settlementPolicy.feeBasisPoints -ne $feeBasisPoints) { throw 'Settlement policy fee was not persisted' }
if ($policy.settlementPolicy.status -ne 'active') { throw 'Settlement policy is not active' }

$sourceBody = @{
  partnerId = $partnerId
  periodStart = $businessDate
  periodEnd = $businessDate
  operatorId = $operatorId
  orderSources = @(
    @{ orderId = $orderOne; grossAmountMinorUnits = $grossOne; currency = 'YER'; deliveredAt = $deliveredAt },
    @{ orderId = $orderTwo; grossAmountMinorUnits = $grossTwo; currency = 'YER'; deliveredAt = $deliveredAt }
  )
}
$created = Invoke-WltJson -Method POST -Path '/wlt/settlements' -OperationIdempotencyKey "$idempotencyKey-create" -Body $sourceBody
$settlementId = "$($created.settlement.id)"
if ([string]::IsNullOrWhiteSpace($settlementId)) { throw 'Governed settlement was not created' }
if ($created.settlement.status -ne 'pending') { throw "Unexpected settlement creation status: $($created.settlement.status)" }
if ($created.settlement.grossAmount -ne $gross) { throw "Unexpected gross: $($created.settlement.grossAmount)" }
if ($created.settlement.platformFee -ne $expectedFee) { throw "Unexpected fee: $($created.settlement.platformFee), expected $expectedFee" }
if ($created.settlement.netAmount -ne $expectedNet) { throw "Unexpected net: $($created.settlement.netAmount), expected $expectedNet" }
if ($created.settlement.orderCount -ne 2) { throw 'Settlement order count was not derived from sources' }

$sourceLockSql = "SELECT COUNT(*) FROM wlt_settlement_source_orders WHERE settlement_id = '$settlementId';"
if ((Invoke-PsqlScalar -Sql $sourceLockSql) -ne '2') { throw 'Settlement source orders were not locked' }

try {
  Invoke-WltJson -Method POST -Path '/wlt/settlements' -OperationIdempotencyKey "$idempotencyKey-duplicate" -Body $sourceBody | Out-Null
  throw 'Duplicate settlement source orders unexpectedly succeeded'
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  if ($statusCode -ne 409) { throw }
}

$posted = Invoke-WltJson -Method POST -Path "/wlt/settlements/$settlementId/post" -OperationIdempotencyKey "$idempotencyKey-post"
if ($posted.settlement.status -ne 'settled') { throw "Settlement posting failed: $($posted.settlement.status)" }

$journalSql = @"
SELECT
  COALESCE(SUM(l.amount_minor_units) FILTER (WHERE l.debit_credit = 'debit'), 0)
  || '|' || COALESCE(SUM(l.amount_minor_units) FILTER (WHERE l.debit_credit = 'credit'), 0)
  || '|' || string_agg(a.account_type || ':' || l.debit_credit || ':' || l.amount_minor_units, ',' ORDER BY a.account_type, l.debit_credit)
FROM wlt_ledger_transactions t
JOIN wlt_ledger_lines l ON l.ledger_transaction_id = t.id
JOIN wlt_ledger_accounts a ON a.id = l.account_id
WHERE t.transaction_type = 'settlement_posted'
  AND t.reference_type = 'settlement'
  AND t.reference_id = '$settlementId';
"@
$journal = Invoke-PsqlScalar -Sql $journalSql
if ($journal -notlike "$gross|$gross|*") { throw "Settlement journal is unbalanced: $journal" }
if ($journal -notlike "*platform_payable:debit:$gross*" -or $journal -notlike "*platform_revenue:credit:$expectedFee*" -or $journal -notlike "*wallet:credit:$expectedNet*") {
  throw "Settlement accounting split is incorrect: $journal"
}

$readback = Invoke-WltJson -Method GET -Path "/wlt/settlements/$settlementId"
if ($readback.settlement.status -ne 'settled') { throw 'Settlement readback did not preserve settled status' }

Write-Host 'Governed settlement journey: PASS'
Write-Host "Settlement: $settlementId"
Write-Host "Gross/Fee/Net: $gross/$expectedFee/$expectedNet"
Write-Host "Ledger: $journal"
