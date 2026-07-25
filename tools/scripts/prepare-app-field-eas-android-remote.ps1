# tools/scripts/prepare-app-field-eas-android-remote.ps1
# Prepare app-field only for an Android EAS Remote Build.
# This script intentionally avoids the all-app bootstrap path so field builds can
# be prepared, verified, and submitted independently.

[CmdletBinding()]
param(
    [switch] $SubmitBuild,
    [switch] $SkipPreflight,
    [switch] $ClearCache
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir '..\..')).Path
$AppKey = 'app-field'
$AppDir = Join-Path $RepoRoot 'apps\app-field\runtime'
$RuntimeGoogleServicesPath = Join-Path $AppDir 'google-services.json'
$RuntimeEnvPath = Join-Path $AppDir '.env.local'
$ManifestPath = Join-Path $RepoRoot 'tools\mobile\mobile-apps.manifest.json'
$GoogleInputPath = Join-Path $RepoRoot 'tools\scripts\google-cloud\google-platform-input.local.json'
$FirebaseValidatorPath = Join-Path $RepoRoot 'tools\mobile\google-services-config.mjs'
$LocalSecretsMapPath = Join-Path $RepoRoot 'secrets.local.mobile.json'
$MobileEnvPath = Join-Path $RepoRoot 'infra\local\mobile.env'
$PrepareFcmScript = Join-Path $RepoRoot 'tools\scripts\google-cloud\prepare-fcm-v1-service-account.ps1'
$CreateMapsKeyScript = Join-Path $RepoRoot 'tools\scripts\google-cloud\create-android-maps-api-key.ps1'
$EasBuildScript = Join-Path $RepoRoot 'tools\scripts\eas-build-mobile.mjs'
$DefaultFirebasePath = 'C:\bthwani-secrets\firebase\app-field\google-services.json'

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

function ConvertTo-FullPath {
    param([Parameter(Mandatory)][string] $Path)
    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $AppDir $Path))
}

function Test-SameFilePath {
    param(
        [Parameter(Mandatory)][string] $Left,
        [Parameter(Mandatory)][string] $Right
    )
    $leftFull = ConvertTo-FullPath -Path $Left
    $rightFull = ConvertTo-FullPath -Path $Right
    return [string]::Equals($leftFull, $rightFull, [System.StringComparison]::OrdinalIgnoreCase)
}

function Get-AppEnvironmentSuffix {
    param([Parameter(Mandatory)][string] $Key)
    return $Key.Replace('-', '_').ToUpperInvariant()
}

function Resolve-AppScopedValue {
    param(
        [Parameter(Mandatory)][string] $BaseName,
        [Parameter(Mandatory)][string] $Key
    )
    $suffix = Get-AppEnvironmentSuffix -Key $Key
    $scoped = [Environment]::GetEnvironmentVariable("${BaseName}_${suffix}", 'Process')
    if (-not [string]::IsNullOrWhiteSpace($scoped)) { return $scoped.Trim() }
    $common = [Environment]::GetEnvironmentVariable($BaseName, 'Process')
    if (-not [string]::IsNullOrWhiteSpace($common)) { return $common.Trim() }
    return $null
}

function Import-EnvFile {
    param([Parameter(Mandatory)][string] $Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return }
    foreach ($rawLine in Get-Content -LiteralPath $Path) {
        $line = $rawLine.Trim()
        if (-not $line -or $line.StartsWith('#') -or -not $line.Contains('=')) { continue }
        $parts = $line.Split('=', 2)
        $name = $parts[0].Trim()
        $value = $parts[1].Trim()
        if (-not $name) { continue }
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

function Resolve-FieldFirebaseSource {
    if (Test-Path -LiteralPath $LocalSecretsMapPath -PathType Leaf) {
        $map = Get-Content -LiteralPath $LocalSecretsMapPath -Raw | ConvertFrom-Json -Depth 20
        $entry = $map.PSObject.Properties[$AppKey]
        if ($null -ne $entry -and -not [string]::IsNullOrWhiteSpace([string]$entry.Value)) {
            $candidate = [string]$entry.Value
            if (Test-Path -LiteralPath $candidate -PathType Leaf) { return (Resolve-Path -LiteralPath $candidate).Path }
        }
    }
    if (Test-Path -LiteralPath $DefaultFirebasePath -PathType Leaf) {
        return (Resolve-Path -LiteralPath $DefaultFirebasePath).Path
    }
    throw "app-field google-services.json was not found in secrets.local.mobile.json or $DefaultFirebasePath"
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory)][string] $Command,
        [Parameter(Mandatory)][string[]] $Arguments,
        [string] $WorkingDirectory = $RepoRoot,
        [string[]] $SecretValues = @(),
        [switch] $Quiet
    )
    Push-Location -LiteralPath $WorkingDirectory
    try {
        $global:LASTEXITCODE = 0
        $output = & $Command @Arguments 2>&1
        $exitCode = if ($null -eq $global:LASTEXITCODE) { 0 } else { [int]$global:LASTEXITCODE }
        $text = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
        foreach ($secretValue in $SecretValues) {
            if (-not [string]::IsNullOrWhiteSpace($secretValue)) {
                $text = $text.Replace($secretValue, '<redacted>')
            }
        }
        if ($text -and -not $Quiet) { Write-Host $text }
        if ($exitCode -ne 0) {
            throw "Command failed with exit code ${exitCode}: $Command $($Arguments -join ' ')"
        }
        return $text
    } finally {
        Pop-Location
    }
}

function Write-FieldRuntimeEnvironmentFile {
    param([Parameter(Mandatory)][string] $AndroidMapsKey)

    @(
        '# Generated locally by prepare-app-field-eas-android-remote.ps1.',
        '# This file is intentionally untracked but must be included in the EAS archive.',
        'GOOGLE_SERVICES_JSON=./google-services.json',
        'GOOGLE_SERVICES_JSON_APP_FIELD=./google-services.json',
        "GOOGLE_MAPS_ANDROID_API_KEY=$AndroidMapsKey",
        "GOOGLE_MAPS_ANDROID_API_KEY_APP_FIELD=$AndroidMapsKey"
    ) | Set-Content -LiteralPath $RuntimeEnvPath -Encoding UTF8
}

function Invoke-AppFieldExpoConfigProof {
    param([Parameter(Mandatory)][string] $ExpectedMapsKey)

    $previousGoogleServices = [Environment]::GetEnvironmentVariable('GOOGLE_SERVICES_JSON', 'Process')
    $previousScopedGoogleServices = [Environment]::GetEnvironmentVariable('GOOGLE_SERVICES_JSON_APP_FIELD', 'Process')
    $previousMaps = [Environment]::GetEnvironmentVariable('GOOGLE_MAPS_ANDROID_API_KEY', 'Process')
    $previousScopedMaps = [Environment]::GetEnvironmentVariable('GOOGLE_MAPS_ANDROID_API_KEY_APP_FIELD', 'Process')
    try {
        [Environment]::SetEnvironmentVariable('GOOGLE_SERVICES_JSON', './google-services.json', 'Process')
        [Environment]::SetEnvironmentVariable('GOOGLE_SERVICES_JSON_APP_FIELD', './google-services.json', 'Process')
        [Environment]::SetEnvironmentVariable('GOOGLE_MAPS_ANDROID_API_KEY', $ExpectedMapsKey, 'Process')
        [Environment]::SetEnvironmentVariable('GOOGLE_MAPS_ANDROID_API_KEY_APP_FIELD', $ExpectedMapsKey, 'Process')
        $configText = Invoke-Checked -Command 'pnpm' -Arguments @('exec', 'expo', 'config', '--json') -WorkingDirectory $AppDir -Quiet -SecretValues @($ExpectedMapsKey)
        $jsonStart = $configText.IndexOf('{')
        if ($jsonStart -lt 0) { throw 'Expo config did not return JSON.' }
        $config = $configText.Substring($jsonStart) | ConvertFrom-Json -Depth 100
        if ([string]$config.owner -ne [string]$manifest.global.owner) { throw 'app-field owner mismatch.' }
        if ([string]$config.slug -ne [string]$app.slug) { throw 'app-field slug mismatch.' }
        if ([string]$config.extra.eas.projectId -ne $projectId) { throw 'app-field EAS project ID mismatch.' }
        $resolvedConfigGoogleServicesFile = [string]$config.android.googleServicesFile
        if (-not (Test-SameFilePath -Left $resolvedConfigGoogleServicesFile -Right $RuntimeGoogleServicesPath)) {
            throw "app-field android.googleServicesFile resolved to '$resolvedConfigGoogleServicesFile', expected the runtime-local file '$RuntimeGoogleServicesPath'."
        }
        if ($config.extra.maps.androidNativeConfigured -ne $true) {
            throw 'app-field Android Maps native flag is not configured.'
        }
        Write-Host "PASS: app-field Expo config resolves Firebase and Android Maps from runtime-local build inputs." -ForegroundColor Green
    } finally {
        [Environment]::SetEnvironmentVariable('GOOGLE_SERVICES_JSON', $previousGoogleServices, 'Process')
        [Environment]::SetEnvironmentVariable('GOOGLE_SERVICES_JSON_APP_FIELD', $previousScopedGoogleServices, 'Process')
        [Environment]::SetEnvironmentVariable('GOOGLE_MAPS_ANDROID_API_KEY', $previousMaps, 'Process')
        [Environment]::SetEnvironmentVariable('GOOGLE_MAPS_ANDROID_API_KEY_APP_FIELD', $previousScopedMaps, 'Process')
    }
}

foreach ($required in @(
    $ManifestPath,
    $FirebaseValidatorPath,
    $PrepareFcmScript,
    $CreateMapsKeyScript,
    $EasBuildScript
)) {
    Assert-File -Path $required
}

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -Depth 100
$app = $manifest.apps.$AppKey
if ($null -eq $app) { throw 'The mobile manifest does not define app-field.' }
$expectedPackage = [string]$app.androidPackage
$projectId = [string]$app.projectId

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' BTHWANI APP-FIELD ANDROID EAS REMOTE PREPARATION' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "App:       $AppKey"
Write-Host "Package:   $expectedPackage"
Write-Host "ProjectId: $projectId"
Write-Host "Build:     $(if ($SubmitBuild) { 'submit remote build' } else { 'prepare only' })"

Write-Step 'Load ignored local mobile environment'
Import-EnvFile -Path $MobileEnvPath

Write-Step 'Install runtime-local Firebase config shim for app-field'
$firebaseSource = Resolve-FieldFirebaseSource
Copy-Item -LiteralPath $firebaseSource -Destination $RuntimeGoogleServicesPath -Force
Invoke-Checked -Command 'node' -Arguments @(
    $FirebaseValidatorPath,
    '--file', $RuntimeGoogleServicesPath,
    '--package', $expectedPackage,
    '--json'
) | Out-Null
Write-Host "PASS: app-field runtime Firebase config is valid and locally staged: $RuntimeGoogleServicesPath" -ForegroundColor Green

Write-Step 'Skip stale EAS GOOGLE_SERVICES_JSON mutation'
Write-Host 'PASS: no EAS GOOGLE_SERVICES_JSON visibility change is attempted. The runtime-local google-services.json is packaged with the EAS archive.' -ForegroundColor Green

Write-Step 'Prepare central FCM V1 service account'
Invoke-Checked -Command 'pwsh' -Arguments @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PrepareFcmScript, '-Apply') | Out-Null

Write-Step 'Create or update restricted Android Maps key for app-field'
Assert-File -Path $GoogleInputPath
$googleInput = Get-Content -LiteralPath $GoogleInputPath -Raw | ConvertFrom-Json -Depth 100
$fieldInput = $googleInput.apps.$AppKey
if ($null -eq $fieldInput) { throw 'google-platform-input.local.json does not define app-field.' }
$sha1 = [string]$fieldInput.sha1Fingerprint
$displayName = [string]$fieldInput.mapsKeyDisplayName
if ($sha1 -notmatch '^([A-Fa-f0-9]{2}:){19}[A-Fa-f0-9]{2}$') { throw 'app-field SHA-1 fingerprint is invalid.' }
Invoke-Checked -Command 'pwsh' -Arguments @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $CreateMapsKeyScript,
    '-ProjectId', 'bthwani-platform',
    '-AppKey', $AppKey,
    '-PackageName', $expectedPackage,
    '-Sha1Fingerprint', $sha1,
    '-DisplayName', $displayName,
    '-WriteEnvironmentFile', $MobileEnvPath
) | Out-Null

Write-Step 'Stage app-field runtime environment for the remote archive'
Import-EnvFile -Path $MobileEnvPath
$androidMapsKey = Resolve-AppScopedValue -BaseName 'GOOGLE_MAPS_ANDROID_API_KEY' -Key $AppKey
if ([string]::IsNullOrWhiteSpace($androidMapsKey)) {
    throw 'GOOGLE_MAPS_ANDROID_API_KEY_APP_FIELD was not found after the Maps key preparation step.'
}
if ($androidMapsKey -match 'placeholder|bthwani_dev_maps_key_placeholder') {
    throw 'app-field still has a placeholder Google Maps Android API key. A real restricted key is required before remote build.'
}
if ($androidMapsKey -notmatch '^AIza[0-9A-Za-z_-]{20,}$') {
    throw 'app-field Google Maps Android API key does not have the expected Google API key format.'
}
Write-FieldRuntimeEnvironmentFile -AndroidMapsKey $androidMapsKey
Write-Host "PASS: app-field runtime .env.local was generated for the EAS archive without printing secrets: $RuntimeEnvPath" -ForegroundColor Green

Write-Step 'Verify Expo config resolves app-field Firebase, Maps, and EAS identity'
Invoke-AppFieldExpoConfigProof -ExpectedMapsKey $androidMapsKey

Write-Step 'Run app-field remote-build preflight'
if (-not $SkipPreflight) {
    Invoke-Checked -Command 'node' -Arguments @(
        $EasBuildScript,
        '--app', $AppKey,
        '--platform', 'android',
        '--profile', 'development',
        '--preflight-only',
        '--non-interactive'
    ) -SecretValues @($androidMapsKey) | Out-Null
    Write-Host 'PASS: app-field preflight completed.' -ForegroundColor Green
} else {
    Write-Host 'SKIP: preflight was explicitly skipped.' -ForegroundColor Yellow
}

if ($SubmitBuild) {
    Write-Step 'Submit app-field Android development build to EAS Remote Build'
    $buildArgs = @(
        $EasBuildScript,
        '--app', $AppKey,
        '--platform', 'android',
        '--profile', 'development',
        '--non-interactive'
    )
    if ($ClearCache) { $buildArgs += '--clear-cache' }
    Invoke-Checked -Command 'node' -Arguments $buildArgs -SecretValues @($androidMapsKey) | Out-Null
    Write-Host 'PASS: app-field EAS Remote Build submission completed.' -ForegroundColor Green
} else {
    Write-Host "`nPASS: app-field is prepared for Android EAS Remote Build." -ForegroundColor Green
    Write-Host 'To submit only app-field, rerun this script with -SubmitBuild.' -ForegroundColor Cyan
}
