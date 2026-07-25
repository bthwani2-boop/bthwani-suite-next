# tools/scripts/google-cloud/prepare-google-platform-all-surfaces.ps1
# Governed all-surface orchestration for Firebase and Google Maps.
# No single-app mode exists by design: Firebase and Maps readiness is evaluated
# for all four mobile apps and the control panel together.

[CmdletBinding()]
param(
    [ValidateSet(
        'Plan',
        'EnableFirebase',
        'BootstrapFirebaseApps',
        'UploadFirebaseToEas',
        'CreateMapsKeys',
        'Preflight',
        'All'
    )]
    [string] $Phase = 'Plan',

    [string] $InputPath,

    [switch] $Login,
    [switch] $Apply,
    [switch] $UploadMapsToEas
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir '..\..\..')).Path
$PlatformManifestPath = Join-Path $RepoRoot 'tools\mobile\google-platform.manifest.json'
$MobileManifestPath = Join-Path $RepoRoot 'tools\mobile\mobile-apps.manifest.json'
$EnableFirebaseScript = Join-Path $ScriptDir 'enable-firebase-platform.ps1'
$BootstrapFirebaseAppsScript = Join-Path $ScriptDir 'bootstrap-firebase-android-apps.ps1'
$SetupFirebaseEasScript = Join-Path $RepoRoot 'tools\scripts\setup-mobile-firebase-development.ps1'
$CreateAndroidMapsKeyScript = Join-Path $ScriptDir 'create-android-maps-api-key.ps1'
$CreateBrowserMapsKeyScript = Join-Path $ScriptDir 'create-browser-maps-api-key.ps1'
$PreflightScript = Join-Path $RepoRoot 'tools\scripts\guard-google-platform-prebuild.mjs'
$DefaultInputPath = Join-Path $ScriptDir 'google-platform-input.local.json'
$ExampleInputPath = Join-Path $ScriptDir 'google-platform-input.example.json'
$MobileEnvPath = Join-Path $RepoRoot 'infra\local\mobile.env'
$ControlPanelEnvPath = Join-Path $RepoRoot 'infra\local\control-panel.google.env'

if ([string]::IsNullOrWhiteSpace($InputPath)) {
    $InputPath = $DefaultInputPath
}

function Write-Step {
    param([Parameter(Mandatory)][string] $Message)
    Write-Host "`n== $Message ==" -ForegroundColor Cyan
}

function Assert-File {
    param([Parameter(Mandatory)][string] $Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required file is missing: $Path"
    }
}

function Invoke-ChildPowerShell {
    param(
        [Parameter(Mandatory)][string] $File,
        [Parameter(Mandatory)][string[]] $Arguments
    )

    Write-Host "> pwsh -NoProfile -ExecutionPolicy Bypass -File $File $($Arguments -join ' ')" -ForegroundColor DarkGray
    & pwsh -NoProfile -ExecutionPolicy Bypass -File $File @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Child script failed with exit code ${LASTEXITCODE}: $File"
    }
}

function Invoke-NodeChecked {
    param(
        [Parameter(Mandatory)][string] $File,
        [Parameter(Mandatory)][string[]] $Arguments
    )

    Write-Host "> node $File $($Arguments -join ' ')" -ForegroundColor DarkGray
    & node $File @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Node preflight failed with exit code ${LASTEXITCODE}: $File"
    }
}

function Read-JsonFile {
    param([Parameter(Mandatory)][string] $Path)
    Assert-File -Path $Path
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -Depth 100
}

function Assert-CloudState {
    param(
        [Parameter(Mandatory)][string] $ProjectId,
        [Parameter(Mandatory)][string] $BillingAccountId
    )

    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        throw 'gcloud CLI is required and must be available on PATH.'
    }

    $account = (& gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($account)) {
        throw 'No active gcloud account. Run gcloud auth login.'
    }

    $state = (& gcloud projects describe $ProjectId --format='value(lifecycleState)' 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $state -ne 'ACTIVE') {
        throw "Google Cloud project '$ProjectId' is not ACTIVE."
    }

    $billing = (& gcloud billing projects describe $ProjectId --format='value(billingAccountName,billingEnabled)' 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $billing -notmatch [regex]::Escape($BillingAccountId) -or $billing -notmatch '(?i)true') {
        throw "Project '$ProjectId' is not linked to active billing account '$BillingAccountId'."
    }

    Write-Host "Active account: $account" -ForegroundColor Green
    Write-Host "Project:        $ProjectId / $state" -ForegroundColor Green
    Write-Host "Billing:        $billing" -ForegroundColor Green
}

function Assert-InputCoversAllApps {
    param(
        [Parameter(Mandatory)] $Input,
        [Parameter(Mandatory)] $MobileManifest,
        [Parameter(Mandatory)][string[]] $ExpectedApps
    )

    foreach ($appKey in $ExpectedApps) {
        $entry = $Input.apps.PSObject.Properties[$appKey]
        if ($null -eq $entry) {
            throw "Local input does not define '$appKey'. Copy and complete: $ExampleInputPath"
        }
        $value = $entry.Value
        $expectedPackage = [string]$MobileManifest.apps.$appKey.androidPackage
        if ([string]$value.packageName -ne $expectedPackage) {
            throw "$appKey package mismatch. Expected '$expectedPackage'."
        }
        $sha = [string]$value.sha1Fingerprint
        if ($sha -notmatch '^([A-Fa-f0-9]{2}:){19}[A-Fa-f0-9]{2}$') {
            throw "$appKey has an invalid SHA-1 fingerprint."
        }
        if ($sha -match '^(AA:){19}AA$|^(BB:){19}BB$|^(CC:){19}CC$|^(DD:){19}DD$') {
            throw "$appKey still contains the example SHA-1 placeholder."
        }
        if ([string]::IsNullOrWhiteSpace([string]$value.mapsKeyDisplayName)) {
            throw "$appKey mapsKeyDisplayName is required."
        }
    }

    if ($null -eq $Input.controlPanel) {
        throw 'Local input must define controlPanel.'
    }
    if ([string]::IsNullOrWhiteSpace([string]$Input.controlPanel.mapsKeyDisplayName)) {
        throw 'controlPanel.mapsKeyDisplayName is required.'
    }
    $referrers = @($Input.controlPanel.allowedReferrers)
    if ($referrers.Count -eq 0) {
        throw 'controlPanel.allowedReferrers must contain at least one referrer.'
    }
}

function Invoke-EnableFirebasePhase {
    param([Parameter(Mandatory)][string] $ProjectId)
    $arguments = @('-ProjectId', $ProjectId)
    if ($Login) { $arguments += '-Login' }
    if ($Apply) { $arguments += '-Apply' }
    Invoke-ChildPowerShell -File $EnableFirebaseScript -Arguments $arguments
}

function Invoke-BootstrapFirebaseAppsPhase {
    $arguments = @()
    if ($Apply) { $arguments += '-Apply' }
    Invoke-ChildPowerShell -File $BootstrapFirebaseAppsScript -Arguments $arguments
}

function Invoke-UploadFirebaseToEasPhase {
    $arguments = @()
    if ($Apply) { $arguments += '-Apply' }
    Invoke-ChildPowerShell -File $SetupFirebaseEasScript -Arguments $arguments
}

function Invoke-CreateMapsKeysPhase {
    param(
        [Parameter(Mandatory)] $PlatformManifest,
        [Parameter(Mandatory)] $MobileManifest
    )

    $resolvedInputPath = [System.IO.Path]::GetFullPath($InputPath)
    if (-not (Test-Path -LiteralPath $resolvedInputPath -PathType Leaf)) {
        throw "Create the ignored local input first:`nCopy-Item '$ExampleInputPath' '$DefaultInputPath'`nThen replace all four SHA-1 placeholders."
    }
    $input = Read-JsonFile -Path $resolvedInputPath
    $expectedApps = @($PlatformManifest.maps.androidApps)
    Assert-InputCoversAllApps -Input $input -MobileManifest $MobileManifest -ExpectedApps $expectedApps

    foreach ($appKey in $expectedApps) {
        $entry = $input.apps.$appKey
        $arguments = @(
            '-ProjectId', [string]$PlatformManifest.projectId,
            '-AppKey', [string]$appKey,
            '-PackageName', [string]$entry.packageName,
            '-Sha1Fingerprint', [string]$entry.sha1Fingerprint,
            '-DisplayName', [string]$entry.mapsKeyDisplayName
        )
        if (-not $Apply) {
            $arguments += '-DryRun'
        } else {
            $arguments += @('-WriteEnvironmentFile', $MobileEnvPath)
        }
        if ($Apply -and $UploadMapsToEas) { $arguments += '-UploadToEas' }
        Invoke-ChildPowerShell -File $CreateAndroidMapsKeyScript -Arguments $arguments
    }

    $browserArguments = @(
        '-ProjectId', [string]$PlatformManifest.projectId,
        '-DisplayName', [string]$input.controlPanel.mapsKeyDisplayName,
        '-AllowedReferrers'
    ) + @($input.controlPanel.allowedReferrers)
    if (-not $Apply) {
        $browserArguments += '-DryRun'
    } else {
        $browserArguments += @('-WriteEnvironmentFile', $ControlPanelEnvPath)
    }
    Invoke-ChildPowerShell -File $CreateBrowserMapsKeyScript -Arguments $browserArguments
}

function Invoke-PreflightPhase {
    param([Parameter(Mandatory)] $PlatformManifest)
    $arguments = @('--project', [string]$PlatformManifest.projectId, '--input', [System.IO.Path]::GetFullPath($InputPath))
    Invoke-NodeChecked -File $PreflightScript -Arguments $arguments
}

foreach ($path in @(
    $PlatformManifestPath,
    $MobileManifestPath,
    $EnableFirebaseScript,
    $BootstrapFirebaseAppsScript,
    $SetupFirebaseEasScript,
    $CreateAndroidMapsKeyScript,
    $CreateBrowserMapsKeyScript
)) {
    Assert-File -Path $path
}

$platformManifest = Read-JsonFile -Path $PlatformManifestPath
$mobileManifest = Read-JsonFile -Path $MobileManifestPath

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' BTHWANI GOOGLE PLATFORM — ALL SURFACES' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "Phase:       $Phase"
Write-Host "Apply:       $Apply"
Write-Host "Project:     $($platformManifest.projectId)"
Write-Host "Mobile apps: $(@($platformManifest.firebase.androidApps) -join ', ')"
Write-Host 'Web surface: control-panel'
Write-Host "Input:       $InputPath"
Write-Host "Mobile env:  $MobileEnvPath"
Write-Host "Web env:     $ControlPanelEnvPath"

Write-Step 'Verify central Google Cloud project and billing'
Assert-CloudState -ProjectId ([string]$platformManifest.projectId) -BillingAccountId ([string]$platformManifest.billingAccountId)

if ($Phase -eq 'Plan') {
    Write-Host "`nPLAN ONLY — no mutation was requested." -ForegroundColor Yellow
    Write-Host '1. Enable Firebase on bthwani-platform.'
    Write-Host '2. Register and download configs for all four Android apps.'
    Write-Host '3. Upload each validated Firebase file to its matching EAS project.'
    Write-Host '4. Create four Android Maps keys plus one browser Maps key.'
    Write-Host '5. Save only ignored local runtime values and upload mobile keys to EAS.'
    Write-Host '6. Run all-surface preflight before any remote build.'
    return
}

$phases = if ($Phase -eq 'All') {
    @('EnableFirebase', 'BootstrapFirebaseApps', 'UploadFirebaseToEas', 'CreateMapsKeys', 'Preflight')
} else {
    @($Phase)
}

foreach ($currentPhase in $phases) {
    Write-Step $currentPhase
    switch ($currentPhase) {
        'EnableFirebase' { Invoke-EnableFirebasePhase -ProjectId ([string]$platformManifest.projectId) }
        'BootstrapFirebaseApps' { Invoke-BootstrapFirebaseAppsPhase }
        'UploadFirebaseToEas' { Invoke-UploadFirebaseToEasPhase }
        'CreateMapsKeys' { Invoke-CreateMapsKeysPhase -PlatformManifest $platformManifest -MobileManifest $mobileManifest }
        'Preflight' { Invoke-PreflightPhase -PlatformManifest $platformManifest }
        default { throw "Unsupported phase: $currentPhase" }
    }
}

Write-Host "`nPASS: phase '$Phase' completed for all four apps and the control panel." -ForegroundColor Green
