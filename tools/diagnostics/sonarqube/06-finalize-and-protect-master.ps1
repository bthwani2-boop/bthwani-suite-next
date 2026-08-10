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
$ApiVersion = "2026-03-10"
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
function Get-NativeText {
    param([scriptblock]$Command,[string]$Failure,[switch]$AllowEmpty)
    $lines = @(& $Command)
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) { throw $Failure }
    $text = ($lines -join "`n").Trim()
    if (-not $AllowEmpty -and -not $text) { throw $Failure }
    return $text
}
function Get-Checks([string]$Sha) {
    $json = gh api -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: $ApiVersion" "repos/$Repository/commits/$Sha/check-runs?per_page=100"
    if ($LASTEXITCODE -ne 0) { throw "Unable to read check runs for $Sha." }
    return @(($json | ConvertFrom-Json).check_runs)
}
function Get-RequiredRows([string]$Sha) {
    $runs = @(Get-Checks $Sha)
    foreach ($name in $RequiredNames) {
        $r = @($runs | Where-Object name -eq $name | Sort-Object started_at -Descending | Select-Object -First 1)
        if ($r.Count -eq 0) {
            [pscustomobject]@{Name=$name;Status='missing';Conclusion='';App='';IntegrationId=$null}
        } else {
            [pscustomobject]@{
                Name=$name
                Status=$r[0].status
                Conclusion=$r[0].conclusion
                App=$r[0].app.slug
                IntegrationId=$r[0].app.id
            }
        }
    }
}
function Wait-Required([string]$Sha,[int]$Minutes) {
    $deadline = (Get-Date).AddMinutes($Minutes)
    do {
        $rows = @(Get-RequiredRows $Sha)
        # Out-Host is deliberate: Format-Table emits formatting objects to the
        # success pipeline. If captured by the caller those objects corrupt the
        # required-status-check JSON payload.
        $rows | Format-Table -AutoSize | Out-Host
        $bad = @($rows | Where-Object {
            $_.Status -ne 'completed' -or
            $_.Conclusion -ne 'success' -or
            -not $_.IntegrationId -or
            [int64]$_.IntegrationId -le 0
        })
        if ($bad.Count -eq 0) { return $rows }
        Start-Sleep -Seconds 15
    } while ((Get-Date) -lt $deadline)
    throw "Required checks did not all become successful. No ruleset changes were made."
}
function Assert-RequiredRows([object[]]$Rows) {
    if ($Rows.Count -ne $RequiredNames.Count) {
        throw "Expected $($RequiredNames.Count) required-check rows; received $($Rows.Count)."
    }
    $names = @($Rows | ForEach-Object Name)
    $missing = @($RequiredNames | Where-Object { $_ -notin $names })
    $unexpected = @($names | Where-Object { $_ -notin $RequiredNames })
    $duplicates = @($names | Group-Object | Where-Object Count -ne 1 | ForEach-Object Name)
    $invalid = @($Rows | Where-Object {
        -not $_.Name -or -not $_.IntegrationId -or [int64]$_.IntegrationId -le 0
    })
    if ($missing.Count -gt 0 -or $unexpected.Count -gt 0 -or $duplicates.Count -gt 0 -or $invalid.Count -gt 0) {
        throw "Invalid required-check inventory. missing=[$($missing -join ', ')] unexpected=[$($unexpected -join ', ')] duplicates=[$($duplicates -join ', ')] invalid=$($invalid.Count)"
    }
}
function New-RulesetBody([object[]]$Rows,[string]$Enforcement,[bool]$BindApps) {
    $approvalCount = if ($RequireHumanApproval) { 1 } else { 0 }
    $codeOwnerReview = [bool]$RequireHumanApproval
    $requiredStatus = @(
        foreach ($row in $Rows) {
            if ($BindApps) {
                [ordered]@{ context=[string]$row.Name; integration_id=[int64]$row.IntegrationId }
            } else {
                [ordered]@{ context=[string]$row.Name }
            }
        }
    )
    return [ordered]@{
        name=$RulesetName
        target='branch'
        enforcement=$Enforcement
        bypass_actors=@()
        conditions=[ordered]@{
            ref_name=[ordered]@{exclude=@();include=@("refs/heads/$BaseBranch")}
        }
        rules=@(
            [ordered]@{type='deletion'},
            [ordered]@{type='non_fast_forward'},
            [ordered]@{type='creation'},
            [ordered]@{type='pull_request';parameters=[ordered]@{
                required_approving_review_count=$approvalCount
                dismiss_stale_reviews_on_push=$true
                required_reviewers=@()
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
}
function Put-Ruleset([int64]$RulesetId,[object]$Body,[string]$Failure) {
    $tmp = Join-Path ([IO.Path]::GetTempPath()) "bthwani-master-ruleset-$PID-$([guid]::NewGuid().ToString('N')).json"
    try {
        $json = $Body | ConvertTo-Json -Depth 20
        $json | Set-Content -LiteralPath $tmp -Encoding utf8
        Invoke-Native {
            gh api --method PUT `
                -H "Accept: application/vnd.github+json" `
                -H "X-GitHub-Api-Version: $ApiVersion" `
                "repos/$Repository/rulesets/$RulesetId" --input $tmp
        } $Failure
    } finally {
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    }
}
function Read-Ruleset([int64]$RulesetId) {
    $json = gh api -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: $ApiVersion" "repos/$Repository/rulesets/$RulesetId"
    if ($LASTEXITCODE -ne 0) { throw "Unable to read ruleset $RulesetId." }
    return ($json | ConvertFrom-Json)
}
function Assert-RulesetContexts([object]$Ruleset,[bool]$RequireBindings) {
    $rule = @($Ruleset.rules | Where-Object type -eq 'required_status_checks')
    if ($rule.Count -ne 1) { throw "Ruleset required_status_checks rule is missing or ambiguous." }
    $configured = @($rule[0].parameters.required_status_checks)
    $configuredNames = @($configured | ForEach-Object context)
    $missing = @($RequiredNames | Where-Object { $_ -notin $configuredNames })
    $unexpected = @($configuredNames | Where-Object { $_ -notin $RequiredNames })
    if ($missing.Count -gt 0 -or $unexpected.Count -gt 0) {
        throw "Ruleset context verification failed. missing=[$($missing -join ', ')] unexpected=[$($unexpected -join ', ')]"
    }
    if ($RequireBindings) {
        $unbound = @($configured | Where-Object { -not $_.integration_id -or [int64]$_.integration_id -le 0 })
        if ($unbound.Count -gt 0) { throw "$($unbound.Count) required context(s) are not integration-bound." }
    }
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "gh CLI is required." }
Invoke-Native { gh auth status } "GitHub CLI authentication is not ready."

$pr = $null
if ($PrNumber -le 0) {
    $candidates = gh pr list --repo $Repository --state open --head $WorkBranch --base $BaseBranch --json number,url,headRefName,baseRefName | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw "Unable to discover the readiness PR." }
    if (-not $candidates -or @($candidates).Count -ne 1) {
        throw "Expected exactly one open readiness PR for '$WorkBranch' -> '$BaseBranch'. Pass -PrNumber for a previously merged readiness PR."
    }
    $PrNumber = [int]@($candidates)[0].number
}

$pr = gh pr view --repo $Repository $PrNumber --json number,url,state,isDraft,baseRefName,headRefName,headRefOid,mergeStateStatus,mergeCommit | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $pr) { throw "Unable to read PR #$PrNumber." }
if ($pr.baseRefName -ne $BaseBranch) { throw "PR #$PrNumber does not target $BaseBranch." }
Write-Host "Readiness PR: $($pr.url)"

if ($pr.state -eq 'OPEN') {
    Write-Host "Verifying exact PR HEAD before any merge or ruleset mutation..."
    $prRows = @(Wait-Required -Sha $pr.headRefOid -Minutes $WaitMinutes)
    Assert-RequiredRows $prRows
    if ($pr.isDraft) { Invoke-Native { gh pr ready --repo $Repository $PrNumber } "Unable to mark PR ready." }
    Write-Host "Merging the proven readiness PR while master is still unprotected..."
    Invoke-Native { gh pr merge --repo $Repository $PrNumber --merge --delete-branch } "Readiness PR merge failed."
} elseif ($pr.state -eq 'MERGED') {
    Write-Host "Readiness PR is already merged; resuming ruleset activation without creating another PR."
} else {
    throw "PR #$PrNumber is neither OPEN nor MERGED (state=$($pr.state))."
}

$masterSha = Get-NativeText -Command {
    gh api -H "X-GitHub-Api-Version: $ApiVersion" "repos/$Repository/commits/$BaseBranch" --jq .sha
} -Failure "Unable to resolve current $BaseBranch SHA."
Write-Host "Current $BaseBranch SHA: $masterSha"
Write-Host "Waiting for the required check set on the current master SHA..."
$masterRows = @(Wait-Required -Sha $masterSha -Minutes $WaitMinutes)
Assert-RequiredRows $masterRows

$rulesets = gh api -H "X-GitHub-Api-Version: $ApiVersion" "repos/$Repository/rulesets" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Unable to list repository rulesets." }
$matches = @($rulesets | Where-Object name -eq $RulesetName)
if ($matches.Count -ne 1) { throw "Expected exactly one ruleset named '$RulesetName'; found $($matches.Count)." }
$rulesetId = [int64]$matches[0].id

# GitHub requires an app selected as the expected source of a required check to
# be associated with a pre-existing required context. Register the exact live
# contexts first while enforcement remains disabled, then bind each context to
# the GitHub App that actually produced the successful check and activate.
Write-Host "Staging exact required contexts on disabled ruleset $RulesetName ($rulesetId)..."
$stageBody = New-RulesetBody -Rows $masterRows -Enforcement 'disabled' -BindApps $false
Put-Ruleset -RulesetId $rulesetId -Body $stageBody -Failure "Ruleset context staging failed."
$staged = Read-Ruleset $rulesetId
if ($staged.enforcement -ne 'disabled') { throw "Ruleset unexpectedly became active during context staging." }
Assert-RulesetContexts -Ruleset $staged -RequireBindings $false

Write-Host "Activating $RulesetName with strict, app-bound required checks..."
$activeBody = New-RulesetBody -Rows $masterRows -Enforcement 'active' -BindApps $true
Put-Ruleset -RulesetId $rulesetId -Body $activeBody -Failure "Ruleset activation failed."
$active = Read-Ruleset $rulesetId
if ($active.enforcement -ne 'active') { throw "Ruleset is not active after update." }
Assert-RulesetContexts -Ruleset $active -RequireBindings $true

Write-Host ""
Write-Host "MASTER PROTECTION: ACTIVE"
$masterRows | Select-Object Name,App,IntegrationId | Format-Table -AutoSize | Out-Host
if (-not $RequireHumanApproval) {
    Write-Host "Automated gates are enforced; human approval count is 0 because current CODEOWNERS maps to the same single owner."
    Write-Host "Use -RequireHumanApproval only after an independent reviewer/code owner exists."
}
