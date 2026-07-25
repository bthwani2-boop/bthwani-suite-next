[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('app-client', 'app-partner', 'app-captain', 'app-field')]
    [string] $App,

    [Parameter(Mandatory)]
    [ValidateSet('Initialize', 'Preflight', 'Build')]
    [string] $Mode,

    [switch] $ClearCache
)

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$AppDir = Join-Path $RepoRoot "apps\$App\runtime"
$ManifestPath = Join-Path $RepoRoot 'tools\mobile\mobile-apps.manifest.json'
$FirebaseValidatorPath = Join-Path $RepoRoot 'tools\mobile\google-services-config.mjs'
$FirebaseHelperPath = Join-Path $RepoRoot 'tools\scripts\mobile-eas\ensure-firebase-app.ps1'
$MapsHelperPath = Join-Path $RepoRoot 'tools\scripts\google-cloud\create-android-maps-api-key.ps1'
$EasEnginePath = Join-Path $RepoRoot 'tools\scripts\eas-build-mobile.mjs'
$GoogleInputExamplePath = Join-Path $RepoRoot 'tools\scripts\google-cloud\google-platform-input.example.json'
$GoogleInputLocalPath = Join-Path $RepoRoot 'tools\scripts\google-cloud\google-platform-input.local.json'
$MobileEnvPath = Join-Path $RepoRoot 'infra\local\mobile.env'
$SecretsMapPath = Join-Path $RepoRoot 'secrets.local.mobile.json'
$SecureFirebasePath = "C:\bthwani-secrets\firebase\$App\google-services.json"
$SecureSigningDirectory = "C:\bthwani-secrets\eas\android\$App"
$SecureKeystorePath = Join-Path $SecureSigningDirectory 'development.jks'
$CredentialsPath = Join-Path $AppDir 'credentials.json'
$RuntimeFirebasePath = Join-Path $AppDir 'google-services.json'
$RuntimeEnvPath = Join-Path $AppDir '.env.local'
$RuntimeEasIgnorePath = Join-Path $AppDir '.easignore'
$StampDirectory = Join-Path $RepoRoot '.tmp\mobile-eas'
$InitializeStampPath = Join-Path $StampDirectory "$App-development-android.initialize.json"
$PreflightStampPath = Join-Path $StampDirectory "$App-development-android.preflight.json"

. (Join-Path $PSScriptRoot 'common.ps1')
. (Join-Path $PSScriptRoot 'signing.ps1')
. (Join-Path $PSScriptRoot 'providers.ps1')

foreach ($required in @($ManifestPath, $FirebaseValidatorPath, $FirebaseHelperPath, $MapsHelperPath, $EasEnginePath)) {
    Assert-File -Path $required
}
if (-not (Test-Path -LiteralPath $AppDir -PathType Container)) { throw "Required directory is missing: $AppDir" }
$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -Depth 100
$appConfig = $manifest.apps.$App
if ($null -eq $appConfig) { throw "Mobile manifest does not define $App." }

function Get-CurrentState {
    param(
        [Parameter(Mandatory)][string] $MapsKey,
        [Parameter(Mandatory)][string] $FirebaseKey
    )
    return [ordered]@{
        app = $App
        commit = (Invoke-Checked -Command 'git' -Arguments @('rev-parse', 'HEAD') -Quiet).Trim()
        androidPackage = [string]$appConfig.androidPackage
        easProjectId = [string]$appConfig.projectId
        firebaseFileSha256 = (Get-FileHash -LiteralPath $RuntimeFirebasePath -Algorithm SHA256).Hash.ToLowerInvariant()
        firebaseKeySha256 = Get-StringSha256 -Value $FirebaseKey
        credentialsSha256 = (Get-FileHash -LiteralPath $CredentialsPath -Algorithm SHA256).Hash.ToLowerInvariant()
        keystoreSha256 = (Get-FileHash -LiteralPath $SecureKeystorePath -Algorithm SHA256).Hash.ToLowerInvariant()
        mapsKeySha256 = Get-StringSha256 -Value $MapsKey
    }
}

function Write-StateStamp {
    param(
        [Parameter(Mandatory)][string] $Path,
        [Parameter(Mandatory)][string] $Stage,
        [Parameter(Mandatory)][string] $MapsKey,
        [Parameter(Mandatory)][string] $FirebaseKey
    )
    New-Item -ItemType Directory -Path $StampDirectory -Force | Out-Null
    $state = Get-CurrentState -MapsKey $MapsKey -FirebaseKey $FirebaseKey
    $state.stage = $Stage
    $state.completedAtUtc = [DateTime]::UtcNow.ToString('o')
    $state | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Assert-StateStamp {
    param(
        [Parameter(Mandatory)][string] $Path,
        [Parameter(Mandatory)][string] $ExpectedStage,
        [Parameter(Mandatory)][string] $MapsKey,
        [Parameter(Mandatory)][string] $FirebaseKey
    )
    Assert-File -Path $Path
    $saved = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -Depth 10
    if ([string]$saved.stage -ne $ExpectedStage) { throw "$ExpectedStage stamp is invalid." }
    $current = Get-CurrentState -MapsKey $MapsKey -FirebaseKey $FirebaseKey
    foreach ($name in @('app', 'commit', 'androidPackage', 'easProjectId', 'firebaseFileSha256', 'firebaseKeySha256', 'credentialsSha256', 'keystoreSha256', 'mapsKeySha256')) {
        if ([string]$saved.$name -ne [string]$current.$name) {
            throw "$ExpectedStage is no longer current ($name changed). Run Initialize and Preflight again."
        }
    }
}

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' BTHWANI SINGLE-APP ANDROID EAS' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "App:  $App"
Write-Host "Mode: $Mode"
Assert-CleanTrackedTree

if ($Mode -eq 'Initialize') {
    Remove-Item -LiteralPath $InitializeStampPath, $PreflightStampPath -Force -ErrorAction SilentlyContinue
    Write-Step 'Prepare signing and provider inputs'
    $sha1 = Ensure-Signing
    Update-GoogleInput -Sha1 $sha1

    Write-Step 'Refresh Firebase config and restricted runtime key'
    Invoke-Checked -Command 'pwsh' -Arguments @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $FirebaseHelperPath,
        '-App', $App, '-Sha1Fingerprint', $sha1
    ) | Out-Null

    $input = Get-Content -LiteralPath $GoogleInputLocalPath -Raw | ConvertFrom-Json -Depth 100
    $entry = $input.apps.$App
    Write-Step 'Create or update restricted Maps key'
    Invoke-Checked -Command 'pwsh' -Arguments @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $MapsHelperPath,
        '-ProjectId', 'bthwani-platform',
        '-AppKey', $App,
        '-PackageName', ([string]$appConfig.androidPackage),
        '-Sha1Fingerprint', $sha1,
        '-DisplayName', ([string]$entry.mapsKeyDisplayName),
        '-WriteEnvironmentFile', $MobileEnvPath
    ) | Out-Null

    $inputs = Stage-ProviderInputs
    Sync-EasDevelopmentEnvironment -MapsKey $inputs.MapsKey
    Write-StateStamp -Path $InitializeStampPath -Stage 'Initialize' -MapsKey $inputs.MapsKey -FirebaseKey $inputs.FirebaseKey
    Write-Host "`nPASS: $App initialization completed and EAS provider inputs were synchronized." -ForegroundColor Green
    exit 0
}

Assert-File -Path $CredentialsPath
Assert-File -Path $SecureKeystorePath
$inputs = Stage-ProviderInputs
Assert-StateStamp -Path $InitializeStampPath -ExpectedStage 'Initialize' -MapsKey $inputs.MapsKey -FirebaseKey $inputs.FirebaseKey
Sync-EasDevelopmentEnvironment -MapsKey $inputs.MapsKey

if ($Mode -eq 'Preflight') {
    Remove-Item -LiteralPath $PreflightStampPath -Force -ErrorAction SilentlyContinue
    Write-Step 'Run Preflight'
    Invoke-Checked -Command 'node' -Arguments @(
        $EasEnginePath,
        '--app', $App,
        '--platform', 'android',
        '--profile', 'development',
        '--preflight-only',
        '--non-interactive'
    ) -SecretValues @($inputs.MapsKey, $inputs.FirebaseKey) | Out-Null
    Assert-CleanTrackedTree -Stage 'Preflight cleanup'
    Write-StateStamp -Path $PreflightStampPath -Stage 'Preflight' -MapsKey $inputs.MapsKey -FirebaseKey $inputs.FirebaseKey
    Write-Host "`nPASS: $App Preflight completed. No build was submitted." -ForegroundColor Green
    exit 0
}

Assert-StateStamp -Path $PreflightStampPath -ExpectedStage 'Preflight' -MapsKey $inputs.MapsKey -FirebaseKey $inputs.FirebaseKey
Write-Step 'Submit remote build'
$arguments = @(
    $EasEnginePath,
    '--app', $App,
    '--platform', 'android',
    '--profile', 'development',
    '--skip-preflight',
    '--non-interactive'
)
if ($ClearCache) { $arguments += '--clear-cache' }
Invoke-Checked -Command 'node' -Arguments $arguments -SecretValues @($inputs.MapsKey, $inputs.FirebaseKey) | Out-Null
Write-Host "`nPASS: $App remote EAS build completed." -ForegroundColor Green