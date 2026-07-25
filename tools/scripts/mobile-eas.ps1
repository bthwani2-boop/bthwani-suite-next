# tools/scripts/mobile-eas.ps1
# Single governed entry point for one mobile EAS application at a time.
# Lifecycle: Initialize once -> Preflight -> Build.

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('app-client', 'app-partner', 'app-captain', 'app-field')]
    [string] $App,

    [Parameter(Mandatory)]
    [ValidateSet('Initialize', 'Preflight', 'Build')]
    [string] $Mode,

    [ValidateSet('android')]
    [string] $Platform = 'android',

    [ValidateSet('development', 'internal', 'production')]
    [string] $Profile = 'development',

    [switch] $ClearCache
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir '..\..')).Path
$AppDir = Join-Path $RepoRoot "apps\$App\runtime"
$RuntimeGoogleServicesPath = Join-Path $AppDir 'google-services.json'
$RuntimeEnvPath = Join-Path $AppDir '.env.local'
$RuntimeEasIgnorePath = Join-Path $AppDir '.easignore'
$ManifestPath = Join-Path $RepoRoot 'tools\mobile\mobile-apps.manifest.json'
$FirebaseValidatorPath = Join-Path $RepoRoot 'tools\mobile\google-services-config.mjs'
$GoogleInputPath = Join-Path $RepoRoot 'tools\scripts\google-cloud\google-platform-input.local.json'
$PrepareFcmScript = Join-Path $RepoRoot 'tools\scripts\google-cloud\prepare-fcm-v1-service-account.ps1'
$CreateMapsKeyScript = Join-Path $RepoRoot 'tools\scripts\google-cloud\create-android-maps-api-key.ps1'
$EasBuildScript = Join-Path $RepoRoot 'tools\scripts\eas-build-mobile.mjs'
$LocalSecretsMapPath = Join-Path $RepoRoot 'secrets.local.mobile.json'
$MobileEnvPath = Join-Path $RepoRoot 'infra\local\mobile.env'
$DefaultFirebasePath = "C:\bthwani-secrets\firebase\$App\google-services.json"
$FcmServiceAccountPath = 'C:\bthwani-secrets\firebase\bthwani-platform-fcm-v1-service-account.json'
$StampDirectory = Join-Path $RepoRoot '.tmp\mobile-eas\preflight'
$StampPath = Join-Path $StampDirectory "$App-$Platform-$Profile.json"

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

function Invoke-Checked {
    param(
        [Parameter(Mandatory)][string] $Command,
        [Parameter(Mandatory)][AllowEmptyCollection()][string[]] $Arguments,
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

function Get-AppEnvironmentSuffix {
    return $App.Replace('-', '_').ToUpperInvariant()
}

function Resolve-AppScopedValue {
    param([Parameter(Mandatory)][string] $BaseName)
    $suffix = Get-AppEnvironmentSuffix
    $scoped = [Environment]::GetEnvironmentVariable("${BaseName}_${suffix}", 'Process')
    if (-not [string]::IsNullOrWhiteSpace($scoped)) { return $scoped.Trim() }
    $common = [Environment]::GetEnvironmentVariable($BaseName, 'Process')
    if (-not [string]::IsNullOrWhiteSpace($common)) { return $common.Trim() }
    return $null
}

function Resolve-FirebaseSource {
    if (Test-Path -LiteralPath $LocalSecretsMapPath -PathType Leaf) {
        $map = Get-Content -LiteralPath $LocalSecretsMapPath -Raw | ConvertFrom-Json -Depth 20
        $entry = $map.PSObject.Properties[$App]
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

    throw "$App google-services.json was not found in secrets.local.mobile.json or $DefaultFirebasePath"
}

function Test-ValidMapsKey {
    param([AllowNull()][string] $Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $false }
    if ($Value -match 'placeholder|bthwani_dev_maps_key_placeholder') { return $false }
    return $Value -match '^AIza[0-9A-Za-z_-]{20,}$'
}

function Get-StringSha256 {
    param([Parameter(Mandatory)][string] $Value)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
    $hash = [System.Security.Cryptography.SHA256]::HashData($bytes)
    return [Convert]::ToHexString($hash).ToLowerInvariant()
}

function Get-HeadCommit {
    return (Invoke-Checked -Command 'git' -Arguments @('rev-parse', 'HEAD') -Quiet).Trim()
}

function Assert-CleanTrackedTree {
    $status = Invoke-Checked -Command 'git' -Arguments @('status', '--porcelain', '--untracked-files=no') -Quiet
    if (-not [string]::IsNullOrWhiteSpace($status)) {
        throw 'Tracked files changed after checkout. Commit or discard them before Preflight/Build.'
    }
}

function Assert-EasArchivePolicy {
    Assert-File -Path $RuntimeEasIgnorePath
    $rules = Get-Content -LiteralPath $RuntimeEasIgnorePath
    foreach ($requiredRule in @('!google-services.json', '!.env.local')) {
        if ($rules -notcontains $requiredRule) {
            throw "$App .easignore must contain '$requiredRule' so the validated runtime input reaches EAS."
        }
    }
}

function Write-RuntimeEnvironment {
    param([AllowNull()][string] $AndroidMapsKey)

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add('# Generated locally by tools/scripts/mobile-eas.ps1.')
    $lines.Add('# Ignored by Git and intentionally included in the EAS archive.')
    $lines.Add('GOOGLE_SERVICES_JSON=./google-services.json')
    $lines.Add("GOOGLE_SERVICES_JSON_$(Get-AppEnvironmentSuffix)=./google-services.json")
    if (-not [string]::IsNullOrWhiteSpace($AndroidMapsKey)) {
        $lines.Add("GOOGLE_MAPS_ANDROID_API_KEY=$AndroidMapsKey")
        $lines.Add("GOOGLE_MAPS_ANDROID_API_KEY_$(Get-AppEnvironmentSuffix)=$AndroidMapsKey")
    }
    $lines | Set-Content -LiteralPath $RuntimeEnvPath -Encoding UTF8
}

function Invoke-ExpoConfigProof {
    param([AllowNull()][string] $AndroidMapsKey)

    $suffix = Get-AppEnvironmentSuffix
    $names = @(
        'GOOGLE_SERVICES_JSON',
        "GOOGLE_SERVICES_JSON_$suffix",
        'GOOGLE_MAPS_ANDROID_API_KEY',
        "GOOGLE_MAPS_ANDROID_API_KEY_$suffix"
    )
    $previous = @{}
    foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }

    try {
        [Environment]::SetEnvironmentVariable('GOOGLE_SERVICES_JSON', $RuntimeGoogleServicesPath, 'Process')
        [Environment]::SetEnvironmentVariable("GOOGLE_SERVICES_JSON_$suffix", $RuntimeGoogleServicesPath, 'Process')
        if (-not [string]::IsNullOrWhiteSpace($AndroidMapsKey)) {
            [Environment]::SetEnvironmentVariable('GOOGLE_MAPS_ANDROID_API_KEY', $AndroidMapsKey, 'Process')
            [Environment]::SetEnvironmentVariable("GOOGLE_MAPS_ANDROID_API_KEY_$suffix", $AndroidMapsKey, 'Process')
        }

        $configText = Invoke-Checked -Command 'pnpm' -Arguments @('exec', 'expo', 'config', '--json') -WorkingDirectory $AppDir -Quiet -SecretValues @($AndroidMapsKey)
        $jsonStart = $configText.IndexOf('{')
        if ($jsonStart -lt 0) { throw 'Expo config did not return JSON.' }
        $config = $configText.Substring($jsonStart) | ConvertFrom-Json -Depth 100

        if ([string]$config.owner -ne [string]$manifest.global.owner) { throw "$App owner mismatch." }
        if ([string]$config.slug -ne [string]$appConfig.slug) { throw "$App slug mismatch." }
        if ([string]$config.extra.eas.projectId -ne [string]$appConfig.projectId) { throw "$App EAS project ID mismatch." }

        $resolvedFirebase = [System.IO.Path]::GetFullPath([string]$config.android.googleServicesFile)
        $expectedFirebase = [System.IO.Path]::GetFullPath($RuntimeGoogleServicesPath)
        if (-not [string]::Equals($resolvedFirebase, $expectedFirebase, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "$App android.googleServicesFile resolved to '$resolvedFirebase', expected '$expectedFirebase'."
        }

        if ($features -contains 'maps' -and $config.extra.maps.androidNativeConfigured -ne $true) {
            throw "$App Android Maps native configuration is missing."
        }
    } finally {
        foreach ($name in $names) {
            [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process')
        }
    }
}

function Initialize-MissingCloudInputs {
    Write-Step 'Initialize only missing cloud inputs'

    if ($features -contains 'notifications') {
        if (Test-Path -LiteralPath $FcmServiceAccountPath -PathType Leaf) {
            Write-Host 'PASS: existing central FCM V1 credential preserved.' -ForegroundColor Green
        } else {
            Assert-File -Path $PrepareFcmScript
            Invoke-Checked -Command 'pwsh' -Arguments @(
                '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PrepareFcmScript, '-Apply'
            ) | Out-Null
        }
    }

    if ($features -contains 'maps') {
        Import-EnvFile -Path $MobileEnvPath
        $mapsKey = Resolve-AppScopedValue -BaseName 'GOOGLE_MAPS_ANDROID_API_KEY'
        if (Test-ValidMapsKey -Value $mapsKey) {
            Write-Host "PASS: existing restricted Maps key preserved for $App." -ForegroundColor Green
        } else {
            Assert-File -Path $GoogleInputPath
            Assert-File -Path $CreateMapsKeyScript
            $googleInput = Get-Content -LiteralPath $GoogleInputPath -Raw | ConvertFrom-Json -Depth 100
            $input = $googleInput.apps.$App
            if ($null -eq $input) { throw "google-platform-input.local.json does not define $App." }
            $sha1 = [string]$input.sha1Fingerprint
            $displayName = [string]$input.mapsKeyDisplayName
            if ($sha1 -notmatch '^([A-Fa-f0-9]{2}:){19}[A-Fa-f0-9]{2}$') {
                throw "$App SHA-1 fingerprint is invalid."
            }
            Invoke-Checked -Command 'pwsh' -Arguments @(
                '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $CreateMapsKeyScript,
                '-ProjectId', 'bthwani-platform',
                '-AppKey', $App,
                '-PackageName', ([string]$appConfig.androidPackage),
                '-Sha1Fingerprint', $sha1,
                '-DisplayName', $displayName,
                '-WriteEnvironmentFile', $MobileEnvPath
            ) | Out-Null
        }
    }
}

function Stage-And-ValidateInputs {
    Write-Step 'Stage and validate local runtime inputs'
    Assert-EasArchivePolicy

    if ($features -contains 'notifications') {
        $firebaseSource = Resolve-FirebaseSource
        Copy-Item -LiteralPath $firebaseSource -Destination $RuntimeGoogleServicesPath -Force
        Invoke-Checked -Command 'node' -Arguments @(
            $FirebaseValidatorPath,
            '--file', $RuntimeGoogleServicesPath,
            '--package', ([string]$appConfig.androidPackage),
            '--json'
        ) | Out-Null
    } else {
        throw "$App has no notifications feature but the current Android EAS contract requires an explicit Firebase decision."
    }

    Import-EnvFile -Path $MobileEnvPath
    $mapsKey = $null
    if ($features -contains 'maps') {
        $mapsKey = Resolve-AppScopedValue -BaseName 'GOOGLE_MAPS_ANDROID_API_KEY'
        if (-not (Test-ValidMapsKey -Value $mapsKey)) {
            throw "A valid GOOGLE_MAPS_ANDROID_API_KEY_$(Get-AppEnvironmentSuffix) is required. Run -Mode Initialize once."
        }
    }

    Write-RuntimeEnvironment -AndroidMapsKey $mapsKey
    Invoke-ExpoConfigProof -AndroidMapsKey $mapsKey
    return $mapsKey
}

function Write-PreflightStamp {
    param([AllowNull()][string] $AndroidMapsKey)
    New-Item -ItemType Directory -Path $StampDirectory -Force | Out-Null
    $stamp = [ordered]@{
        schemaVersion = 1
        app = $App
        platform = $Platform
        profile = $Profile
        commit = Get-HeadCommit
        firebaseSha256 = (Get-FileHash -LiteralPath $RuntimeGoogleServicesPath -Algorithm SHA256).Hash.ToLowerInvariant()
        mapsKeySha256 = if ([string]::IsNullOrWhiteSpace($AndroidMapsKey)) { $null } else { Get-StringSha256 -Value $AndroidMapsKey }
        completedAtUtc = [DateTime]::UtcNow.ToString('o')
    }
    $stamp | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $StampPath -Encoding UTF8
}

function Assert-CurrentPreflightStamp {
    param([AllowNull()][string] $AndroidMapsKey)
    Assert-File -Path $StampPath
    $stamp = Get-Content -LiteralPath $StampPath -Raw | ConvertFrom-Json -Depth 10
    $currentCommit = Get-HeadCommit
    $firebaseHash = (Get-FileHash -LiteralPath $RuntimeGoogleServicesPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $mapsHash = if ([string]::IsNullOrWhiteSpace($AndroidMapsKey)) { $null } else { Get-StringSha256 -Value $AndroidMapsKey }

    if ([string]$stamp.app -ne $App -or [string]$stamp.platform -ne $Platform -or [string]$stamp.profile -ne $Profile) {
        throw 'The saved Preflight belongs to a different app/platform/profile.'
    }
    if ([string]$stamp.commit -ne $currentCommit) {
        throw 'The current Git commit differs from the successful Preflight commit. Run Preflight again.'
    }
    if ([string]$stamp.firebaseSha256 -ne $firebaseHash) {
        throw 'google-services.json changed after Preflight. Run Preflight again.'
    }
    if ([string]$stamp.mapsKeySha256 -ne [string]$mapsHash) {
        throw 'The Maps key changed after Preflight. Run Preflight again.'
    }
}

foreach ($required in @($ManifestPath, $FirebaseValidatorPath, $EasBuildScript)) {
    Assert-File -Path $required
}
Assert-File -Path $AppDir

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -Depth 100
$appConfig = $manifest.apps.$App
if ($null -eq $appConfig) { throw "The mobile manifest does not define $App." }
$features = @($appConfig.features)

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' BTHWANI SINGLE-APP EAS WORKFLOW' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "App:      $App"
Write-Host "Mode:     $Mode"
Write-Host "Platform: $Platform"
Write-Host "Profile:  $Profile"

Assert-CleanTrackedTree

if ($Mode -eq 'Initialize') {
    Initialize-MissingCloudInputs
    $null = Stage-And-ValidateInputs
    Remove-Item -LiteralPath $StampPath -Force -ErrorAction SilentlyContinue
    Write-Host "`nPASS: $App initialization completed. Run Preflight next." -ForegroundColor Green
    exit 0
}

$mapsKey = Stage-And-ValidateInputs

if ($Mode -eq 'Preflight') {
    Write-Step 'Run single-app Preflight'
    Remove-Item -LiteralPath $StampPath -Force -ErrorAction SilentlyContinue
    Invoke-Checked -Command 'node' -Arguments @(
        $EasBuildScript,
        '--app', $App,
        '--platform', $Platform,
        '--profile', $Profile,
        '--preflight-only',
        '--non-interactive'
    ) -SecretValues @($mapsKey) | Out-Null
    Write-PreflightStamp -AndroidMapsKey $mapsKey
    Write-Host "`nPASS: $App Preflight completed. No build was submitted." -ForegroundColor Green
    exit 0
}

Write-Step 'Verify successful current Preflight'
Assert-CurrentPreflightStamp -AndroidMapsKey $mapsKey

Write-Step 'Submit one remote EAS build'
$buildArguments = @(
    $EasBuildScript,
    '--app', $App,
    '--platform', $Platform,
    '--profile', $Profile,
    '--skip-preflight',
    '--non-interactive'
)
if ($ClearCache) { $buildArguments += '--clear-cache' }
Invoke-Checked -Command 'node' -Arguments $buildArguments -SecretValues @($mapsKey) | Out-Null
Write-Host "`nPASS: $App remote EAS build was submitted." -ForegroundColor Green
