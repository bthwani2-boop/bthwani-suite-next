#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Repository = "bthwani2-boop/bthwani-suite-next",
    [string]$BaseBranch = "master",
    [int]$WaitMinutes = 30,
    [switch]$SkipFullDispatch
)

$ErrorActionPreference = "Stop"

$common = Join-Path $PSScriptRoot 'quality-gate-common.ps1'
if (-not (Test-Path -LiteralPath $common)) { throw "Missing shared quality-gate helper: $common" }
. $common

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

$root = Get-NativeText -Command { git rev-parse --show-toplevel 2>$null } -Failure "Run from inside the repository."
Set-Location $root
$registry = Get-BThwaniQualityGateRegistry -RepoRoot $root
$RequiredNames = @($registry.requiredChecks | ForEach-Object { [string]$_.context })
$ExpectedProducer = @{}
foreach ($item in @($registry.requiredChecks)) { $ExpectedProducer[[string]$item.context] = [string]$item.producer }

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
                [pscustomobject]@{ Name=$name; Status='missing'; Conclusion=''; App=''; IntegrationId=$null; ProducerMatch=$false }
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
            $_.Status -ne 'completed' -or
            $_.Conclusion -ne 'success' -or
            -not $_.ProducerMatch -or
            -not $_.IntegrationId -or
            [int64]$_.IntegrationId -le 0
        })
        if ($bad.Count -eq 0) { return $rows }
        Start-Sleep -Seconds 15
    } while ((Get-Date) -lt $deadline)
    throw "Work-branch proof did not reach green with the expected check producers. Fix failing, missing, or spoofed checks before continuing toward merge."
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "gh CLI is required." }
Invoke-Native { gh auth status } "GitHub CLI authentication is not ready."

$branch = Get-NativeText -Command { git branch --show-current } -Failure "Unable to resolve current branch."
if ($branch -eq $BaseBranch) { throw "This proof is for a work branch, not '$BaseBranch'." }
if (git status --porcelain) { throw "Commit or intentionally discard local changes first. Proof must bind to an immutable pushed SHA." }

Invoke-Native { git fetch origin $BaseBranch } "Unable to fetch current base truth."
$baseSha = Get-NativeText -Command { git rev-parse "origin/$BaseBranch" } -Failure "Unable to resolve origin/$BaseBranch."
$headSha = Get-NativeText -Command { git rev-parse HEAD } -Failure "Unable to resolve local HEAD."
$mergeBase = Get-NativeText -Command { git merge-base HEAD "origin/$BaseBranch" } -Failure "Unable to resolve merge-base."
if ($mergeBase -ne $baseSha) {
    throw "Work branch is behind current $BaseBranch. Merge/rebase origin/$BaseBranch, resolve conflicts, retest, then rerun this proof."
}

$remoteLine = Get-NativeText -Command { git ls-remote --heads origin $branch } -Failure "Unable to inspect remote work branch." -AllowEmpty
if (-not $remoteLine) {
    Invoke-Native { git push -u origin $branch } "Unable to publish work branch '$branch'."
} else {
    $remoteSha = ($remoteLine -split '\s+')[0]
    if ($remoteSha -ne $headSha) {
        Invoke-Native { git push origin "HEAD:$branch" } "Unable to publish exact work-branch HEAD."
    }
}
$remoteLine = Get-NativeText -Command { git ls-remote --heads origin $branch } -Failure "Unable to re-read remote work branch."
$remoteHead = ($remoteLine -split '\s+')[0]
if ($remoteHead -ne $headSha) { throw "Remote branch does not resolve to local HEAD after push." }

$prs = gh pr list --repo $Repository --state open --head $branch --json number,url,isDraft,baseRefName,headRefOid | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Unable to inspect pull requests." }
if (-not $prs -or @($prs).Count -eq 0) {
    $helper = Join-Path $PSScriptRoot '07-open-draft-pr-for-work-branch.ps1'
    & $helper -Repository $Repository -BaseBranch $BaseBranch
    if (-not $?) { throw "Draft PR helper failed." }
    $prs = gh pr list --repo $Repository --state open --head $branch --json number,url,isDraft,baseRefName,headRefOid | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw "Unable to re-read pull request after Draft PR creation." }
}
if (@($prs).Count -ne 1) { throw "Expected exactly one open PR for '$branch'; found $(@($prs).Count)." }
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
    if ($LASTEXITCODE -ne 0) { throw "Unable to discover the explicit full CI run." }
    $run = @($runs | Where-Object headSha -eq $headSha | Sort-Object createdAt -Descending | Select-Object -First 1)
    if ($run.Count -eq 0) { throw "Full CI was dispatched but no run bound to HEAD $headSha was found." }
    Write-Host "Full CI: $($run[0].url)"
    Invoke-Native { gh run watch --repo $Repository $run[0].databaseId --exit-status } "Explicit full CI failed."
}

Write-Host "Waiting for every registry-defined quality/security check on the exact PR HEAD..."
$rows = @(Wait-Required -Sha $headSha -Minutes $WaitMinutes)
Write-Host ""
Write-Host "WORK BRANCH CONTINUOUS PROOF: PASS"
Write-Host "The exact pushed HEAD is current with master and every registry-defined mandatory check is green from its expected producer."
$rows | Format-Table -AutoSize | Out-Host
