# tools/scripts/mobile-eas.ps1
# One Android development workflow for one mobile app at a time.
# Required order: Initialize -> Preflight -> Build.

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

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir '..\..')).Path
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
$StampPath = Join-Path $StampDirectory "$App-development-android.json"

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

function Assert-Directory {
    param([Parameter(Mandatory)][string] $Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        throw "Required directory is missing: $Path"
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

        if ($text -and (-not $Quiet -or $exitCode -ne 0)) {
            Write-Host $text
        }
        if ($exitCode -ne 0) {
            throw "Command failed with exit code ${exitCode}: $Command $($Arguments -join ' ')"
        }
        return $text
    } finally {
        Pop-Location
    }
}

function Convert-EmbeddedJson {
    param([Parameter(Mandatory)][string] $Text)

    for ($start = 0; $start -lt $Text.Length; $start++) {
        if ($Text[$start] -ne '{') { continue }

        $depth = 0
        $inString = $false
        $escaped = $false
        for ($index = $start; $index -lt $Text.Length; $index++) {
            $char = $Text[$index]
            if ($inString) {
                if ($escaped) { $escaped = $false; continue }
                if ($char -eq '\') { $escaped = $true; continue }
                if ($char -eq '"') { $inString = $false }
                continue
            }
            if ($char -eq '"') { $inString = $true; continue }
            if ($char -eq '{') { $depth++; continue }
            if ($char -eq '}') {
                $depth--
                if ($depth -eq 0) {
                    $candidate = $Text.Substring($start, $index - $start + 1)
                    try { return $candidate | ConvertFrom-Json -Depth 100 } catch { break }
                }
            }
        }
    }

    throw 'Command output did not contain a valid JSON object.'
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

function Get-AppSuffix {
    return $App.Replace('-', '_').ToUpperInvariant()
}

function Resolve-ScopedValue {
    param([Parameter(Mandatory)][string] $BaseName)
    $scoped = [Environment]::GetEnvironmentVariable("${BaseName}_$(Get-AppSuffix)", 'Process')
    if (-not [string]::IsNullOrWhiteSpace($scoped)) { return $scoped.Trim() }
    $common = [Environment]::GetEnvironmentVariable($BaseName, 'Process')
    if (-not [string]::IsNullOrWhiteSpace($common)) { return $common.Trim() }
    return $null
}

function Resolve-AppPath {
    param([Parameter(Mandatory)][string] $Path)
    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $AppDir $Path))
}

function Test-ValidMapsKey {
    param([AllowNull()][string] $Value)
    return (
        -not [string]::IsNullOrWhiteSpace($Value) -and
        $Value -notmatch 'placeholder|bthwani_dev_maps_key_placeholder' -and
        $Value -match '^AIza[0-9A-Za-z_-]{20,}$'
    )
}

function Find-Keytool {
    $command = Get-Command keytool -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }

    $candidates = @()
    if (-not [string]::IsNullOrWhiteSpace($env:JAVA_HOME)) {
        $candidates += Join-Path $env:JAVA_HOME 'bin\keytool.exe'
    }
    if (-not [string]::IsNullOrWhiteSpace($env:JDK_HOME)) {
        $candidates += Join-Path $env:JDK_HOME 'bin\keytool.exe'
    }
    if (-not [string]::IsNullOrWhiteSpace($env:ProgramFiles)) {
        $candidates += Join-Path $env:ProgramFiles 'Android\Android Studio\jbr\bin\keytool.exe'
    }

    $match = $candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
    if ([string]::IsNullOrWhiteSpace([string]$match)) {
        throw 'keytool was not found. Install a JDK or Android Studio JBR.'
    }
    return [string]$match
}

function New-RandomSecret {
    $bytes = [byte[]]::new(64)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return ([Convert]::ToBase64String($bytes).Replace('+', 'A').Replace('/', 'B').Replace('=', '')).Substring(0, 40)
}

function Get-KeystoreSha1 {
    param(
        [Parameter(Mandatory)][string] $Keytool,
        [Parameter(Mandatory)][string] $StorePassword,
        [Parameter(Mandatory)][string] $Alias
    )

    $output = Invoke-Checked -Command $Keytool -Arguments @(
        '-J-Duser.language=en', '-list', '-v',
        '-keystore', $SecureKeystorePath,
        '-storepass', $StorePassword,
        '-alias', $Alias
    ) -Quiet -SecretValues @($StorePassword)

    $match = [regex]::Match($output, '(?im)^\s*SHA1:\s*((?:[A-F0-9]{2}:){19}[A-F0-9]{2})\s*$')
    if (-not $match.Success) { throw "Could not read SHA-1 from $SecureKeystorePath" }
    return $match.Groups[1].Value.ToUpperInvariant()
}

function Ensure-Signing {
    $credentialsExists = Test-Path -LiteralPath $CredentialsPath -PathType Leaf
    $keystoreExists = Test-Path -LiteralPath $SecureKeystorePath -PathType Leaf
    if ($credentialsExists -xor $keystoreExists) {
        throw "Incomplete signing state for $App. Both credentials.json and the keystore must exist or both must be absent."
    }

    $keytool = Find-Keytool
    if (-not $credentialsExists) {
        New-Item -ItemType Directory -Path $SecureSigningDirectory -Force | Out-Null
        $storePassword = New-RandomSecret
        $keyPassword = New-RandomSecret
        $alias = "bthwani-$App-development"
        $dname = "CN=$($appConfig.androidPackage), OU=BThwani Development, O=BThwani, L=Sanaa, ST=Sanaa, C=YE"

        Invoke-Checked -Command $keytool -Arguments @(
            '-J-Duser.language=en', '-genkeypair', '-noprompt',
            '-storetype', 'JKS', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
            '-keystore', $SecureKeystorePath,
            '-storepass', $storePassword,
            '-keypass', $keyPassword,
            '-alias', $alias,
            '-dname', $dname
        ) -SecretValues @($storePassword, $keyPassword) | Out-Null

        [ordered]@{
            android = [ordered]@{
                keystore = [ordered]@{
                    keystorePath = $SecureKeystorePath
                    keystorePassword = $storePassword
                    keyAlias = $alias
                    keyPassword = $keyPassword
                }
            }
        } | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $CredentialsPath -Encoding UTF8
    }

    $credentials = Get-Content -LiteralPath $CredentialsPath -Raw | ConvertFrom-Json -Depth 20
    $keystore = $credentials.android.keystore
    if ($null -eq $keystore) { throw "$CredentialsPath does not contain android.keystore." }

    $actualPath = Resolve-AppPath -Path ([string]$keystore.keystorePath)
    $expectedPath = [System.IO.Path]::GetFullPath($SecureKeystorePath)
    if (-not [string]::Equals($actualPath, $expectedPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$CredentialsPath points to an unexpected keystore."
    }

    return Get-KeystoreSha1 `
        -Keytool $keytool `
        -StorePassword ([string]$keystore.keystorePassword) `
        -Alias ([string]$keystore.keyAlias)
}

function Update-GoogleInput {
    param([Parameter(Mandatory)][string] $Sha1)

    if (-not (Test-Path -LiteralPath $GoogleInputLocalPath -PathType Leaf)) {
        Assert-File -Path $GoogleInputExamplePath
        Copy-Item -LiteralPath $GoogleInputExamplePath -Destination $GoogleInputLocalPath
    }

    $input = Get-Content -LiteralPath $GoogleInputLocalPath -Raw | ConvertFrom-Json -Depth 100
    if ($null -eq $input.apps.$App) { throw "$GoogleInputLocalPath does not define $App." }
    $input.apps.$App.sha1Fingerprint = $Sha1
    $input | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $GoogleInputLocalPath -Encoding UTF8
}

function Resolve-FirebaseSource {
    if (Test-Path -LiteralPath $SecretsMapPath -PathType Leaf) {
        $map = Get-Content -LiteralPath $SecretsMapPath -Raw | ConvertFrom-Json -Depth 20
        $entry = $map.PSObject.Properties[$App]
        if ($null -ne $entry) {
            $candidate = [string]$entry.Value
            if (Test-Path -LiteralPath $candidate -PathType Leaf) {
                return (Resolve-Path -LiteralPath $candidate).Path
            }
        }
    }
    if (Test-Path -LiteralPath $SecureFirebasePath -PathType Leaf) {
        return (Resolve-Path -LiteralPath $SecureFirebasePath).Path
    }
    return $null
}

function Refresh-ProviderInputs {
    param([Parameter(Mandatory)][string] $Sha1)

    Write-Step 'Refresh Firebase config for the selected package'
    Invoke-Checked -Command 'pwsh' -Arguments @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $FirebaseHelperPath,
        '-App', $App
    ) | Out-Null

    Assert-File -Path $GoogleInputLocalPath
    $input = Get-Content -LiteralPath $GoogleInputLocalPath -Raw | ConvertFrom-Json -Depth 100
    $appInput = $input.apps.$App
    if ($null -eq $appInput) { throw "$GoogleInputLocalPath does not define $App." }

    Write-Step 'Create or update the package-and-SHA-1-restricted Maps key'
    Invoke-Checked -Command 'pwsh' -Arguments @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $MapsHelperPath,
        '-ProjectId', 'bthwani-platform',
        '-AppKey', $App,
        '-PackageName', ([string]$appConfig.androidPackage),
        '-Sha1Fingerprint', $Sha1,
        '-DisplayName', ([string]$appInput.mapsKeyDisplayName),
        '-WriteEnvironmentFile', $MobileEnvPath
    ) | Out-Null
}

function Assert-ArchivePolicy {
    Assert-File -Path $RuntimeEasIgnorePath
    $rules = @(Get-Content -LiteralPath $RuntimeEasIgnorePath)
    foreach ($required in @('credentials.json', '*.jks', '*.keystore', '!google-services.json', '!.env.local')) {
        if ($rules -notcontains $required) {
            throw "$RuntimeEasIgnorePath must contain '$required'."
        }
    }
}

function Stage-Inputs {
    Assert-ArchivePolicy

    $firebaseSource = Resolve-FirebaseSource
    if ([string]::IsNullOrWhiteSpace($firebaseSource)) {
        throw "Firebase config is missing for $App. Run Initialize first."
    }
    Copy-Item -LiteralPath $firebaseSource -Destination $RuntimeFirebasePath -Force

    $validationText = Invoke-Checked -Command 'node' -Arguments @(
        $FirebaseValidatorPath,
        '--file', $RuntimeFirebasePath,
        '--package', ([string]$appConfig.androidPackage),
        '--json'
    ) -Quiet
    $validation = Convert-EmbeddedJson -Text $validationText
    if ($validation.ok -ne $true -or [string]$validation.projectId -ne 'bthwani-platform') {
        throw "$App Firebase config failed package or project validation."
    }

    Import-EnvFile -Path $MobileEnvPath
    $mapsKey = Resolve-ScopedValue -BaseName 'GOOGLE_MAPS_ANDROID_API_KEY'
    if (-not (Test-ValidMapsKey -Value $mapsKey)) {
        throw "Maps key is missing for $App. Run Initialize first."
    }

    $suffix = Get-AppSuffix
    @(
        '# Generated locally by tools/scripts/mobile-eas.ps1.',
        'GOOGLE_SERVICES_JSON=./google-services.json',
        "GOOGLE_SERVICES_JSON_$suffix=./google-services.json",
        "GOOGLE_MAPS_ANDROID_API_KEY=$mapsKey",
        "GOOGLE_MAPS_ANDROID_API_KEY_$suffix=$mapsKey"
    ) | Set-Content -LiteralPath $RuntimeEnvPath -Encoding UTF8

    [Environment]::SetEnvironmentVariable('GOOGLE_SERVICES_JSON', $RuntimeFirebasePath, 'Process')
    [Environment]::SetEnvironmentVariable("GOOGLE_SERVICES_JSON_$suffix", $RuntimeFirebasePath, 'Process')
    [Environment]::SetEnvironmentVariable('GOOGLE_MAPS_ANDROID_API_KEY', $mapsKey, 'Process')
    [Environment]::SetEnvironmentVariable("GOOGLE_MAPS_ANDROID_API_KEY_$suffix", $mapsKey, 'Process')

    $configText = Invoke-Checked -Command 'pnpm' -Arguments @('exec', 'expo', 'config', '--json') -WorkingDirectory $AppDir -Quiet -SecretValues @($mapsKey)
    $config = Convert-EmbeddedJson -Text $configText
    if ([string]$config.owner -ne [string]$manifest.global.owner) { throw "$App Expo owner mismatch." }
    if ([string]$config.slug -ne [string]$appConfig.slug) { throw "$App Expo slug mismatch." }
    if ([string]$config.extra.eas.projectId -ne [string]$appConfig.projectId) { throw "$App EAS project ID mismatch." }
    if ($config.extra.maps.androidNativeConfigured -ne $true) { throw "$App Android Maps configuration is missing." }

    $resolvedFirebase = Resolve-AppPath -Path ([string]$config.android.googleServicesFile)
    $expectedFirebase = [System.IO.Path]::GetFullPath($RuntimeFirebasePath)
    if (-not [string]::Equals($resolvedFirebase, $expectedFirebase, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$App Expo config does not resolve the staged Firebase file."
    }

    return $mapsKey
}

function Get-HeadCommit {
    return (Invoke-Checked -Command 'git' -Arguments @('rev-parse', 'HEAD') -Quiet).Trim()
}

function Assert-CleanTrackedTree {
    $status = Invoke-Checked -Command 'git' -Arguments @('status', '--porcelain', '--untracked-files=no') -Quiet
    if (-not [string]::IsNullOrWhiteSpace($status)) {
        throw 'Tracked files are modified. Commit or discard them before running this workflow.'
    }
}

function Get-InputState {
    param([Parameter(Mandatory)][string] $MapsKey)
    $mapBytes = [System.Text.Encoding]::UTF8.GetBytes($MapsKey)
    return [ordered]@{
        app = $App
        commit = Get-HeadCommit
        firebaseSha256 = (Get-FileHash -LiteralPath $RuntimeFirebasePath -Algorithm SHA256).Hash.ToLowerInvariant()
        credentialsSha256 = (Get-FileHash -LiteralPath $CredentialsPath -Algorithm SHA256).Hash.ToLowerInvariant()
        mapsSha256 = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($mapBytes)).ToLowerInvariant()
    }
}

function Write-PreflightStamp {
    param([Parameter(Mandatory)][string] $MapsKey)
    New-Item -ItemType Directory -Path $StampDirectory -Force | Out-Null
    $state = Get-InputState -MapsKey $MapsKey
    $state.completedAtUtc = [DateTime]::UtcNow.ToString('o')
    $state | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $StampPath -Encoding UTF8
}

function Assert-PreflightStamp {
    param([Parameter(Mandatory)][string] $MapsKey)
    Assert-File -Path $StampPath
    $saved = Get-Content -LiteralPath $StampPath -Raw | ConvertFrom-Json -Depth 10
    $current = Get-InputState -MapsKey $MapsKey
    foreach ($name in @('app', 'commit', 'firebaseSha256', 'credentialsSha256', 'mapsSha256')) {
        if ([string]$saved.$name -ne [string]$current.$name) {
            throw "Preflight is no longer current ($name changed). Run Preflight again."
        }
    }
}

foreach ($required in @(
    $ManifestPath,
    $FirebaseValidatorPath,
    $FirebaseHelperPath,
    $MapsHelperPath,
    $EasEnginePath
)) {
    Assert-File -Path $required
}
Assert-Directory -Path $AppDir

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -Depth 100
$appConfig = $manifest.apps.$App
if ($null -eq $appConfig) { throw "Mobile manifest does not define $App." }

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' BTHWANI SINGLE-APP ANDROID EAS' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "App:  $App"
Write-Host "Mode: $Mode"

Assert-CleanTrackedTree

if ($Mode -eq 'Initialize') {
    Write-Step 'Prepare or reuse isolated local signing'
    $sha1 = Ensure-Signing
    Update-GoogleInput -Sha1 $sha1
    Refresh-ProviderInputs -Sha1 $sha1
    $null = Stage-Inputs
    Remove-Item -LiteralPath $StampPath -Force -ErrorAction SilentlyContinue
    Write-Host "`nPASS: $App initialization completed. Run Preflight next." -ForegroundColor Green
    exit 0
}

Assert-File -Path $CredentialsPath
Assert-File -Path $SecureKeystorePath
$mapsKey = Stage-Inputs

if ($Mode -eq 'Preflight') {
    Write-Step 'Run Preflight only'
    Remove-Item -LiteralPath $StampPath -Force -ErrorAction SilentlyContinue
    Invoke-Checked -Command 'node' -Arguments @(
        $EasEnginePath,
        '--app', $App,
        '--platform', 'android',
        '--profile', 'development',
        '--preflight-only',
        '--non-interactive'
    ) -SecretValues @($mapsKey) | Out-Null
    Write-PreflightStamp -MapsKey $mapsKey
    Write-Host "`nPASS: $App Preflight completed. No build was submitted." -ForegroundColor Green
    exit 0
}

Write-Step 'Verify the current successful Preflight'
Assert-PreflightStamp -MapsKey $mapsKey

Write-Step 'Submit one remote EAS build'
$arguments = @(
    $EasEnginePath,
    '--app', $App,
    '--platform', 'android',
    '--profile', 'development',
    '--skip-preflight',
    '--non-interactive'
)
if ($ClearCache) { $arguments += '--clear-cache' }
Invoke-Checked -Command 'node' -Arguments $arguments -SecretValues @($mapsKey) | Out-Null
Write-Host "`nPASS: $App remote EAS build was submitted." -ForegroundColor Green
