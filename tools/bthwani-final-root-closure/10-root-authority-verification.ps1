[CmdletBinding()]
param([string]$RepoRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
. "$PSScriptRoot\Closure.Common.ps1"
$RepoRoot = Resolve-BthwaniRepoRoot $RepoRoot
Set-Location $RepoRoot
$currentFile = Join-Path $RepoRoot '.diagnostics\final-root-closure\CURRENT.txt'
if (-not (Test-Path $currentFile)) { throw 'Run 00-preflight.ps1 first.' }
$evidenceDir = (Get-Content $currentFile -Raw).Trim()
$state = Get-Content (Join-Path $evidenceDir 'state.json') -Raw | ConvertFrom-Json
$sha = [string]$state.candidateSha
Assert-BranchPinned $RepoRoot 'BB' $sha
Assert-CleanWorktree $RepoRoot
$log = Join-Path $evidenceDir '10-root-authority-verification.log'

Invoke-StrictNative pnpm @('install','--frozen-lockfile') $RepoRoot @{} $log
Invoke-StrictNative pnpm @('run','mobile:apps:check') $RepoRoot @{} $log
Invoke-StrictNative pnpm @('run','mobile:expo:verify') $RepoRoot @{} $log
Invoke-StrictNative node @('--test','tools/scripts/generate-sonar-node-coverage.test.mjs') $RepoRoot @{} $log
Invoke-StrictNative node @('tools/scripts/check-ci-source-immutability.mjs') $RepoRoot @{} $log
Invoke-StrictNative pnpm @('run','guard:required-command-integrity') $RepoRoot @{} $log
Invoke-StrictNative pnpm @('run','guard:governance-all') $RepoRoot @{} $log
Invoke-StrictNative pnpm @('run','verify:full') $RepoRoot @{} $log

$baseSha = [string]$state.baseSha
Invoke-StrictNative node @('tools/scripts/generate-sonar-node-coverage.mjs','--plan') $RepoRoot @{
    CI_BASE_SHA = $baseSha
    CI_HEAD_SHA = $sha
    CI_MODE = 'affected'
} $log

Assert-BranchPinned $RepoRoot 'BB' $sha
Assert-CleanWorktree $RepoRoot
Write-Host 'ROOT_AUTHORITY_VERIFICATION=PASS' -ForegroundColor Green
