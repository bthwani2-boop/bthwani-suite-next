# tools/scripts/prepare-app-field-eas-android-remote.ps1
# Sovereign single-app Android EAS workflow for app-field.
# Modes are intentionally separated:
#   Initialize - provision missing cloud inputs once.
#   Preflight  - verify local inputs and app-field only; no cloud mutations.
#   Build      - submit app-field only after a successful preflight; no cloud mutations.

[CmdletBinding()]
param(
    [ValidateSet('Initialize', 'Preflight', 'Build')]
    [string] $Mode = 'Preflight',
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
$FcmServiceAccountPath = 'C:\bthwani-secrets\firebase\bthwani-platform-fcm-v1-service-account.json'

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
    return [string]::Equals(
        (ConvertTo-FullPath -Path $Left),
        (ConvertTo-FullPath -Path $Right),
        [System.StringComparison]::OrdinalIgnoreCase
    )
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
            if (Test-Path -LiteralPath $candidate -PathType Leaf) {
                return (Resolve-Path -LiteralPath $candidate).Path
            }
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

function Test-ValidMapsKey {
    param([AllowNull()][string] $Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $false }
    if ($Value -match 'placeholder|bthwani_dev_maps_key_placeholder') { return $false }
    return $Value -match '^AIza[0-9A-Za-z_-]{20,}$'
}

function Write-FieldRuntimeEnvironmentFile {
    param([Parameter(Mandatory)][string] $AndroidMapsKey)
    @(
        '# Generated locally for app-field EAS archive.',
        '# Untracked by Git and intentionally included by apps/app-field/runtime/.easignore.',
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
        [Environment]::SetEnvironmentVariable('GOOGLE_SERVICES_JSON', $RuntimeGoogleServicesPath, 'Process')
        [Environment]::SetEnvironmentVariable('GOOGLE_SERVICES_JSON_APP_FIELD', $RuntimeGoogleServicesPath, 'Process')
        [Environment]::SetEnvironmentVariable('GOOGLE_MAPS_ANDROID_API_KEY', $ExpectedMapsKey, 'Process')
        [Environment]::SetEnvironmentVariable('GOOGLE_MAPS_ANDROID_API_KEY_APP_FIELD', $ExpectedMapsKey, 'Process')
        $configText = Invoke-Checked -Command 'pnpm' -Arguments @('exec', 'expo', 'config', '--json') -WorkingDirectory $AppDir -Quiet -SecretValues @($ExpectedMapsKey)
        $jsonStart = $configText.IndexOf('{')
        if ($jsonStart -lt 0) { throw 'Expo config did not return JSON.' }
        $config = $configText.Substring($jsonStart) | ConvertFrom-Json -Depth 100
        if ([string]$config.owner -ne [string]$manifest.global.owner) { throw 'app-field owner mismatch.' }
        if ([string]$config.slug -ne [string]$app.slug) { throw 'app-field slug mismatch.' }
        if ([string]$config.extra.eas.projectId -ne $projectId) { throw 'app-field EAS project ID mismatch.' }
        $resolvedGoogleServices = [string]$config.android.googleServicesFile
        if (-not (Test-SameFilePath -Left $resolvedGoogleServices -Right $RuntimeGoogleServicesPath)) {
            throw "app-field android.googleServicesFile resolved to '$resolvedGoogleServices', expected '$RuntimeGoogleServicesPath'."
        }
        if ($config.extra.maps.androidNativeConfigured -ne $true) {
            throw 'app-field Android Maps native flag is not configured.'
        }
        Write-Host 'PASS: app-field Expo config resolves the staged Firebase and Maps inputs.' -ForegroundColor Green
    } finally {
        [Environment]::SetEnvironmentVariable('GOOGLE_SERVICES_JSON', $previousGoogleServices, 'Process')
        [Environment]::SetEnvironmentVariable('GOOGLE_SERVICES_JSON_APP_FIELD', $previousScopedGoogleServices, 'Process')
        [Environment]::SetEnvironmentVariable('GOOGLE_MAPS_ANDROID_API_KEY', $previousMaps, 'Process')
        [Environment]::SetEnvironmentVariable('GOOGLE_MAPS_ANDROID_API_KEY_APP_FIELD', $previousScopedMaps, 'Process')
    }
}

function Initialize-CloudInputsWhenMissing {
    Write-Step 'Initialize missing app-field cloud inputs once'

    if (-not (Test-Path -LiteralPath $FcmServiceAccountPath -PathType Leaf)) {
        Assert-File -Path $PrepareFcmScript
        Invoke-Checked -Command 'pwsh' -Arguments @(
            '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PrepareFcmScript, '-Apply'
        ) | Out-Null
    } else {
        Write-Host "PASS: existing FCM service-account key preserved: $FcmServiceAccountPath" -ForegroundColor Green
    }

    Import-EnvFile -Path $MobileEnvPath
    $mapsKey = Resolve-AppScopedValue -BaseName 'GOOGLE_MAPS_ANDROID_API_KEY' -Key $AppKey
    if (-not (Test-ValidMapsKey -Value $mapsKey)) {
        Assert-File -Path $GoogleInputPath
        Assert-File -Path $CreateMapsKeyScript
        $googleInput = Get-Content -LiteralPath $GoogleInputPath -Raw | ConvertFrom-Json -Depth 100
        $fieldInput = $googleInput.apps.$AppKey
        if ($null -eq $fieldInput) { throw 'google-platform-input.local.json does not define app-field.' }
        $sha1 = [string]$fieldInput.sha1Fingerprint
        $displayName = [string]$fieldInput.mapsKeyDisplayName
        if ($sha1 -notmatch '^([A-Fa-f0-9]{2}:){19}[A-Fa-f0-9]{2}$') {
            throw 'app-field SHA-1 fingerprint is invalid.'
        }
        Invoke-Checked -Command 'pwsh' -Arguments @(
            '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $CreateMapsKeyScript,
            '-ProjectId', 'bthwani-platform',
            '-AppKey', $AppKey,
            '-PackageName', $expectedPackage,
            '-Sha1Fingerprint', $sha1,
            '-DisplayName', $displayName,
            '-WriteEnvironmentFile', $MobileEnvPath
        ) | Out-Null
    } else {
        Write-Host 'PASS: existing restricted app-field Maps key preserved; no Google Cloud mutation performed.' -ForegroundColor Green
    }
}

function Stage-And-ValidateRuntimeInputs {
    Write-Step 'Stage and validate app-field runtime inputs'
    $firebaseSource = Resolve-FieldFirebaseSource
    Copy-Item -LiteralPath $firebaseSource -Destination $RuntimeGoogleServicesPath -Force
    Invoke-Checked -Command 'node' -Arguments @(
        $FirebaseValidatorPath,
        '--file', $RuntimeGoogleServicesPath,
        '--package', $expectedPackage,
        '--json'
    ) | Out-Null

    Import-EnvFile -Path $MobileEnvPath
    $mapsKey = Resolve-AppScopedValue -BaseName 'GOOGLE_MAPS_ANDROID_API_KEY' -Key $AppKey
    if (-not (Test-ValidMapsKey -Value $mapsKey)) {
        throw 'A valid GOOGLE_MAPS_ANDROID_API_KEY_APP_FIELD is required. Run this script once with -Mode Initialize.'
    }

    Write-FieldRuntimeEnvironmentFile -AndroidMapsKey $mapsKey
    Invoke-AppFieldExpoConfigProof -ExpectedMapsKey $mapsKey
    Write-Host 'PASS: app-field runtime inputs are staged without changing cloud resources.' -ForegroundColor Green
    return $mapsKey
}

foreach ($required in @($ManifestPath, $FirebaseValidatorPath, $EasBuildScript)) {
    Assert-File -Path $required
}

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -Depth 100
$app = $manifest.apps.$AppKey
if ($null -eq $app) { throw 'The mobile manifest does not define app-field.' }
$expectedPackage = [string]$app.androidPackage
$projectId = [string]$app.projectId

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' BTHWANI APP-FIELD ANDROID EAS' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "Mode:      $Mode"
Write-Host "App:       $AppKey"
Write-Host "Package:   $expectedPackage"
Write-Host "ProjectId: $projectId"

if ($Mode -eq 'Initialize') {
    Initialize-CloudInputsWhenMissing
    $null = Stage-And-ValidateRuntimeInputs
    Write-Host "`nPASS: app-field one-time initialization is complete." -ForegroundColor Green
    exit 0
}

$androidMapsKey = Stage-And-ValidateRuntimeInputs

if ($Mode -eq 'Preflight') {
    Write-Step 'Run app-field-only preflight'
    Invoke-Checked -Command 'node' -Arguments @(
        $EasBuildScript,
        '--app', $AppKey,
        '--platform', 'android',
        '--profile', 'development',
        '--preflight-only',
        '--non-interactive'
    ) -SecretValues @($androidMapsKey) | Out-Null
    Write-Host "`nPASS: app-field preflight completed. No remote build was submitted." -ForegroundColor Green
    exit 0
}

Write-Step 'Submit app-field-only Android development build'
$buildArgs = @(
    $EasBuildScript,
    '--app', $AppKey,
    '--platform', 'android',
    '--profile', 'development',
    '--skip-preflight',
    '--non-interactive'
)
if ($ClearCache) { $buildArgs += '--clear-cache' }
Invoke-Checked -Command 'node' -Arguments $buildArgs -SecretValues @($androidMapsKey) | Out-Null
Write-Host "`nPASS: app-field EAS Remote Build was submitted." -ForegroundColor Green
