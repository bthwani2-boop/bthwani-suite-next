#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Repository = "bthwani2-boop/bthwani-suite-next",
    [string]$BaseBranch = "master",
    [string]$WorkBranch = "chore/github-quality-gate-hardening-20260810",
    [string]$Title = "chore: make GitHub quality gates merge-safe",
    [int]$WaitMinutes = 30
)

$ErrorActionPreference = "Stop"

function Invoke-Native {
    param([scriptblock]$Command,[string]$Failure)
    & $Command
    if ($LASTEXITCODE -ne 0) { throw $Failure }
}
function Get-RepoRoot {
    $root = (& git rev-parse --show-toplevel 2>$null).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $root) { throw "Run from inside the repository." }
    return $root
}
function Get-Checks([string]$Sha) {
    $json = gh api -H "Accept: application/vnd.github+json" "repos/$Repository/commits/$Sha/check-runs?per_page=100"
    if ($LASTEXITCODE -ne 0) { throw "Unable to read GitHub check runs for $Sha." }
    return @(($json | ConvertFrom-Json).check_runs)
}
function Wait-Checks([string]$Sha,[string[]]$Names,[int]$Minutes) {
    $deadline = (Get-Date).AddMinutes($Minutes)
    do {
        $runs = @(Get-Checks $Sha)
        $rows = foreach ($name in $Names) {
            $r = @($runs | Where-Object name -eq $name | Sort-Object started_at -Descending | Select-Object -First 1)
            if ($r.Count -eq 0) { [pscustomobject]@{Name=$name;Status='missing';Conclusion=''} }
            else { [pscustomobject]@{Name=$name;Status=$r[0].status;Conclusion=$r[0].conclusion} }
        }
        $rows | Format-Table -AutoSize
        if (@($rows | Where-Object { $_.Status -ne 'completed' -or $_.Conclusion -ne 'success' }).Count -eq 0) { return }
        Start-Sleep -Seconds 15
    } while ((Get-Date) -lt $deadline)
    throw "Timed out waiting for the future required checks. PR remains open and master protection was NOT changed."
}

$repoRoot = Get-RepoRoot
Set-Location $repoRoot
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "gh CLI is required." }
Invoke-Native { gh auth status } "GitHub CLI authentication is not ready."
$current = (& git branch --show-current).Trim()
if ($current -ne $BaseBranch) { throw "Expected '$BaseBranch', found '$current'." }
if (git status --porcelain) { throw "Working tree must be clean." }
Invoke-Native { git fetch origin $BaseBranch } "git fetch failed."
Invoke-Native { git pull --ff-only origin $BaseBranch } "Local base is not safely fast-forwardable."
if ((& git rev-parse HEAD).Trim() -ne (& git rev-parse "origin/$BaseBranch").Trim()) { throw "Local/remote base mismatch." }

$existing = gh pr list --repo $Repository --state open --head $WorkBranch --json number,url,baseRefName | ConvertFrom-Json
if ($existing -and @($existing).Count -gt 0) { Write-Host "Existing readiness PR: $($existing[0].url)"; exit 0 }
if ((& git ls-remote --heads origin $WorkBranch).Trim()) { throw "Remote hardening branch exists without an open PR." }
Invoke-Native { git switch -c $WorkBranch } "Unable to create hardening branch."

# Required checks must be created for every PR. GitHub documents that a
# required workflow skipped by path filtering can remain Pending forever.
$ciPath = Join-Path $repoRoot ".github\workflows\ci.yml"
if (-not (Test-Path $ciPath)) { throw ".github/workflows/ci.yml is missing." }
$ci = Get-Content $ciPath -Raw
$pattern = '(?ms)(  pull_request:\r?\n    types: \[opened, synchronize, reopened, ready_for_review\]\r?\n    branches: \["\*\*"\]\r?\n)    paths:\r?\n(?:      - .*\r?\n)+(?=  push:)'
$updated = [regex]::Replace($ci, $pattern, '$1')
if ($updated -eq $ci) { throw "Expected PR path filter not found; refusing an unreviewed workflow rewrite." }
Set-Content -LiteralPath $ciPath -Value $updated -Encoding utf8

$diff = git diff -- .github/workflows/ci.yml
if (-not $diff) { throw "No readiness diff produced." }
Write-Host $diff
Invoke-Native { git add -- .github/workflows/ci.yml } "Unable to stage ci.yml."
$staged = @(git diff --cached --name-only)
if ($staged.Count -ne 1 -or $staged[0] -ne '.github/workflows/ci.yml') { throw "Unexpected staged paths: $($staged -join ', ')" }
Invoke-Native { git commit -m "fix(ci): always publish the required PR aggregate check" } "Commit failed."
Invoke-Native { git push -u origin $WorkBranch } "Push failed."

$body = @"
## Purpose
Prepare fail-closed master protection without changing application code or Sonar coverage policy.

- make `BThwani CI result` appear on every pull request
- prove the exact future required checks on a real Draft PR
- do not activate master protection until every check is observed and successful

Coverage/CPD hardening is deliberately a separate PR after master is protected.
"@
Invoke-Native { gh pr create --repo $Repository --draft --base $BaseBranch --head $WorkBranch --title $Title --body $body } "Unable to create readiness Draft PR."
$pr = gh pr view --repo $Repository $WorkBranch --json number,url,headRefOid | ConvertFrom-Json
Write-Host "Draft PR: $($pr.url)"
Write-Host "Head SHA: $($pr.headRefOid)"

$required = @('BThwani CI result','SonarQube Cloud scan','SonarCloud Code Analysis','Analyze go (dsh)','Analyze go (identity)','Analyze go (platform-control)','Analyze go (providers)','Analyze go (wlt)','Analyze go (workforce)','Analyze javascript-typescript')
Wait-Checks -Sha $pr.headRefOid -Names $required -Minutes $WaitMinutes
Write-Host "PROTECTION READINESS: PASS"
Write-Host "Next command: 06-finalize-and-protect-master.ps1 -PrNumber $($pr.number)"
