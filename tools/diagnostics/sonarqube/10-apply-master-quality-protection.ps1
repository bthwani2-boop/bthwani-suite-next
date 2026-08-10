#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Repository = "bthwani2-boop/bthwani-suite-next",
    [string]$BaseBranch = "master",
    [string]$RulesetName = "master-protection",
    [int]$WaitMinutes = 30,
    [int]$PrNumber = 0,
    [switch]$RequireHumanApproval
)

$ErrorActionPreference = "Stop"

function Get-NativeText {
    param([scriptblock]$Command,[string]$Failure)
    $lines = @(& $Command)
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) { throw $Failure }
    $text = ($lines -join "`n").Trim()
    if (-not $text) { throw $Failure }
    return $text
}

$root = Get-NativeText -Command { git rev-parse --show-toplevel 2>$null } -Failure "Run from inside the repository."
Set-Location $root
if (git status --porcelain) { throw "Working tree must be clean before protection orchestration." }
$current = Get-NativeText -Command { git branch --show-current } -Failure "Unable to resolve current branch."
if ($current -ne $BaseBranch) { throw "Start this orchestration from '$BaseBranch'. Current branch: '$current'." }
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "gh CLI is required." }
& gh auth status
if ($LASTEXITCODE -ne 0) { throw "GitHub CLI authentication is not ready." }

$dir = $PSScriptRoot
$prepare = Join-Path $dir '05-create-hardening-pr.ps1'
$bootstrap = Join-Path $dir '06-finalize-and-protect-master.ps1'
$verify = Join-Path $dir '09-verify-master-quality-gates.ps1'
$sync = Join-Path $dir '11-sync-master-quality-gates.ps1'
foreach ($path in @($prepare,$bootstrap,$verify,$sync)) {
    if (-not (Test-Path -LiteralPath $path)) { throw "Missing orchestrator dependency: $path" }
}

$rulesets = gh api "repos/$Repository/rulesets" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Unable to inspect repository rulesets." }
$matches = @($rulesets | Where-Object name -eq $RulesetName)
if ($matches.Count -ne 1) { throw "Expected exactly one ruleset named '$RulesetName'; found $($matches.Count)." }

if ($matches[0].enforcement -eq 'active') {
    if ($PrNumber -gt 0) { Write-Warning "-PrNumber is ignored because '$RulesetName' is already active." }
    if ($RequireHumanApproval) {
        throw "Active-ruleset sync does not alter human-review policy. Add an independent reviewer/code owner first and change review policy separately."
    }

    Write-Host "=== ACTIVE PROTECTION MODE: synchronize canonical required checks ==="
    & git pull --ff-only origin $BaseBranch
    if ($LASTEXITCODE -ne 0) { throw "Unable to update local $BaseBranch before synchronization." }

    & $sync -Repository $Repository -BaseBranch $BaseBranch -RulesetName $RulesetName -Apply
    if (-not $?) { throw "Required-check synchronization failed." }

    & $verify -Repository $Repository -BaseBranch $BaseBranch -RulesetName $RulesetName
    if (-not $?) { throw "Post-sync quality-gate verification failed." }

    Write-Host ""
    Write-Host "GITHUB + SONAR MERGE PROTECTION: SYNCHRONIZED"
    exit 0
}

Write-Host "=== BOOTSTRAP MODE: protection is not active yet ==="
if ($PrNumber -gt 0) {
    Write-Host "=== PHASE 1/3: reuse proven readiness PR #$PrNumber ==="
} else {
    Write-Host "=== PHASE 1/3: prove required checks on a Draft PR ==="
    & $prepare -Repository $Repository -BaseBranch $BaseBranch -WaitMinutes $WaitMinutes
    if (-not $?) { throw "Protection-readiness proof failed." }
}

Write-Host "=== PHASE 2/3: bootstrap master protection ==="
$bootstrapArgs = @{
    Repository = $Repository
    BaseBranch = $BaseBranch
    WaitMinutes = $WaitMinutes
}
if ($PrNumber -gt 0) { $bootstrapArgs.PrNumber = $PrNumber }
if ($RequireHumanApproval) { $bootstrapArgs.RequireHumanApproval = $true }
& $bootstrap @bootstrapArgs
if (-not $?) { throw "Protection bootstrap failed." }

Write-Host "=== PHASE 3/3: update and verify protected master ==="
& git switch $BaseBranch
if ($LASTEXITCODE -ne 0) { throw "Unable to switch back to $BaseBranch." }
& git pull --ff-only origin $BaseBranch
if ($LASTEXITCODE -ne 0) { throw "Unable to update local $BaseBranch after protection activation." }
& $verify -Repository $Repository -BaseBranch $BaseBranch -RulesetName $RulesetName
if (-not $?) { throw "Post-bootstrap quality-gate verification failed." }

Write-Host ""
Write-Host "GITHUB + SONAR MERGE PROTECTION: COMPLETE"
