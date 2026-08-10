#requires -Version 7.0
[CmdletBinding()]
param(
    [int]$PrNumber = 0,
    [string]$Repository = "bthwani2-boop/bthwani-suite-next",
    [string]$BaseBranch = "master",
    [string]$WorkBranch = "chore/github-quality-gate-hardening-20260810",
    [string]$RulesetName = "master-protection",
    [int]$WaitMinutes = 30,
    [switch]$RequireHumanApproval
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

function Invoke-Native {
    param([scriptblock]$Command,[string]$Failure)
    & $Command
    if ($LASTEXITCODE -ne 0) { throw $Failure }
}
function Get-Checks([string]$Sha) {
    $json = gh api -H "Accept: application/vnd.github+json" "repos/$Repository/commits/$Sha/check-runs?per_page=100"
    if ($LASTEXITCODE -ne 0) { throw "Unable to read check runs for $Sha." }
    return @(($json | ConvertFrom-Json).check_runs)
}
function Get-RequiredRows([string]$Sha) {
    $runs = @(Get-Checks $Sha)
    foreach ($name in $RequiredNames) {
        $r = @($runs | Where-Object name -eq $name | Sort-Object started_at -Descending | Select-Object -First 1)
        if ($r.Count -eq 0) { [pscustomobject]@{Name=$name;Status='missing';Conclusion='';App='';IntegrationId=$null} }
        else { [pscustomobject]@{Name=$name;Status=$r[0].status;Conclusion=$r[0].conclusion;App=$r[0].app.slug;IntegrationId=$r[0].app.id} }
    }
}
function Wait-Required([string]$Sha,[int]$Minutes) {
    $deadline = (Get-Date).AddMinutes($Minutes)
    do {
        $rows = @(Get-RequiredRows $Sha)
        $rows | Format-Table -AutoSize
        if (@($rows | Where-Object { $_.Status -ne 'completed' -or $_.Conclusion -ne 'success' -or -not $_.IntegrationId }).Count -eq 0) { return $rows }
        Start-Sleep -Seconds 15
    } while ((Get-Date) -lt $deadline)
    throw "Required checks did not all become successful. No ruleset changes were made."
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "gh CLI is required." }
Invoke-Native { gh auth status } "GitHub CLI authentication is not ready."

if ($PrNumber -le 0) {
    $candidates = gh pr list --repo $Repository --state open --head $WorkBranch --base $BaseBranch --json number,url,headRefName,baseRefName | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw "Unable to discover the readiness PR." }
    if (-not $candidates -or @($candidates).Count -ne 1) { throw "Expected exactly one open readiness PR for '$WorkBranch' -> '$BaseBranch'. Run 05-create-hardening-pr.ps1 first." }
    $PrNumber = [int]@($candidates)[0].number
}

$pr = gh pr view --repo $Repository $PrNumber --json number,url,state,isDraft,baseRefName,headRefName,headRefOid,mergeStateStatus | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Unable to read PR #$PrNumber." }
if ($pr.state -ne 'OPEN') { throw "PR #$PrNumber is not open." }
if ($pr.baseRefName -ne $BaseBranch) { throw "PR #$PrNumber does not target $BaseBranch." }
Write-Host "Readiness PR: $($pr.url)"
Write-Host "Verifying exact PR HEAD before any merge or ruleset mutation..."
$prRows = @(Wait-Required -Sha $pr.headRefOid -Minutes $WaitMinutes)

if ($pr.isDraft) { Invoke-Native { gh pr ready --repo $Repository $PrNumber } "Unable to mark PR ready." }
Write-Host "Merging the proven readiness PR while master is still unprotected..."
Invoke-Native { gh pr merge --repo $Repository $PrNumber --merge --delete-branch } "Readiness PR merge failed."

$deadline = (Get-Date).AddMinutes(5)
do {
    Start-Sleep -Seconds 3
    $masterSha = (gh api "repos/$Repository/commits/$BaseBranch" --jq .sha).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Unable to resolve $BaseBranch after merge." }
    $prState = gh pr view --repo $Repository $PrNumber --json state,mergeCommit | ConvertFrom-Json
    if ($prState.state -eq 'MERGED') { break }
} while ((Get-Date) -lt $deadline)
if ($prState.state -ne 'MERGED') { throw "PR did not reach MERGED state." }

Write-Host "Merged $BaseBranch SHA: $masterSha"
Write-Host "Waiting for the same check set on the resulting master SHA..."
$masterRows = @(Wait-Required -Sha $masterSha -Minutes $WaitMinutes)

$requiredStatus = @(
    foreach ($row in $masterRows) {
        [ordered]@{ context=$row.Name; integration_id=[int64]$row.IntegrationId }
    }
)

$rulesets = gh api "repos/$Repository/rulesets" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Unable to list repository rulesets." }
$matches = @($rulesets | Where-Object name -eq $RulesetName)
if ($matches.Count -ne 1) { throw "Expected exactly one ruleset named '$RulesetName'; found $($matches.Count)." }
$rulesetId = $matches[0].id

$approvalCount = if ($RequireHumanApproval) { 1 } else { 0 }
$codeOwnerReview = [bool]$RequireHumanApproval
$body = [ordered]@{
    name=$RulesetName
    target='branch'
    enforcement='active'
    bypass_actors=@()
    conditions=[ordered]@{ref_name=[ordered]@{exclude=@();include=@("refs/heads/$BaseBranch")}}
    rules=@(
        [ordered]@{type='deletion'},
        [ordered]@{type='non_fast_forward'},
        [ordered]@{type='creation'},
        [ordered]@{type='pull_request';parameters=[ordered]@{
            required_approving_review_count=$approvalCount
            dismiss_stale_reviews_on_push=$true
            require_code_owner_review=$codeOwnerReview
            require_last_push_approval=$false
            required_review_thread_resolution=$true
            allowed_merge_methods=@('merge','squash','rebase')
        }},
        [ordered]@{type='required_status_checks';parameters=[ordered]@{
            strict_required_status_checks_policy=$true
            do_not_enforce_on_create=$false
            required_status_checks=$requiredStatus
        }}
    )
}

$tmp = Join-Path ([IO.Path]::GetTempPath()) "bthwani-master-ruleset-$PID.json"
try {
    $body | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $tmp -Encoding utf8
    Write-Host "Activating $RulesetName ($rulesetId) with app-bound required checks..."
    Invoke-Native { gh api --method PUT -H "Accept: application/vnd.github+json" "repos/$Repository/rulesets/$rulesetId" --input $tmp } "Ruleset activation failed."
} finally { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }

$active = gh api "repos/$Repository/rulesets/$rulesetId" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Unable to verify the updated ruleset." }
if ($active.enforcement -ne 'active') { throw "Ruleset is not active after update." }
$rule = @($active.rules | Where-Object type -eq 'required_status_checks')
$configured = @($rule.parameters.required_status_checks | ForEach-Object context)
$missing = @($RequiredNames | Where-Object { $_ -notin $configured })
if ($missing.Count -gt 0) { throw "Ruleset verification failed; missing contexts: $($missing -join ', ')" }

Write-Host ""
Write-Host "MASTER PROTECTION: ACTIVE"
$masterRows | Select-Object Name,App,IntegrationId | Format-Table -AutoSize
if (-not $RequireHumanApproval) {
    Write-Host "Automated gates are enforced; human approval count is 0 because current CODEOWNERS maps to the same single owner."
    Write-Host "Use -RequireHumanApproval only after an independent reviewer/code owner exists."
}
