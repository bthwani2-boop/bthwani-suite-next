#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Repository = "bthwani2-boop/bthwani-suite-next",
    [string]$BaseBranch = "master",
    [string]$WorkBranch = "chore/sonarqube-github-hardening-20260810",
    [string]$Title = "chore: harden SonarQube and GitHub quality gates",
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
    return (($json | ConvertFrom-Json).check_runs)
}

function Wait-Checks([string]$Sha,[string[]]$Names,[int]$Minutes) {
    $deadline = (Get-Date).AddMinutes($Minutes)
    do {
        $runs = @(Get-Checks $Sha)
        $rows = foreach ($name in $Names) {
            $r = @($runs | Where-Object name -eq $name | Sort-Object started_at -Descending | Select-Object -First 1)
            if ($r.Count -eq 0) {
                [pscustomobject]@{ Name=$name; Status='missing'; Conclusion='' }
            } else {
                [pscustomobject]@{ Name=$name; Status=$r[0].status; Conclusion=$r[0].conclusion }
            }
        }
        $rows | Format-Table -AutoSize
        $bad = @($rows | Where-Object { $_.Status -ne 'completed' -or $_.Conclusion -ne 'success' })
        if ($bad.Count -eq 0) { return }
        Start-Sleep -Seconds 15
    } while ((Get-Date) -lt $deadline)
    throw "Timed out waiting for required PR checks. The hardening PR was left open and master protection was NOT changed."
}

$repoRoot = Get-RepoRoot
Set-Location $repoRoot

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "gh CLI is required." }
Invoke-Native { gh auth status } "GitHub CLI authentication is not ready."

$current = (& git branch --show-current).Trim()
if ($current -ne $BaseBranch) { throw "Expected current branch '$BaseBranch', found '$current'." }
if (git status --porcelain) { throw "Working tree must be clean before hardening." }

Invoke-Native { git fetch origin $BaseBranch } "git fetch failed."
Invoke-Native { git pull --ff-only origin $BaseBranch } "Local $BaseBranch is not safely fast-forwardable."

$remoteBase = (& git rev-parse "origin/$BaseBranch").Trim()
$localBase = (& git rev-parse HEAD).Trim()
if ($remoteBase -ne $localBase) { throw "Local and remote $BaseBranch differ." }

$existing = gh pr list --repo $Repository --state open --head $WorkBranch --json number,url,headRefName,baseRefName,isDraft 2>$null | ConvertFrom-Json
if ($existing -and @($existing).Count -gt 0) {
    Write-Host "Existing hardening PR found: $($existing[0].url)"
    exit 0
}

$remoteBranch = (& git ls-remote --heads origin $WorkBranch).Trim()
if ($remoteBranch) { throw "Remote branch '$WorkBranch' already exists without an open PR. Resolve it manually before continuing." }

Invoke-Native { git switch -c $WorkBranch } "Unable to create hardening branch."

$propsPath = Join-Path $repoRoot "sonar-project.properties"
if (-not (Test-Path $propsPath)) { throw "sonar-project.properties is missing." }
$raw = Get-Content $propsPath -Raw

if ($raw -notmatch '(?m)^sonar\.coverage\.exclusions=\*\*/\*$') {
    throw "Expected global coverage exclusion was not found; refusing an unreviewed rewrite."
}
if ($raw -notmatch '(?m)^sonar\.cpd\.exclusions=\*\*/\*$') {
    throw "Expected global CPD exclusion was not found; refusing an unreviewed rewrite."
}

$raw = [regex]::Replace($raw, '(?ms)# The repository''s executable verification is heterogeneous.*?sonar\.coverage\.exclusions=\*\*/\*\r?\n', '')
$raw = [regex]::Replace($raw, '(?ms)# Duplicate detection is not meaningful.*?sonar\.cpd\.exclusions=\*\*/\*\r?\n', '')

$anchor = 'sonar.go.coverage.reportPaths=**/.sonar/coverage.out'
if (-not $raw.Contains($anchor)) { throw "Go coverage report configuration is missing." }
$replacement = @"
$anchor
# Coverage and duplication are intentionally measured. Do not globally exclude
# source files from these metrics; use only narrow, justified exclusions when
# a generated or non-executable artifact genuinely requires one.
"@.TrimEnd()
$raw = $raw.Replace($anchor, $replacement)
Set-Content -LiteralPath $propsPath -Value $raw -Encoding utf8

Invoke-Native { pnpm run diagnostics:sonarqube:config } "Repository Sonar configuration diagnostic failed after the edit."

$diff = git diff -- sonar-project.properties
if (-not $diff) { throw "No hardening diff was produced." }
Write-Host $diff

Invoke-Native { git add -- sonar-project.properties } "Unable to stage sonar-project.properties."
$staged = git diff --cached --name-only
if (@($staged) -ne 'sonar-project.properties') { throw "Unexpected staged paths detected: $($staged -join ', ')" }
Invoke-Native { git commit -m "fix(sonar): enable real coverage and duplication metrics" } "Commit failed."
Invoke-Native { git push -u origin $WorkBranch } "Push failed."

$body = @"
## Purpose

Harden SonarQube Cloud analysis without changing application behavior.

- remove repository-wide coverage suppression
- remove repository-wide duplication suppression
- keep Go coverage report import enabled
- use this PR as the live proof that SonarQube Cloud, CodeQL and BThwani CI all decorate a work branch before master protection is activated

This PR must not be merged unless all required automated checks are present and successful.
"@

Invoke-Native { gh pr create --repo $Repository --draft --base $BaseBranch --head $WorkBranch --title $Title --body $body } "Unable to create hardening Draft PR."

$pr = gh pr view --repo $Repository $WorkBranch --json number,url,headRefOid,isDraft,baseRefName | ConvertFrom-Json
Write-Host "Draft PR: $($pr.url)"
Write-Host "Head SHA: $($pr.headRefOid)"

$required = @(
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

Write-Host "Waiting for live PR proof of every future required check..."
Wait-Checks -Sha $pr.headRefOid -Names $required -Minutes $WaitMinutes
Write-Host ""
Write-Host "HARDENING PR PROOF: PASS"
Write-Host "All future required checks are present and successful on the Draft PR."
Write-Host "Next: run 06-finalize-and-protect-master.ps1 -PrNumber $($pr.number)"
