[CmdletBinding()]
param(
    [string]$RepoRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
    [string]$Serial = ''
)
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
$log = Join-Path $evidenceDir '20-runtime-android-closure.log'

Invoke-StrictNative pwsh @('-NoProfile','-ExecutionPolicy','Bypass','-File','tools/scripts/invoke-runtime-phase.ps1','-Action','bootstrap-dev','-Profiles','identity,workforce,dsh,wlt,financial-simulators,mail,media','-Force') $RepoRoot @{} $log
Invoke-StrictNative pnpm @('run','runtime:full:smoke') $RepoRoot @{} $log
Invoke-StrictNative pwsh @('-NoProfile','-ExecutionPolicy','Bypass','-File','tools/scripts/test-dsh-multisurface-runtime-matrix-v2.ps1') $RepoRoot @{} $log
Invoke-StrictNative pwsh @('-NoProfile','-ExecutionPolicy','Bypass','-File','tools/scripts/verify-mobile-lan-runtime.ps1') $RepoRoot @{} $log

$adb = Get-Command adb.exe -ErrorAction SilentlyContinue
if (-not $adb) { $adb = Get-Command adb -ErrorAction Stop }
$devices = @(& $adb.Source devices | Select-Object -Skip 1 | Where-Object { $_ -match '\sdevice$' })
if (-not $Serial) {
    if ($devices.Count -ne 1) { throw "Android physical evidence requires exactly one ADB device, or pass -Serial. Found=$($devices.Count)" }
    $Serial = ($devices[0] -split '\s+')[0]
}
$launchReceipt = Join-Path $evidenceDir 'android-physical-launch.json'
Invoke-StrictNative pwsh @('-NoProfile','-ExecutionPolicy','Bypass','-File','tools/scripts/verify-mobile-android-smoke.ps1','-App','all','-Serial',$Serial,'-EvidencePath',$launchReceipt) $RepoRoot @{} $log

# L0 launch is never treated as integration. A separate integration receipt is mandatory.
$integrationCandidates = @(
    'tools/scripts/verify-mobile-android-integration.ps1',
    'tools/scripts/verify-mobile-physical-integration.ps1',
    'tools/scripts/verify-mobile-final-closure.ps1'
) | Where-Object { Test-Path -LiteralPath (Join-Path $RepoRoot $_) }
if ($integrationCandidates.Count -eq 0) {
    throw 'ROOT BLOCKER: repository has no discoverable Android physical integration verifier. Do not promote L0 launch to integration. Implement a canonical integration producer that exercises all four apps/auth/Identity/Workforce/DSH/network recovery and writes SHA-bound evidence.'
}
Write-Host "Physical integration verifier candidates: $($integrationCandidates -join ', ')"
Write-Host 'Run the canonical integration verifier and require tier mobile:android:physical-integration before final closure.' -ForegroundColor Yellow

Assert-BranchPinned $RepoRoot 'BB' $sha
Write-Host 'RUNTIME_AND_ANDROID_PARTIAL=PASS; PHYSICAL_INTEGRATION_MUST_BE_PROVEN_SEPARATELY' -ForegroundColor Yellow
