#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Repository = "bthwani2-boop/bthwani-suite-next",
    [string]$BaseBranch = "master",
    [int]$WaitMinutes = 30,
    [switch]$RequireHumanApproval
)

$ErrorActionPreference = "Stop"
$root = (& git rev-parse --show-toplevel 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or -not $root) { throw "Run from inside the repository." }
Set-Location $root

if (git status --porcelain) { throw "Working tree must be clean before protection orchestration." }
$current = (& git branch --show-current).Trim()
if ($current -ne $BaseBranch) { throw "Start this orchestration from '$BaseBranch'. Current branch: '$current'." }

$dir = $PSScriptRoot
$prepare = Join-Path $dir '05-create-hardening-pr.ps1'
$protect = Join-Path $dir '06-finalize-and-protect-master.ps1'
$verify = Join-Path $dir '09-verify-master-quality-gates.ps1'
foreach ($p in @($prepare,$protect,$verify)) { if (-not (Test-Path $p)) { throw "Missing orchestrator dependency: $p" } }

Write-Host "=== PHASE 1/3: prove future required checks on a real Draft PR ==="
& $prepare -Repository $Repository -BaseBranch $BaseBranch -WaitMinutes $WaitMinutes

Write-Host "=== PHASE 2/3: merge proven readiness change and activate master ruleset ==="
if ($RequireHumanApproval) {
    & $protect -Repository $Repository -BaseBranch $BaseBranch -WaitMinutes $WaitMinutes -RequireHumanApproval
} else {
    & $protect -Repository $Repository -BaseBranch $BaseBranch -WaitMinutes $WaitMinutes
}

Write-Host "=== PHASE 3/3: update local master and independently verify protection ==="
& git switch $BaseBranch
if ($LASTEXITCODE -ne 0) { throw "Unable to switch back to $BaseBranch." }
& git pull --ff-only origin $BaseBranch
if ($LASTEXITCODE -ne 0) { throw "Unable to update local $BaseBranch after protection activation." }
& $verify -Repository $Repository -BaseBranch $BaseBranch

Write-Host ""
Write-Host "GITHUB + SONAR MERGE PROTECTION: COMPLETE"
Write-Host "Next stage is Sonar coverage/duplication hardening in a separate protected PR."
