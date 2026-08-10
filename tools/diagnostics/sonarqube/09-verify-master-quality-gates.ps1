#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Repository = "bthwani2-boop/bthwani-suite-next",
    [string]$BaseBranch = "master",
    [string]$RulesetName = "master-protection"
)

$ErrorActionPreference = "Stop"
$RequiredNames = @(
    'BThwani CI result',
    'SonarQube Cloud scan',
    'SonarCloud Code Analysis',
    'Analyze go (dsh)',
    'Analyze go (identity)',
    'Analyze go (platform-control)',
    'Analyze go (providers)',
    'Analyze go (wlt)',
    'Analyze go (workforce)',
    'Analyze javascript-typescript'
)

function Fail([string]$Message) { throw "QUALITY-GATE VERIFY FAILED: $Message" }

$root = (& git rev-parse --show-toplevel 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or -not $root) { Fail "Run from inside the repository." }
Set-Location $root
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { Fail "gh CLI is required." }
& gh auth status
if ($LASTEXITCODE -ne 0) { Fail "GitHub CLI authentication is not ready." }

$sha = (gh api "repos/$Repository/commits/$BaseBranch" --jq .sha).Trim()
if ($LASTEXITCODE -ne 0 -or -not $sha) { Fail "Cannot resolve remote master SHA." }
Write-Host "Remote $BaseBranch SHA: $sha"

$rulesets = gh api "repos/$Repository/rulesets" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { Fail "Cannot list rulesets." }
$match = @($rulesets | Where-Object name -eq $RulesetName)
if ($match.Count -ne 1) { Fail "Expected exactly one '$RulesetName' ruleset." }
$ruleset = gh api "repos/$Repository/rulesets/$($match[0].id)" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { Fail "Cannot read ruleset details." }
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
if ($unexpectedConfigured.Count -gt 0) { Fail "Unexpected stale required contexts: $($unexpectedConfigured -join ', ')" }
$unbound = @($configured | Where-Object { -not $_.integration_id -or [int64]$_.integration_id -le 0 })
if ($unbound.Count -gt 0) { Fail "One or more required checks are not bound to a GitHub App integration." }

$checks = @(((gh api -H "Accept: application/vnd.github+json" "repos/$Repository/commits/$sha/check-runs?per_page=100" | ConvertFrom-Json).check_runs))
if ($LASTEXITCODE -ne 0) { Fail "Cannot read current master checks." }
$rows = foreach ($name in $RequiredNames) {
    $r = @($checks | Where-Object name -eq $name | Sort-Object started_at -Descending | Select-Object -First 1)
    if ($r.Count -eq 0) { [pscustomobject]@{Name=$name;Status='missing';Conclusion='';App=''} }
    else { [pscustomobject]@{Name=$name;Status=$r[0].status;Conclusion=$r[0].conclusion;App=$r[0].app.slug} }
}
$rows | Format-Table -AutoSize
$bad = @($rows | Where-Object { $_.Status -ne 'completed' -or $_.Conclusion -ne 'success' })
if ($bad.Count -gt 0) { Fail "Current master does not have a successful instance of every required check." }

$ci = Get-Content (Join-Path $root '.github\workflows\ci.yml') -Raw
$prBlock = [regex]::Match($ci, '(?ms)^  pull_request:\r?\n(?<body>.*?)(?=^  push:)')
if (-not $prBlock.Success) { Fail "CI pull_request trigger not found." }
if ($prBlock.Groups['body'].Value -match '(?m)^    paths:') { Fail "CI PR trigger still has a paths filter; required check could remain pending." }

$sonar = Get-Content (Join-Path $root '.github\workflows\sonarqube.yml') -Raw
if ($sonar -notmatch '(?ms)pull_request:.*?branches:\s*\[master\]') { Fail "Sonar workflow is not configured for PRs targeting master." }
if ($sonar -notmatch '(?ms)push:.*?branches:\s*\[master\]') { Fail "Sonar workflow is not configured for master pushes." }

$props = Get-Content (Join-Path $root 'sonar-project.properties') -Raw
$coverageGlobalOff = $props -match '(?m)^sonar\.coverage\.exclusions=\*\*/\*$'
$cpdGlobalOff = $props -match '(?m)^sonar\.cpd\.exclusions=\*\*/\*$'

Write-Host ""
Write-Host "MASTER QUALITY-GATE PROTECTION: PASS"
Write-Host "Ruleset is active, strict, integration-bound, and all required checks are green on master."
if ($coverageGlobalOff -or $cpdGlobalOff) {
    Write-Warning "Master merge protection is correct, but Sonar metric hardening remains pending: coverageGlobalOff=$coverageGlobalOff cpdGlobalOff=$cpdGlobalOff"
    Write-Host "Next stage: prepare JS/TS LCOV + remove global coverage/CPD exclusions in a separate protected PR."
}
