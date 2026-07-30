# tools/scripts/google-cloud/enable-firebase-platform.ps1
# Add Firebase resources to the existing central Google Cloud project.
# Dry-run is the default. This script never creates mobile apps, downloads
# google-services.json files, changes EAS, or starts builds.

[CmdletBinding()]
param(
    [ValidatePattern('^[a-z][a-z0-9-]{4,28}[a-z0-9]$')]
    [string] $ProjectId = 'bthwani-platform',

    [string] $FirebaseToolsVersion = '15.24.0',

    [ValidateRange(1, 20)]
    [int] $VerificationAttempts = 8,

    [ValidateRange(1, 30)]
    [int] $VerificationDelaySeconds = 5,

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

function ConvertFrom-FirebaseCliJson {
    param([Parameter(Mandatory)][string] $Text)

    $firstBrace = $Text.IndexOf('{')
    $lastBrace = $Text.LastIndexOf('}')
    if ($firstBrace -lt 0 -or $lastBrace -lt $firstBrace) {
        return $null
    }

    $jsonText = $Text.Substring($firstBrace, $lastBrace - $firstBrace + 1)
    try {
        return $jsonText | ConvertFrom-Json -Depth 100
    } catch {
        return $null
    }
}

function Test-FirebaseProjectInList {
    $result = Invoke-NativeChecked -Command 'pnpm' -Arguments @(
        'dlx', "firebase-tools@$FirebaseToolsVersion",
        'projects:list', '--json', '--non-interactive'
    ) -AllowFailure -CaptureOnly

    if ($result.ExitCode -ne 0) {
        return $false
    }

    $payload = ConvertFrom-FirebaseCliJson -Text $result.Output
    if ($null -eq $payload -or [string]$payload.status -ne 'success') {
        return $false
    }

    foreach ($project in @($payload.result)) {
        if ([string]$project.projectId -eq $ProjectId) {
            return $true
        }
    }

    return $false
}

function Test-FirebaseProjectDirectly {
    $result = Invoke-NativeChecked -Command 'pnpm' -Arguments @(
        'dlx', "firebase-tools@$FirebaseToolsVersion",
        'apps:list', '--project', $ProjectId,
        '--json', '--non-interactive'
    ) -AllowFailure -CaptureOnly

    if ($result.ExitCode -ne 0) {
        return $false
    }

    $payload = ConvertFrom-FirebaseCliJson -Text $result.Output
    return $null -ne $payload -and [string]$payload.status -eq 'success'
}

function Test-FirebaseProjectVisible {
    return (Test-FirebaseProjectInList) -or (Test-FirebaseProjectDirectly)
}

function Wait-FirebaseProjectVisible {
    param(
        [Parameter(Mandatory)][int] $Attempts,
        [Parameter(Mandatory)][int] $DelaySeconds
    )

    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        if (Test-FirebaseProjectVisible) {
            return $true
        }

        if ($attempt -lt $Attempts) {
            Write-Host "Firebase visibility is still propagating (attempt $attempt/$Attempts). Retrying in $DelaySeconds seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds $DelaySeconds
        }
    }

    return $false
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
if (Test-FirebaseProjectVisible) {
    Write-Host "PASS: Firebase is already enabled for '$ProjectId'." -ForegroundColor Green
    Write-Host 'No Firebase app, EAS variable, credential, workflow, or build was changed.' -ForegroundColor Green
    return
}

if (-not $Apply) {
    Write-Host "`nDRY RUN: Firebase is not currently visible for '$ProjectId'." -ForegroundColor Yellow
    Write-Host 'Planned command:' -ForegroundColor Yellow
    Write-Host "pnpm dlx firebase-tools@$FirebaseToolsVersion projects:addfirebase $ProjectId" -ForegroundColor DarkYellow
    Write-Host "`nThis operation adds Firebase-specific services and configuration to the existing Google Cloud project." -ForegroundColor Yellow
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
if (-not (Wait-FirebaseProjectVisible -Attempts $VerificationAttempts -DelaySeconds $VerificationDelaySeconds)) {
    throw "Firebase enablement command completed, but '$ProjectId' could not yet be verified after $VerificationAttempts attempts. The addFirebase operation may still be propagating. Run this phase again without -Apply after a short wait."
}

Write-Host "`nPASS: Firebase is enabled for '$ProjectId'." -ForegroundColor Green
Write-Host 'No Firebase Android app, google-services.json file, EAS variable, credential, workflow, or build was changed.' -ForegroundColor Green
Write-Host 'Next controlled phase: bootstrap the four Firebase Android apps.' -ForegroundColor Cyan
