# tools/scripts/bootstrap-mobile-eas-android-development.ps1
# Non-interactive Android development bootstrap for all four BThwani mobile apps.
# Generates local signing credentials outside Git, derives SHA-1 fingerprints,
# prepares Firebase/FCM/Maps, verifies EAS project linkage from Expo config,
# and runs the remote-build preflight.

[CmdletBinding()]
param(
    [string] $EasCliVersion = 'latest',
    [string] $SigningRoot = 'C:\bthwani-secrets\eas\android',
    [switch] $ForceRegenerateSigning,
    [switch] $SubmitBuilds
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir '..\..')).Path
$ManifestPath = Join-Path $RepoRoot 'tools\mobile\mobile-apps.manifest.json'
$GoogleInputExamplePath = Join-Path $RepoRoot 'tools\scripts\google-cloud\google-platform-input.example.json'
$GoogleInputLocalPath = Join-Path $RepoRoot 'tools\scripts\google-cloud\google-platform-input.local.json'
$PrepareFcmScript = Join-Path $RepoRoot 'tools\scripts\google-cloud\prepare-fcm-v1-service-account.ps1'
$GooglePlatformScript = Join-Path $RepoRoot 'tools\scripts\google-cloud\invoke-google-platform-all-surfaces.ps1'
$AppKeys = @('app-client', 'app-partner', 'app-captain', 'app-field')

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

function Add-ExecutableDirectoryToPath {
    param(
        [Parameter(Mandatory)][string] $CommandName,
        [Parameter(Mandatory)][string[]] $Candidates
    )

    $existing = Get-Command $CommandName -ErrorAction SilentlyContinue
    if ($existing) { return $existing.Source }

    $resolved = $Candidates |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        Select-Object -Unique |
        Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } |
        Select-Object -First 1

    if ([string]::IsNullOrWhiteSpace([string]$resolved)) {
        throw "$CommandName was not found on PATH or in the supported Windows installation paths."
    }

    $directory = Split-Path -Parent $resolved
    $separator = [System.IO.Path]::PathSeparator
    $entries = @($env:Path -split [regex]::Escape([string]$separator))
    if ($entries -notcontains $directory) {
        $env:Path = "$directory$separator$env:Path"
    }

    $command = Get-Command $CommandName -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "$CommandName was found at '$resolved' but could not be resolved after updating PATH."
    }
    return $command.Source
}

function Resolve-Gcloud {
    $candidates = [System.Collections.Generic.List[string]]::new()
    if (-not [string]::IsNullOrWhiteSpace($env:CLOUDSDK_ROOT_DIR)) {
        $candidates.Add((Join-Path $env:CLOUDSDK_ROOT_DIR 'bin\gcloud.cmd'))
        $candidates.Add((Join-Path $env:CLOUDSDK_ROOT_DIR 'google-cloud-sdk\bin\gcloud.cmd'))
    }
    if (-not [string]::IsNullOrWhiteSpace(${env:ProgramFiles(x86)})) {
        $candidates.Add((Join-Path ${env:ProgramFiles(x86)} 'Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'))
    }
    if (-not [string]::IsNullOrWhiteSpace($env:ProgramFiles)) {
        $candidates.Add((Join-Path $env:ProgramFiles 'Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'))
    }
    if (-not [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
        $candidates.Add((Join-Path $env:LOCALAPPDATA 'Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'))
    }
    $candidates.Add('C:\GoogleCloudSDK\google-cloud-sdk\bin\gcloud.cmd')
    return Add-ExecutableDirectoryToPath -CommandName 'gcloud' -Candidates $candidates.ToArray()
}

function Resolve-Keytool {
    $candidates = [System.Collections.Generic.List[string]]::new()
    if (-not [string]::IsNullOrWhiteSpace($env:JAVA_HOME)) {
        $candidates.Add((Join-Path $env:JAVA_HOME 'bin\keytool.exe'))
    }
    if (-not [string]::IsNullOrWhiteSpace($env:JDK_HOME)) {
        $candidates.Add((Join-Path $env:JDK_HOME 'bin\keytool.exe'))
    }
    if (-not [string]::IsNullOrWhiteSpace($env:ProgramFiles)) {
        foreach ($parent in @('Java', 'Eclipse Adoptium', 'Microsoft')) {
            $javaRoot = Join-Path $env:ProgramFiles $parent
            if (Test-Path -LiteralPath $javaRoot -PathType Container) {
                Get-ChildItem -LiteralPath $javaRoot -Directory -ErrorAction SilentlyContinue |
                    Sort-Object Name -Descending |
                    ForEach-Object { $candidates.Add((Join-Path $_.FullName 'bin\keytool.exe')) }
            }
        }
        $androidStudioJbr = Join-Path $env:ProgramFiles 'Android\Android Studio\jbr\bin\keytool.exe'
        $candidates.Add($androidStudioJbr)
    }
    if (-not [string]::IsNullOrWhiteSpace(${env:ProgramFiles(x86)})) {
        foreach ($parent in @('Java', 'Eclipse Adoptium', 'Microsoft')) {
            $javaRoot = Join-Path ${env:ProgramFiles(x86)} $parent
            if (Test-Path -LiteralPath $javaRoot -PathType Container) {
                Get-ChildItem -LiteralPath $javaRoot -Directory -ErrorAction SilentlyContinue |
                    Sort-Object Name -Descending |
                    ForEach-Object { $candidates.Add((Join-Path $_.FullName 'bin\keytool.exe')) }
            }
        }
    }
    if (-not [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
        foreach ($parent in @('Programs\Eclipse Adoptium', 'Programs\Microsoft')) {
            $javaRoot = Join-Path $env:LOCALAPPDATA $parent
            if (Test-Path -LiteralPath $javaRoot -PathType Container) {
                Get-ChildItem -LiteralPath $javaRoot -Directory -ErrorAction SilentlyContinue |
                    Sort-Object Name -Descending |
                    ForEach-Object { $candidates.Add((Join-Path $_.FullName 'bin\keytool.exe')) }
            }
        }
    }
    return Add-ExecutableDirectoryToPath -CommandName 'keytool' -Candidates $candidates.ToArray()
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory)][string] $Command,
        [Parameter(Mandatory)][AllowEmptyCollection()][string[]] $Arguments,
        [string] $WorkingDirectory = $RepoRoot,
        [switch] $Capture
    )

    Push-Location -LiteralPath $WorkingDirectory
    try {
        $global:LASTEXITCODE = 0
        if ($Capture) {
            $output = & $Command @Arguments 2>&1
            $exitCode = if ($null -eq $global:LASTEXITCODE) { 0 } else { [int]$global:LASTEXITCODE }
            $text = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
            if ($exitCode -ne 0) {
                throw "Command failed with exit code ${exitCode}: $Command $($Arguments -join ' ')`n$text"
            }
            return $text
        }

        Write-Host "> $Command $($Arguments -join ' ')" -ForegroundColor DarkGray
        & $Command @Arguments
        $exitCode = if ($null -eq $global:LASTEXITCODE) { 0 } else { [int]$global:LASTEXITCODE }
        if ($exitCode -ne 0) {
            throw "Command failed with exit code ${exitCode}: $Command $($Arguments -join ' ')"
        }
    } finally {
        Pop-Location
    }
}

function Invoke-Eas {
    param(
        [Parameter(Mandatory)][string] $AppDirectory,
        [Parameter(Mandatory)][AllowEmptyCollection()][string[]] $Arguments,
        [switch] $Capture
    )
    $fullArguments = @('dlx', "eas-cli@$EasCliVersion") + $Arguments
    return Invoke-Checked -Command 'pnpm' -Arguments $fullArguments -WorkingDirectory $AppDirectory -Capture:$Capture
}

function New-RandomSecret {
    param([ValidateRange(24, 128)][int] $Length = 40)
    $bytes = [byte[]]::new(64)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $value = [Convert]::ToBase64String($bytes).Replace('+', 'A').Replace('/', 'B').Replace('=', '')
    return $value.Substring(0, $Length)
}

function Get-KeystoreSha1 {
    param(
        [Parameter(Mandatory)][string] $KeytoolPath,
        [Parameter(Mandatory)][string] $KeystorePath,
        [Parameter(Mandatory)][string] $StorePassword,
        [Parameter(Mandatory)][string] $Alias
    )

    $output = Invoke-Checked -Command $KeytoolPath -Arguments @(
        '-J-Duser.language=en',
        '-list', '-v',
        '-keystore', $KeystorePath,
        '-storepass', $StorePassword,
        '-alias', $Alias
    ) -Capture

    $match = [regex]::Match($output, '(?im)^\s*SHA1:\s*((?:[A-F0-9]{2}:){19}[A-F0-9]{2})\s*$')
    if (-not $match.Success) {
        throw "Could not derive SHA-1 from keystore: $KeystorePath"
    }
    return $match.Groups[1].Value.ToUpperInvariant()
}

function Ensure-AppSigningCredential {
    param(
        [Parameter(Mandatory)][string] $KeytoolPath,
        [Parameter(Mandatory)][string] $AppKey,
        [Parameter(Mandatory)] $App
    )

    $appDirectory = Join-Path $RepoRoot "apps\$AppKey\runtime"
    $credentialsPath = Join-Path $appDirectory 'credentials.json'
    $credentialDirectory = Join-Path $SigningRoot $AppKey
    $keystorePath = Join-Path $credentialDirectory 'development.jks'
    $alias = "bthwani-$AppKey-development"

    $credentialsExists = Test-Path -LiteralPath $credentialsPath -PathType Leaf
    $keystoreExists = Test-Path -LiteralPath $keystorePath -PathType Leaf

    if ($ForceRegenerateSigning) {
        if ($credentialsExists) { Remove-Item -LiteralPath $credentialsPath -Force }
        if ($keystoreExists) { Remove-Item -LiteralPath $keystorePath -Force }
        $credentialsExists = $false
        $keystoreExists = $false
    }

    if ($credentialsExists -xor $keystoreExists) {
        throw "$AppKey has incomplete local signing state. Re-run with -ForceRegenerateSigning to replace it safely."
    }

    if (-not $credentialsExists) {
        New-Item -ItemType Directory -Force -Path $credentialDirectory | Out-Null
        $storePassword = New-RandomSecret
        $keyPassword = New-RandomSecret
        $dname = "CN=$($App.androidPackage), OU=BThwani Development, O=BThwani, L=Sanaa, ST=Sanaa, C=YE"

        Write-Host "Generating isolated Android development keystore for $AppKey" -ForegroundColor Yellow
        Invoke-Checked -Command $KeytoolPath -Arguments @(
            '-J-Duser.language=en',
            '-genkeypair',
            '-noprompt',
            '-storetype', 'JKS',
            '-keyalg', 'RSA',
            '-keysize', '2048',
            '-validity', '10000',
            '-keystore', $keystorePath,
            '-storepass', $storePassword,
            '-keypass', $keyPassword,
            '-alias', $alias,
            '-dname', $dname
        )

        $credentials = [ordered]@{
            android = [ordered]@{
                keystore = [ordered]@{
                    keystorePath = $keystorePath
                    keystorePassword = $storePassword
                    keyAlias = $alias
                    keyPassword = $keyPassword
                }
            }
        }
        $credentials | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $credentialsPath -Encoding utf8
    }

    $stored = Get-Content -LiteralPath $credentialsPath -Raw | ConvertFrom-Json -Depth 20
    $keystore = $stored.android.keystore
    if ($null -eq $keystore) { throw "$AppKey credentials.json does not contain android.keystore." }
    if ([System.IO.Path]::GetFullPath([string]$keystore.keystorePath) -ne [System.IO.Path]::GetFullPath($keystorePath)) {
        throw "$AppKey credentials.json points to an unexpected keystore path."
    }

    $sha1 = Get-KeystoreSha1 `
        -KeytoolPath $KeytoolPath `
        -KeystorePath $keystorePath `
        -StorePassword ([string]$keystore.keystorePassword) `
        -Alias ([string]$keystore.keyAlias)

    return [pscustomobject]@{
        AppKey = $AppKey
        AppDirectory = $appDirectory
        CredentialsPath = $credentialsPath
        KeystorePath = $keystorePath
        Sha1 = $sha1
    }
}

function Get-ExpoConfig {
    param([Parameter(Mandatory)][string] $AppDirectory)
    $text = Invoke-Checked -Command 'pnpm' -Arguments @('exec', 'expo', 'config', '--json') -WorkingDirectory $AppDirectory -Capture
    $jsonStart = $text.IndexOf('{')
    if ($jsonStart -lt 0) { throw "Expo config did not return JSON for $AppDirectory" }
    return $text.Substring($jsonStart) | ConvertFrom-Json -Depth 100
}

foreach ($required in @(
    $ManifestPath,
    $GoogleInputExamplePath,
    $PrepareFcmScript,
    $GooglePlatformScript
)) {
    Assert-File -Path $required
}

$env:CI = '1'
$env:EXPO_NO_TELEMETRY = '1'

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' BTHWANI ANDROID EAS DEVELOPMENT — NON-INTERACTIVE BOOTSTRAP' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "Repository:       $RepoRoot"
Write-Host "Signing root:     $SigningRoot"
Write-Host "EAS CLI:          $EasCliVersion"
Write-Host "Submit builds:    $SubmitBuilds"
Write-Host "Regenerate keys:  $ForceRegenerateSigning"

Write-Step 'Resolve required local tools'
$keytoolPath = Resolve-Keytool
$gcloudPath = Resolve-Gcloud
Write-Host "keytool: $keytoolPath" -ForegroundColor Green
Write-Host "gcloud:  $gcloudPath" -ForegroundColor Green

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -Depth 100

Write-Step 'Verify existing EAS authentication without prompts'
$firstAppDirectory = Join-Path $RepoRoot 'apps\app-client\runtime'
$whoami = Invoke-Eas -AppDirectory $firstAppDirectory -Arguments @('whoami') -Capture
if ([string]::IsNullOrWhiteSpace($whoami)) { throw 'EAS authentication could not be proven.' }
Write-Host "EAS account: $whoami" -ForegroundColor Green

Write-Step 'Verify all four configured EAS projects from Expo config'
foreach ($appKey in $AppKeys) {
    $app = $manifest.apps.$appKey
    if ($null -eq $app) { throw "Mobile manifest does not define $appKey." }
    $appDirectory = Join-Path $RepoRoot "apps\$appKey\runtime"
    $config = Get-ExpoConfig -AppDirectory $appDirectory

    if ([string]$config.owner -ne [string]$manifest.global.owner) {
        throw "$appKey owner mismatch. Expected '$($manifest.global.owner)', found '$($config.owner)'."
    }
    if ([string]$config.slug -ne [string]$app.slug) {
        throw "$appKey slug mismatch. Expected '$($app.slug)', found '$($config.slug)'."
    }
    if ([string]$config.extra.eas.projectId -ne [string]$app.projectId) {
        throw "$appKey EAS project ID mismatch. Expected '$($app.projectId)'."
    }

    Write-Host "PASS: $appKey -> @$($config.owner)/$($config.slug) [$($app.projectId)]" -ForegroundColor Green
}

Write-Step 'Generate or reuse isolated local Android signing credentials'
$googleInput = Get-Content -LiteralPath $GoogleInputExamplePath -Raw | ConvertFrom-Json -AsHashtable -Depth 100
foreach ($appKey in $AppKeys) {
    $app = $manifest.apps.$appKey
    $signing = Ensure-AppSigningCredential -KeytoolPath $keytoolPath -AppKey $appKey -App $app
    $googleInput.apps[$appKey].sha1Fingerprint = $signing.Sha1
    Write-Host "PASS: $appKey SHA-1 $($signing.Sha1)" -ForegroundColor Green
}
$googleInput | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $GoogleInputLocalPath -Encoding utf8
Write-Host "PASS: generated ignored Google platform input: $GoogleInputLocalPath" -ForegroundColor Green

Write-Step 'Prepare central FCM V1 service account and secure local key'
Invoke-Checked -Command 'pwsh' -Arguments @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $PrepareFcmScript,
    '-Apply'
)

Write-Step 'Prepare Firebase apps, upload Firebase files, create restricted Maps keys, and run Google platform gate'
Invoke-Checked -Command 'pwsh' -Arguments @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $GooglePlatformScript,
    '-Phase', 'All',
    '-Apply',
    '-UploadMapsToEas'
)

Write-Step 'Run complete all-app Android EAS preflight'
Invoke-Checked -Command 'pnpm' -Arguments @('mobile:eas:preflight:all:dev')

if ($SubmitBuilds) {
    Write-Step 'Submit all four Android development builds to EAS Remote Build'
    Invoke-Checked -Command 'node' -Arguments @(
        'tools/scripts/eas-build-mobile.mjs',
        '--all',
        '--platform', 'android',
        '--profile', 'development',
        '--non-interactive'
    )
}

Write-Host "`nPASS: non-interactive Android EAS development bootstrap completed for all four apps." -ForegroundColor Green
if (-not $SubmitBuilds) {
    Write-Host 'Remote builds were not submitted. Re-run this script with -SubmitBuilds only after GitHub CI is green.' -ForegroundColor Cyan
}
