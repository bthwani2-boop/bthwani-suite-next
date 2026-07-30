# tools/scripts/google-cloud/bootstrap-firebase-android-apps.ps1
# Safe wrapper that pins the four Android Firebase apps to bthwani-platform.
# Dry-run is the default. Pass -Apply only after reviewing the plan.

[CmdletBinding()]
param(
    [string] $SecretsRoot = 'C:\bthwani-secrets\firebase',
    [string] $FirebaseToolsVersion = '15.24.0',
    [switch] $Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir '..\..\..')).Path
$BootstrapScript = Join-Path $RepoRoot 'tools\scripts\bootstrap-mobile-firebase-development.ps1'

if (-not (Test-Path -LiteralPath $BootstrapScript -PathType Leaf)) {
    throw "Firebase mobile bootstrap script was not found: $BootstrapScript"
}

$arguments = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $BootstrapScript,
    '-ProjectId', 'bthwani-platform',
    '-SecretsRoot', $SecretsRoot,
    '-FirebaseToolsVersion', $FirebaseToolsVersion
)

if ($Apply) {
    $arguments += '-Apply'
}

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' BTHWANI FIREBASE ANDROID APPS WRAPPER' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host 'Firebase project: bthwani-platform'
Write-Host "Mode: $(if ($Apply) { 'APPLY' } else { 'DRY RUN' })"
Write-Host "Secrets root: $SecretsRoot`n"

& pwsh @arguments
if ($LASTEXITCODE -ne 0) {
    throw "Firebase Android app bootstrap failed with exit code $LASTEXITCODE."
}
