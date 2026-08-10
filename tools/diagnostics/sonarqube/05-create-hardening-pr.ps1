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
function Get-NativeText {
    param([scriptblock]$Command,[string]$Failure,[switch]$AllowEmpty)
    $lines = @(& $Command)
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) { throw $Failure }
    $text = ($lines -join "`n").Trim()
    if (-not $AllowEmpty -and -not $text) { throw $Failure }
    return $text
}
function Get-RepoRoot {
    Get-NativeText -Command { git rev-parse --show-toplevel 2>$null } -Failure "Run from inside the repository."
}
function Get-Checks([string]$Sha) {
    $json = gh api -H "Accept: application/vnd.github+json" "repos/$Repository/commits/$Sha/check-runs?per_page=100"
    if ($LASTEXITCODE -ne 0) { throw "Unable to read GitHub check runs for $Sha." }
    @((($json | ConvertFrom-Json).check_runs))
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

$current = Get-NativeText -Command { git branch --show-current } -Failure "Unable to resolve current branch."
if ($current -ne $BaseBranch) { throw "Expected '$BaseBranch', found '$current'. Stop the previous run, switch to $BaseBranch, and rerun." }
if (git status --porcelain) { throw "Working tree must be clean before hardening." }

Invoke-Native { git fetch origin $BaseBranch $WorkBranch 2>$null } "Unable to fetch current branch truth."
Invoke-Native { git pull --ff-only origin $BaseBranch } "Local base is not safely fast-forwardable."
$baseSha = Get-NativeText -Command { git rev-parse "origin/$BaseBranch" } -Failure "Unable to resolve origin/$BaseBranch."
$localBase = Get-NativeText -Command { git rev-parse HEAD } -Failure "Unable to resolve local base HEAD."
if ($localBase -ne $baseSha) { throw "Local and remote $BaseBranch differ." }

$existing = gh pr list --repo $Repository --state open --head $WorkBranch --base $BaseBranch --json number,url,baseRefName,headRefOid | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Unable to inspect existing readiness PRs." }
if ($existing -and @($existing).Count -gt 0) {
    $pr = @($existing)[0]
    Write-Host "Existing readiness PR: $($pr.url)"
    $required = @('BThwani CI result','SonarQube Cloud scan','SonarCloud Code Analysis','Analyze go (dsh)','Analyze go (identity)','Analyze go (platform-control)','Analyze go (providers)','Analyze go (wlt)','Analyze go (workforce)','Analyze javascript-typescript')
    Wait-Checks -Sha $pr.headRefOid -Names $required -Minutes $WaitMinutes
    Write-Host "PROTECTION READINESS: PASS"
    return
}

# The interrupted first run may already have published the work branch at the
# exact base SHA. That state is safe and resumable. Any divergent remote branch
# is rejected to avoid overwriting concurrent work.
$remoteLine = Get-NativeText -Command { git ls-remote --heads origin $WorkBranch } -Failure "Unable to inspect remote hardening branch." -AllowEmpty
if ($remoteLine) {
    $remoteWorkSha = ($remoteLine -split '\s+')[0]
    if ($remoteWorkSha -ne $baseSha) {
        throw "Remote '$WorkBranch' exists at $remoteWorkSha, not current base $baseSha. Refusing to overwrite it."
    }
    Write-Host "Reusing safe remote hardening branch at base SHA $remoteWorkSha"
}

$localLine = Get-NativeText -Command { git branch --list $WorkBranch } -Failure "Unable to inspect local hardening branch." -AllowEmpty
if ($localLine) {
    $localWorkSha = Get-NativeText -Command { git rev-parse $WorkBranch } -Failure "Unable to resolve local hardening branch."
    if ($localWorkSha -ne $baseSha) {
        throw "Local '$WorkBranch' exists at $localWorkSha, not current base $baseSha. Refusing to overwrite it."
    }
    Invoke-Native { git switch $WorkBranch } "Unable to switch to existing local hardening branch."
} else {
    Invoke-Native { git switch -c $WorkBranch } "Unable to create hardening branch."
}

$ciPath = Join-Path $repoRoot ".github\workflows\ci.yml"
if (-not (Test-Path $ciPath)) { throw ".github/workflows/ci.yml is missing." }
Write-Host "Preparing CI pull_request trigger..."
$inputLines = @(Get-Content -LiteralPath $ciPath)
$outputLines = New-Object System.Collections.Generic.List[string]
$insidePr = $false
$skipPaths = $false
$pathsBlocks = 0
foreach ($line in $inputLines) {
    if ($line -match '^  pull_request:\s*$') {
        $insidePr = $true
        $skipPaths = $false
        $outputLines.Add($line)
        continue
    }
    if ($insidePr -and $line -match '^  push:\s*$') {
        $insidePr = $false
        $skipPaths = $false
        $outputLines.Add($line)
        continue
    }
    if ($insidePr -and $line -match '^    paths:\s*$') {
        $pathsBlocks++
        $skipPaths = $true
        continue
    }
    if ($insidePr -and $skipPaths) {
        if ($line -match '^      - ') { continue }
        $skipPaths = $false
    }
    $outputLines.Add($line)
}
if ($pathsBlocks -ne 1) { throw "Expected exactly one pull_request paths block; found $pathsBlocks." }
Set-Content -LiteralPath $ciPath -Value $outputLines -Encoding utf8
Write-Host "CI trigger transformation complete."

$diff = @(git diff -- .github/workflows/ci.yml)
if ($LASTEXITCODE -ne 0 -or $diff.Count -eq 0) { throw "No valid readiness diff produced." }
$diff | ForEach-Object { Write-Host $_ }
Invoke-Native { git add -- .github/workflows/ci.yml } "Unable to stage ci.yml."
$staged = @(git diff --cached --name-only)
if ($staged.Count -ne 1 -or $staged[0] -ne '.github/workflows/ci.yml') { throw "Unexpected staged paths: $($staged -join ', ')" }
Invoke-Native { git commit -m "fix(ci): always publish the required PR aggregate check" } "Commit failed."
Write-Host "Publishing hardening commit..."
Invoke-Native { git push -u origin $WorkBranch } "Push failed."

$body = @"
## Purpose
Prepare fail-closed master protection without changing application code or Sonar coverage policy.

- make BThwani CI result appear on every pull request
- prove the exact future required checks on a real Draft PR
- do not activate master protection until every check is observed and successful

Coverage/CPD hardening is deliberately a separate PR after master is protected.
"@
Invoke-Native { gh pr create --repo $Repository --draft --base $BaseBranch --head $WorkBranch --title $Title --body $body } "Unable to create readiness Draft PR."
$pr = gh pr view --repo $Repository $WorkBranch --json number,url,headRefOid | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $pr) { throw "Draft PR was created but could not be re-read." }
Write-Host "Draft PR: $($pr.url)"
Write-Host "Head SHA: $($pr.headRefOid)"

$required = @('BThwani CI result','SonarQube Cloud scan','SonarCloud Code Analysis','Analyze go (dsh)','Analyze go (identity)','Analyze go (platform-control)','Analyze go (providers)','Analyze go (wlt)','Analyze go (workforce)','Analyze javascript-typescript')
Wait-Checks -Sha $pr.headRefOid -Names $required -Minutes $WaitMinutes
Write-Host "PROTECTION READINESS: PASS"
Write-Host "Next: 06-finalize-and-protect-master.ps1 -PrNumber $($pr.number)"
