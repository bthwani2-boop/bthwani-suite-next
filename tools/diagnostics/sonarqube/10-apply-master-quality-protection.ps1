#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Repository = "bthwani2-boop/bthwani-suite-next",
    [string]$BaseBranch = "master",
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

$dir = $PSScriptRoot
$prepare = Join-Path $dir '05-create-hardening-pr.ps1'
$protect = Join-Path $dir '06-finalize-and-protect-master.ps1'
$verify = Join-Path $dir '09-verify-master-quality-gates.ps1'
foreach ($p in @($prepare,$protect,$verify)) { if (-not (Test-Path $p)) { throw "Missing orchestrator dependency: $p" } }

if ($PrNumber -gt 0) {
    Write-Host "=== PHASE 1/3: reuse previously proven readiness PR #$PrNumber ==="
    Write-Host "Skipping new Draft PR creation; 06 will verify the current master checks before mutating the ruleset."
} else {
    Write-Host "=== PHASE 1/3: prove future required checks on a real Draft PR ==="
    & $prepare -Repository $Repository -BaseBranch $BaseBranch -WaitMinutes $WaitMinutes
}

Write-Host "=== PHASE 2/3: activate master ruleset from proven check inventory ==="
$protectArgs = @{
    Repository = $Repository
    BaseBranch = $BaseBranch
    WaitMinutes = $WaitMinutes
}
if ($PrNumber -gt 0) { $protectArgs.PrNumber = $PrNumber }
if ($RequireHumanApproval) { $protectArgs.RequireHumanApproval = $true }
& $protect @protectArgs

Write-Host "=== PHASE 3/3: update local master and independently verify protection ==="
& git switch $BaseBranch
if ($LASTEXITCODE -ne 0) { throw "Unable to switch back to $BaseBranch." }
& git pull --ff-only origin $BaseBranch
if ($LASTEXITCODE -ne 0) { throw "Unable to update local $BaseBranch after protection activation." }
& $verify -Repository $Repository -BaseBranch $BaseBranch

Write-Host ""
Write-Host "GITHUB + SONAR MERGE PROTECTION: COMPLETE"
Write-Host "Next stage is Sonar coverage/duplication hardening in a separate protected PR."
