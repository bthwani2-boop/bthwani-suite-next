param(
  [string]$BaseUrl = "http://localhost:18083"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$serviceToken = [string]$env:WLT_DSH_SERVICE_TOKEN
if ([string]::IsNullOrWhiteSpace($serviceToken)) {
  throw "WLT_DSH_SERVICE_TOKEN is required for authenticated WLT runtime smoke."
}

$mutationsEnabledRaw = ([string]$env:WLT_MUTATIONS_ENABLED).Trim().ToLowerInvariant()
if ($mutationsEnabledRaw -notin @("true", "false")) {
  throw "WLT_MUTATIONS_ENABLED must be explicitly true or false for authenticated WLT runtime smoke."
}
$killSwitchRaw = ([string]$env:WLT_FINANCE_MUTATION_KILL_SWITCH).Trim().ToLowerInvariant()
if ($killSwitchRaw -notin @("true", "false")) {
  throw "WLT_FINANCE_MUTATION_KILL_SWITCH must be explicitly true or false for authenticated WLT runtime smoke."
}
$mutationsEnabled = $mutationsEnabledRaw -eq "true"
$killSwitchActive = $killSwitchRaw -eq "true"

$runIdentity = if (-not [string]::IsNullOrWhiteSpace([string]$env:GITHUB_RUN_ID)) {
  "github-$($env:GITHUB_RUN_ID)"
} else {
  "local-$([Guid]::NewGuid().ToString('N'))"
}
$operatorContextId = if (-not [string]::IsNullOrWhiteSpace([string]$env:BTHWANI_OPERATOR_CONTEXT_ID)) {
  [string]$env:BTHWANI_OPERATOR_CONTEXT_ID
} else {
  "local-dsh"
}

$serviceHeaders = @{
  Authorization = "Bearer $serviceToken"
  "X-Service-Caller" = "dsh"
  "X-Correlation-ID" = "wlt-runtime-$runIdentity"
  "X-Delegated-Operator-Context" = $operatorContextId
}

function Invoke-WltRead {
  param([Parameter(Mandatory)][string]$Path)
  Invoke-RestMethod `
    -Method Get `
    -Uri "$BaseUrl$Path" `
    -Headers $serviceHeaders `
    -TimeoutSec 15 `
    -ErrorAction Stop
}

$health = Invoke-RestMethod -Method Get -Uri "$BaseUrl/wlt/health" -TimeoutSec 15 -ErrorAction Stop
if ([string]$health.status -ne "healthy") {
  throw "/wlt/health not healthy: $($health.status)"
}
Write-Host "  /wlt/health: healthy"

$readiness = Invoke-RestMethod -Method Get -Uri "$BaseUrl/wlt/readiness" -TimeoutSec 15 -ErrorAction Stop
if ([string]$readiness.status -ne "ready") {
  throw "/wlt/readiness not ready: $($readiness.status)"
}
Write-Host "  /wlt/readiness: ready"

$paymentReference = Invoke-WltRead -Path "/wlt/references/payment-status?orderId=order-dev-0001"
if ([string]$paymentReference.reference.status -ne "captured") {
  throw "/wlt/references/payment-status wrong status: $($paymentReference.reference.status)"
}
Write-Host "  authenticated payment reference: captured"

$walletReference = Invoke-WltRead -Path "/wlt/references/wallet-status?actorId=partner-dev-0001&actorType=partner"
if ([string]$walletReference.reference.status -ne "active") {
  throw "/wlt/references/wallet-status wrong status: $($walletReference.reference.status)"
}
Write-Host "  authenticated wallet reference: active"

$mutationHeaders = @{
  Authorization = "Bearer $serviceToken"
  "X-Service-Caller" = "dsh"
  "X-Correlation-ID" = "wlt-session-$runIdentity"
  "Idempotency-Key" = "wlt-session-$runIdentity"
  "X-Delegated-Operator-Context" = $operatorContextId
}
$expectedGateCode = if (-not $mutationsEnabled) {
  "MUTATIONS_DISABLED"
} elseif ($killSwitchActive) {
  "KILL_SWITCH_ACTIVE"
} else {
  ""
}

if (-not [string]::IsNullOrWhiteSpace($expectedGateCode)) {
	$blockedResponse = Invoke-WebRequest `
		-Method Post `
		-Uri "$BaseUrl/wlt/payment-sessions" `
		-Headers $mutationHeaders `
		-ContentType "application/json" `
		-Body (@{ checkoutIntentId = "checkout-$runIdentity" } | ConvertTo-Json -Compress) `
		-TimeoutSec 20 `
		-SkipHttpErrorCheck
	$createStatus = [int]$blockedResponse.StatusCode
	$createCode = ""
	if (-not [string]::IsNullOrWhiteSpace([string]$blockedResponse.Content)) {
		try {
			$blockedBody = $blockedResponse.Content | ConvertFrom-Json -ErrorAction Stop
			$codeProperty = $blockedBody.PSObject.Properties["code"]
			if ($null -ne $codeProperty) { $createCode = [string]$codeProperty.Value }
		} catch {
			throw "WLT mutation gate returned invalid JSON: status=$createStatus body=$($blockedResponse.Content)"
		}
	}
	if ($createStatus -ne 403 -or $createCode -ne $expectedGateCode) {
		throw "WLT mutation gate contract mismatch: expected HTTP 403 code=$expectedGateCode but received status=$createStatus code=$createCode body=$($blockedResponse.Content)"
	}
  Write-Host "  authenticated mutation gate: $expectedGateCode fail-closed as configured"
  Write-Host "WLT authenticated runtime smoke: PASS"
	return
}

$checkoutIntentId = "checkout-$runIdentity"
$cartSnapshotHash = "runtime-smoke-$runIdentity"
$pricingEvidenceSecret = [string]$env:WLT_DSH_PRICING_EVIDENCE_SECRET
if ([string]::IsNullOrWhiteSpace($pricingEvidenceSecret)) {
	throw "WLT_DSH_PRICING_EVIDENCE_SECRET is required to create the canonical runtime quote."
}
$evidence = [ordered]@{
	version = 1
	lines = @([ordered]@{ masterProductId = "runtime-smoke-product"; unitPriceMinorUnits = 1000; currency = "YER" })
	deliveryFeeMinorUnits = 0
	serviceFeeMinorUnits = 0
	discountMinorUnits = 0
	signature = ""
}
$unsignedEvidence = $evidence | ConvertTo-Json -Compress -Depth 8
$hmac = [System.Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($pricingEvidenceSecret))
try {
	$evidence.signature = [Convert]::ToHexString($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($unsignedEvidence))).ToLowerInvariant()
} finally {
	$hmac.Dispose()
}
$quoteRequest = [ordered]@{
	checkoutIntentId = $checkoutIntentId
	cartSnapshotHash = $cartSnapshotHash
	clientId = "client-local-001"
	storeId = "store-test-grocery"
	currency = "YER"
	cartVersion = 1
	lines = @([ordered]@{ masterProductId = "runtime-smoke-product"; productName = "Runtime smoke product"; quantity = 1 })
	pricingEvidence = $evidence
} | ConvertTo-Json -Compress -Depth 8
$quoteResponse = Invoke-WebRequest `
	-Method Post `
	-Uri "$BaseUrl/wlt/internal/quotes/calculate" `
	-Headers $mutationHeaders `
	-ContentType "application/json" `
	-Body $quoteRequest `
	-TimeoutSec 20 `
	-SkipHttpErrorCheck
if ([int]$quoteResponse.StatusCode -ne 200) {
	throw "WLT canonical quote create expected HTTP 200 but returned status=$($quoteResponse.StatusCode) body=$($quoteResponse.Content)"
}
try {
	$quote = ($quoteResponse.Content | ConvertFrom-Json -ErrorAction Stop).quote
} catch {
	throw "WLT canonical quote create returned invalid JSON: $($quoteResponse.Content)"
}
if ($null -eq $quote -or [string]::IsNullOrWhiteSpace([string]$quote.id)) {
	throw "WLT canonical quote create returned no quote.id: $($quoteResponse.Content)"
}
$sessionBody = @{
	checkoutIntentId = $checkoutIntentId
	clientId = "client-local-001"
	storeId = "store-test-grocery"
	paymentMethod = "cod"
	amountMinorUnits = [int64]$quote.totalMinorUnits
	currency = [string]$quote.currency
	cartSnapshotHash = $cartSnapshotHash
	pricingQuoteId = [string]$quote.id
} | ConvertTo-Json -Compress
$createResponse = Invoke-WebRequest `
	-Method Post `
	-Uri "$BaseUrl/wlt/payment-sessions" `
	-Headers $mutationHeaders `
	-ContentType "application/json" `
	-Body $sessionBody `
	-TimeoutSec 20 `
	-SkipHttpErrorCheck
$createStatus = [int]$createResponse.StatusCode
$createBody = $null
if (-not [string]::IsNullOrWhiteSpace([string]$createResponse.Content)) {
	try { $createBody = $createResponse.Content | ConvertFrom-Json -ErrorAction Stop } catch {
		throw "WLT payment-session create returned invalid JSON: status=$createStatus body=$($createResponse.Content)"
	}
}
$createCode = ""
if ($null -ne $createBody) {
	$codeProperty = $createBody.PSObject.Properties["code"]
	if ($null -ne $codeProperty) { $createCode = [string]$codeProperty.Value }
}

if ($createStatus -ne 201) {
  throw "WLT payment-session create expected enabled mutation path but returned status=$createStatus code=$createCode body=$($createResponse.Content)"
}
if ($null -eq $createBody) {
  throw "WLT payment-session create returned HTTP 201 with an empty response body."
}
$paymentSessionProperty = $createBody.PSObject.Properties["paymentSession"]
if ($null -eq $paymentSessionProperty -or $null -eq $paymentSessionProperty.Value) {
  throw "WLT payment-session create returned HTTP 201 without paymentSession: body=$($createResponse.Content)"
}
$idProperty = $paymentSessionProperty.Value.PSObject.Properties["id"]
$sessionId = if ($null -ne $idProperty) { [string]$idProperty.Value } else { "" }
if ([string]::IsNullOrWhiteSpace($sessionId)) {
  throw "/wlt/payment-sessions returned HTTP 201 without paymentSession.id."
}

$sessionRead = Invoke-WltRead -Path "/wlt/payment-sessions/$([Uri]::EscapeDataString($sessionId))"
if ([string]$sessionRead.paymentSession.status -ne "cod_pending") {
  throw "/wlt/payment-sessions readback wrong status: $($sessionRead.paymentSession.status)"
}
Write-Host "  authenticated payment-session readback: cod_pending"

Write-Host "WLT authenticated runtime smoke: PASS"
