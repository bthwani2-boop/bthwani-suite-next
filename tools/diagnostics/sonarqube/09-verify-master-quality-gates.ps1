#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Repository = "bthwani2-boop/bthwani-suite-next",
    [string]$BaseBranch = "master",
    [string]$RulesetName = "master-protection"
)

$ErrorActionPreference = "Stop"
$common = Join-Path $PSScriptRoot 'quality-gate-common.ps1'
if (-not (Test-Path -LiteralPath $common)) { throw "Missing shared quality-gate helper: $common" }
. $common

function Fail([string]$Message) { throw "QUALITY-GATE VERIFY FAILED: $Message" }
function Get-NativeText {
    param([scriptblock]$Command,[string]$Failure,[switch]$AllowEmpty)
    $lines = @(& $Command)
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) { Fail $Failure }
    $text = ($lines -join "`n").Trim()
    if (-not $AllowEmpty -and -not $text) { Fail $Failure }
    return $text
}

$root = Get-NativeText -Command { git rev-parse --show-toplevel 2>$null } -Failure "Run from inside the repository."
Set-Location $root
$registry = Get-BThwaniQualityGateRegistry -RepoRoot $root
if ([string]$registry.baseBranch -ne $BaseBranch) { Fail "Registry baseBranch does not match '$BaseBranch'." }
if ([string]$registry.rulesetName -ne $RulesetName) { Fail "Registry rulesetName does not match '$RulesetName'." }
$RequiredNames = @($registry.requiredChecks | ForEach-Object { [string]$_.context })
$ExpectedProducer = @{}
foreach ($entry in @($registry.requiredChecks)) { $ExpectedProducer[[string]$entry.context] = [string]$entry.producer }

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { Fail "gh CLI is required." }
& gh auth status
if ($LASTEXITCODE -ne 0) { Fail "GitHub CLI authentication is not ready." }

$sha = Get-NativeText -Command { gh api "repos/$Repository/commits/$BaseBranch" --jq .sha } -Failure "Cannot resolve remote master SHA."
Write-Host "Remote $BaseBranch SHA: $sha"

$rulesets = gh api "repos/$Repository/rulesets" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { Fail "Cannot list rulesets." }
$match = @($rulesets | Where-Object name -eq $RulesetName)
if ($match.Count -ne 1) { Fail "Expected exactly one '$RulesetName' ruleset." }
$ruleset = gh api "repos/$Repository/rulesets/$($match[0].id)" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $ruleset) { Fail "Cannot read ruleset details." }
if ($ruleset.enforcement -ne 'active') { Fail "Ruleset enforcement is '$($ruleset.enforcement)', not active." }
if ($ruleset.conditions.ref_name.include -notcontains "refs/heads/$BaseBranch") { Fail "Ruleset does not target $BaseBranch." }

$statusRule = @($ruleset.rules | Where-Object type -eq 'required_status_checks')
if ($statusRule.Count -ne 1) { Fail "Required-status-check rule is missing or ambiguous." }
if (-not $statusRule[0].parameters.strict_required_status_checks_policy) { Fail "Required checks are not strict/up-to-date." }
$configured = @($statusRule[0].parameters.required_status_checks)
$configuredNames = @($configured | ForEach-Object context)
$missingConfigured = @($RequiredNames | Where-Object { $_ -notin $configuredNames })
$unexpectedConfigured = @($configuredNames | Where-Object { $_ -notin $RequiredNames })
if ($missingConfigured.Count -gt 0) { Fail "Missing required contexts: $($missingConfigured -join ', ')" }
if ($unexpectedConfigured.Count -gt 0) { Fail "Unexpected required contexts not present in registry: $($unexpectedConfigured -join ', ')" }
$unbound = @($configured | Where-Object { -not $_.integration_id -or [int64]$_.integration_id -le 0 })
if ($unbound.Count -gt 0) { Fail "One or more required checks are not bound to a GitHub App integration." }

$checksResponse = gh api -H "Accept: application/vnd.github+json" "repos/$Repository/commits/$sha/check-runs?per_page=100" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $checksResponse) { Fail "Cannot read current master checks." }
$checks = @($checksResponse.check_runs)
$rows = foreach ($name in $RequiredNames) {
    $r = @($checks | Where-Object name -eq $name | Sort-Object started_at -Descending | Select-Object -First 1)
    if ($r.Count -eq 0) {
        [pscustomobject]@{Name=$name;Status='missing';Conclusion='';App='';IntegrationId=$null;ProducerMatch=$false}
    } else {
        $app = [string]$r[0].app.slug
        [pscustomobject]@{
            Name=$name
            Status=$r[0].status
            Conclusion=$r[0].conclusion
            App=$app
            IntegrationId=$r[0].app.id
            ProducerMatch=($app -eq $ExpectedProducer[$name])
        }
    }
}
$rows | Format-Table -AutoSize | Out-Host
$bad = @($rows | Where-Object {
    $_.Status -ne 'completed' -or $_.Conclusion -ne 'success' -or -not $_.ProducerMatch -or -not $_.IntegrationId -or [int64]$_.IntegrationId -le 0
})
if ($bad.Count -gt 0) { Fail "Current master does not have a successful registry-defined check from the expected producer for every mandatory context." }

foreach ($configuredCheck in $configured) {
    $row = @($rows | Where-Object Name -eq $configuredCheck.context)
    if ($row.Count -ne 1) { Fail "Cannot bind configured context '$($configuredCheck.context)' to exactly one live proof row." }
    if ([int64]$configuredCheck.integration_id -ne [int64]$row[0].IntegrationId) {
        Fail "Ruleset integration binding drift for '$($configuredCheck.context)': configured=$($configuredCheck.integration_id) live=$($row[0].IntegrationId)."
    }
}

$ci = Get-Content (Join-Path $root '.github\workflows\ci.yml') -Raw
$prBlock = [regex]::Match($ci, '(?ms)^  pull_request:\r?\n(?<body>.*?)(?=^  push:)')
if (-not $prBlock.Success) { Fail "CI pull_request trigger not found." }
if ($prBlock.Groups['body'].Value -match '(?m)^    paths:') { Fail "CI PR trigger still has a paths filter; required check could remain pending." }

$sonar = Get-Content (Join-Path $root '.github\workflows\sonarqube.yml') -Raw
if ($sonar -notmatch '(?ms)pull_request:.*?branches:\s*\[master\]') { Fail "Sonar workflow is not configured for PRs targeting master." }
if ($sonar -notmatch '(?ms)push:.*?branches:\s*\[master\]') { Fail "Sonar workflow is not configured for master pushes." }

$codeql = Get-Content (Join-Path $root '.github\workflows\codeql.yml') -Raw
if ($RequiredNames -contains 'Analyze actions') {
    if ($codeql -notmatch '(?m)^\s*name:\s*Analyze actions\s*$') { Fail "Required Analyze actions context has no matching CodeQL job." }
    if ($codeql -notmatch '(?m)^\s*languages:\s*actions\s*$') { Fail "CodeQL is not configured to analyze GitHub Actions." }
}
if ($codeql -notmatch '(?m)^\s*queries:\s*security-extended\s*$') { Fail "CodeQL security-extended query suite is not configured." }

if ($RequiredNames -contains 'Dependency review') {
    $dependencyReviewPath = Join-Path $root '.github\workflows\dependency-review.yml'
    if (-not (Test-Path -LiteralPath $dependencyReviewPath)) { Fail "Dependency Review is required but its workflow is missing." }
    $dependencyReview = Get-Content -LiteralPath $dependencyReviewPath -Raw
    if ($dependencyReview -notmatch '(?m)^\s*fail-on-severity:\s*low\s*$') { Fail "Dependency Review is not configured to fail from LOW severity upward." }
}

$props = Get-Content (Join-Path $root 'sonar-project.properties') -Raw
$coverageGlobalOff = $props -match '(?m)^sonar\.coverage\.exclusions=\*\*/\*$'
$cpdGlobalOff = $props -match '(?m)^sonar\.cpd\.exclusions=\*\*/\*$'

Write-Host ""
Write-Host "MASTER QUALITY-GATE PROTECTION: PASS"
Write-Host "Ruleset is active, strict, registry-driven, integration-bound, producer-verified, and all mandatory checks are green on master."
if ($coverageGlobalOff -or $cpdGlobalOff) {
    Write-Warning "Master merge protection is correct, but Sonar metric hardening remains pending: coverageGlobalOff=$coverageGlobalOff cpdGlobalOff=$cpdGlobalOff"
    Write-Host "Next stage: prepare credible JS/TS LCOV + remove global coverage/CPD exclusions in a separate protected PR."
}
