#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Repository = "bthwani2-boop/bthwani-suite-next",
    [string]$BaseBranch = "master",
    [int]$WaitMinutes = 30,
    [switch]$SkipFullDispatch
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

function Wait-Required([string]$Sha,[int]$Minutes) {
    $deadline = (Get-Date).AddMinutes($Minutes)
    do {
        $runs = @(Get-Checks $Sha)
        $rows = foreach ($name in $RequiredNames) {
            $r = @($runs | Where-Object name -eq $name | Sort-Object started_at -Descending | Select-Object -First 1)
            if ($r.Count -eq 0) {
                [pscustomobject]@{ Name=$name; Status='missing'; Conclusion=''; App='' }
            } else {
                [pscustomobject]@{ Name=$name; Status=$r[0].status; Conclusion=$r[0].conclusion; App=$r[0].app.slug }
            }
        }
        $rows | Format-Table -AutoSize
        $bad = @($rows | Where-Object { $_.Status -ne 'completed' -or $_.Conclusion -ne 'success' })
        if ($bad.Count -eq 0) { return $rows }
        Start-Sleep -Seconds 15
    } while ((Get-Date) -lt $deadline)
    throw "Work-branch proof did not reach green. Fix the failing or missing checks before continuing development toward merge."
}

$root = (& git rev-parse --show-toplevel 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or -not $root) { throw "Run from inside the repository." }
Set-Location $root
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "gh CLI is required." }
Invoke-Native { gh auth status } "GitHub CLI authentication is not ready."

$branch = (& git branch --show-current).Trim()
if (-not $branch -or $branch -eq $BaseBranch) { throw "This proof is for a work branch, not '$BaseBranch'." }
if (git status --porcelain) { throw "Commit or intentionally discard local changes first. Proof must bind to an immutable pushed SHA." }

Invoke-Native { git fetch origin $BaseBranch $branch } "Unable to fetch current branch/base truth."
$baseSha = (& git rev-parse "origin/$BaseBranch").Trim()
$headSha = (& git rev-parse HEAD).Trim()
$mergeBase = (& git merge-base HEAD "origin/$BaseBranch").Trim()
if ($mergeBase -ne $baseSha) {
    throw "Work branch is behind current $BaseBranch. Merge/rebase origin/$BaseBranch, resolve conflicts, retest, then rerun this proof."
}

$remoteHead = (& git rev-parse "origin/$branch" 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or -not $remoteHead -or $remoteHead -ne $headSha) {
    Invoke-Native { git push -u origin $branch } "Unable to publish exact work-branch HEAD."
    $remoteHead = (& git rev-parse "origin/$branch").Trim()
}
if ($remoteHead -ne $headSha) { throw "Remote branch does not resolve to local HEAD after push." }

$prs = gh pr list --repo $Repository --state open --head $branch --json number,url,isDraft,baseRefName,headRefOid | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Unable to inspect pull requests." }
if (-not $prs -or @($prs).Count -eq 0) {
    $helper = Join-Path $PSScriptRoot '07-open-draft-pr-for-work-branch.ps1'
    & $helper -Repository $Repository -BaseBranch $BaseBranch
    $prs = gh pr list --repo $Repository --state open --head $branch --json number,url,isDraft,baseRefName,headRefOid | ConvertFrom-Json
}
$pr = @($prs)[0]
if ($pr.baseRefName -ne $BaseBranch) { throw "Open PR targets '$($pr.baseRefName)', not '$BaseBranch'." }
if ($pr.headRefOid -ne $headSha) { throw "PR head is not the exact local HEAD SHA." }
Write-Host "PR: $($pr.url)"
Write-Host "Head: $headSha"
Write-Host "Base: $baseSha"

if (-not $SkipFullDispatch) {
    Write-Host "Dispatching an explicit FULL BThwani CI proof for this exact branch SHA..."
    Invoke-Native { gh workflow run ci.yml --repo $Repository --ref $branch -f mode=full -f runtime_proof=false } "Unable to dispatch full CI."
    Start-Sleep -Seconds 5
    $runs = gh run list --repo $Repository --workflow ci.yml --branch $branch --event workflow_dispatch --limit 10 --json databaseId,headSha,status,conclusion,url,createdAt | ConvertFrom-Json
    $run = @($runs | Where-Object headSha -eq $headSha | Sort-Object createdAt -Descending | Select-Object -First 1)
    if ($run.Count -eq 0) { throw "Full CI was dispatched but no run bound to HEAD $headSha was found." }
    Write-Host "Full CI: $($run[0].url)"
    Invoke-Native { gh run watch --repo $Repository $run[0].databaseId --exit-status } "Explicit full CI failed."
}

Write-Host "Waiting for SonarQube Cloud + CodeQL + BThwani CI checks on the exact PR HEAD..."
$rows = @(Wait-Required -Sha $headSha -Minutes $WaitMinutes)
Write-Host ""
Write-Host "WORK BRANCH CONTINUOUS PROOF: PASS"
Write-Host "The exact pushed HEAD is current with master and all mandatory quality/security checks are green."
$rows | Format-Table -AutoSize
