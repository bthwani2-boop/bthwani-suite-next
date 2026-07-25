# tools/scripts/google-cloud/enable-firebase-platform.ps1
# Add Firebase resources to the existing central Google Cloud project.
# Dry-run is the default. This script never creates mobile apps, downloads
# google-services.json files, changes EAS, or starts builds.

[CmdletBinding()]
param(
    [ValidatePattern('^[a-z][a-z0-9-]{4,28}[a-z0-9]$')]
    [string] $ProjectId = 'bthwani-platform',

    [string] $FirebaseToolsVersion = '15.24.0',

    [switch] $Login,
    [switch] $Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

function Write-Step {
    param([Parameter(Mandatory)][string] $Message)
    Write-Host "`n== $Message ==" -ForegroundColor Cyan
}

function Invoke-NativeChecked {
    param(
        [Parameter(Mandatory)][string] $Command,
        [Parameter(Mandatory)][string[]] $Arguments,
        [switch] $AllowFailure,
        [switch] $CaptureOnly
    )

    if (-not $CaptureOnly) {
        Write-Host "> $Command $($Arguments -join ' ')" -ForegroundColor DarkGray
    }

    $output = & $Command @Arguments 2>&1
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    $text = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()

    if ($text -and -not $CaptureOnly) {
        Write-Host $text
    }

    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "Command failed with exit code ${exitCode}: $Command $($Arguments -join ' ')`n$text"
    }

    return [pscustomobject]@{
        ExitCode = $exitCode
        Output = $text
    }
}

function Assert-CommandExists {
    param([Parameter(Mandatory)][string] $Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command is not installed or not on PATH: $Name"
    }
}

function Test-FirebaseProjectVisible {
    param([Parameter(Mandatory)][string] $Text)
    return $Text -match "(?m)(^|\s)$([regex]::Escape($ProjectId))(\s|$)"
}

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' BTHWANI FIREBASE PLATFORM ENABLEMENT' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "Project: $ProjectId"
Write-Host "Firebase CLI: $FirebaseToolsVersion"
Write-Host "Mode: $(if ($Apply) { 'APPLY' } else { 'DRY RUN' })"

Assert-CommandExists -Name 'gcloud'
Assert-CommandExists -Name 'pnpm'

Write-Step 'Verify active Google Cloud account and project'
$activeAccount = (Invoke-NativeChecked -Command 'gcloud' -Arguments @(
    'auth', 'list', '--filter=status:ACTIVE', '--format=value(account)'
) -CaptureOnly).Output
if ([string]::IsNullOrWhiteSpace($activeAccount)) {
    throw 'No active gcloud account. Run gcloud auth login first.'
}
Write-Host "Active account: $activeAccount" -ForegroundColor Green

$projectState = (Invoke-NativeChecked -Command 'gcloud' -Arguments @(
    'projects', 'describe', $ProjectId, '--format=value(lifecycleState)'
) -CaptureOnly).Output
if ($projectState -ne 'ACTIVE') {
    throw "Google Cloud project '$ProjectId' is not ACTIVE. State: $projectState"
}
Write-Host "Project state: $projectState" -ForegroundColor Green

$billingEnabled = (Invoke-NativeChecked -Command 'gcloud' -Arguments @(
    'billing', 'projects', 'describe', $ProjectId, '--format=value(billingEnabled)'
) -CaptureOnly).Output
if ($billingEnabled -ne 'True' -and $billingEnabled -ne 'true') {
    throw "Billing is not enabled for '$ProjectId'. Link an active billing account first."
}
Write-Host 'Billing: enabled' -ForegroundColor Green

if ($Login) {
    Write-Step 'Authenticate Firebase CLI'
    [void](Invoke-NativeChecked -Command 'pnpm' -Arguments @(
        'dlx', "firebase-tools@$FirebaseToolsVersion", 'login'
    ))
}

Write-Step 'Verify Firebase CLI login'
$firebaseLogin = Invoke-NativeChecked -Command 'pnpm' -Arguments @(
    'dlx', "firebase-tools@$FirebaseToolsVersion", 'login:list'
) -AllowFailure -CaptureOnly
if ($firebaseLogin.Output -notmatch 'Logged in as') {
    throw "Firebase CLI login is required. Re-run this script with -Login.`n$($firebaseLogin.Output)"
}
Write-Host $firebaseLogin.Output -ForegroundColor Green

Write-Step 'Inspect whether Firebase is already enabled'
$projectsBefore = Invoke-NativeChecked -Command 'pnpm' -Arguments @(
    'dlx', "firebase-tools@$FirebaseToolsVersion", 'projects:list'
) -AllowFailure -CaptureOnly

if (Test-FirebaseProjectVisible -Text $projectsBefore.Output) {
    Write-Host "PASS: Firebase is already enabled for '$ProjectId'." -ForegroundColor Green
    Write-Host 'No Firebase app, EAS variable, credential, workflow, or build was changed.' -ForegroundColor Green
    return
}

if (-not $Apply) {
    Write-Host "`nDRY RUN: Firebase is not currently visible for '$ProjectId'." -ForegroundColor Yellow
    Write-Host 'Planned command:' -ForegroundColor Yellow
    Write-Host "pnpm dlx firebase-tools@$FirebaseToolsVersion projects:addfirebase $ProjectId" -ForegroundColor DarkYellow
    Write-Host '`nThis operation adds Firebase-specific services and configuration to the existing Google Cloud project.' -ForegroundColor Yellow
    Write-Host 'It does not create the four Android apps or modify EAS.' -ForegroundColor Yellow
    Write-Host 'Re-run with -Apply after reviewing the plan.' -ForegroundColor Yellow
    return
}

Write-Step 'Add Firebase to the existing Google Cloud project'
[void](Invoke-NativeChecked -Command 'pnpm' -Arguments @(
    'dlx', "firebase-tools@$FirebaseToolsVersion",
    'projects:addfirebase', $ProjectId
))

Write-Step 'Verify Firebase project visibility'
$projectsAfter = Invoke-NativeChecked -Command 'pnpm' -Arguments @(
    'dlx', "firebase-tools@$FirebaseToolsVersion", 'projects:list'
) -AllowFailure -CaptureOnly
if (-not (Test-FirebaseProjectVisible -Text $projectsAfter.Output)) {
    throw "Firebase enablement command completed, but '$ProjectId' is still not visible. Open Firebase Console once and accept Firebase Terms, then retry."
}

Write-Host "`nPASS: Firebase is enabled for '$ProjectId'." -ForegroundColor Green
Write-Host 'No Firebase Android app, google-services.json file, EAS variable, credential, workflow, or build was changed.' -ForegroundColor Green
Write-Host 'Next controlled phase: bootstrap the four Firebase Android apps.' -ForegroundColor Cyan
