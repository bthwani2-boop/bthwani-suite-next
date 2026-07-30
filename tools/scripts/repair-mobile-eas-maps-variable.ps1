# tools/scripts/repair-mobile-eas-maps-variable.ps1
# Validate, set, and verify one Android Google Maps API key without printing it.

[CmdletBinding()]
param(
    [ValidateSet("app-client", "app-partner", "app-captain", "app-field")]
    [string] $AppKey = "app-field",

    [string] $ApiKey,

    [ValidateRange(1, 5)]
    [int] $MaxAttempts = 3,

    [switch] $VerifyOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$ManifestPath = Join-Path $RepoRoot "tools\mobile\mobile-apps.manifest.json"
$ReportRoot = Join-Path $RepoRoot ".tmp\mobile-eas-maps-repair"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportDir = Join-Path $ReportRoot "$Timestamp-$AppKey"
$ReportPath = Join-Path $ReportDir "result.txt"
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

function Get-AppEnvironmentSuffix {
    param([Parameter(Mandatory)][string] $Key)
    return $Key.Replace("-", "_").ToUpperInvariant()
}

function Get-ConfiguredApiKey {
    param([Parameter(Mandatory)][string] $Key)

    if (-not [string]::IsNullOrWhiteSpace($ApiKey)) { return $ApiKey.Trim() }

    $suffix = Get-AppEnvironmentSuffix -Key $Key
    $scoped = [Environment]::GetEnvironmentVariable("GOOGLE_MAPS_ANDROID_API_KEY_${suffix}", "Process")
    if (-not [string]::IsNullOrWhiteSpace($scoped)) { return $scoped.Trim() }

    $common = [Environment]::GetEnvironmentVariable("GOOGLE_MAPS_ANDROID_API_KEY", "Process")
    if (-not [string]::IsNullOrWhiteSpace($common)) { return $common.Trim() }

    return $null
}

function Invoke-EasCommand {
    param(
        [Parameter(Mandatory)][string[]] $Arguments,
        [Parameter(Mandatory)][string] $WorkingDirectory,
        [hashtable] $EnvironmentOverrides = @{},
        [string[]] $SecretValues = @()
    )

    $previous = @{}
    foreach ($name in $EnvironmentOverrides.Keys) {
        $previous[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
        [Environment]::SetEnvironmentVariable($name, [string]$EnvironmentOverrides[$name], "Process")
    }

    Push-Location -LiteralPath $WorkingDirectory
    try {
        $global:LASTEXITCODE = 0
        $output = & pnpm dlx eas-cli@latest @Arguments 2>&1
        $exitCode = if ($null -eq $global:LASTEXITCODE) { 0 } else { [int]$global:LASTEXITCODE }
        $text = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
        foreach ($secretValue in $SecretValues) {
            if (-not [string]::IsNullOrWhiteSpace($secretValue)) {
                $text = $text.Replace($secretValue, "<redacted>")
            }
        }
        return [pscustomobject]@{ ExitCode = $exitCode; Text = $text }
    } finally {
        Pop-Location
        foreach ($name in $EnvironmentOverrides.Keys) {
            [Environment]::SetEnvironmentVariable($name, $previous[$name], "Process")
        }
    }
}

function Invoke-WithRetry {
    param(
        [Parameter(Mandatory)][scriptblock] $Operation,
        [Parameter(Mandatory)][string] $Label
    )

    $last = $null
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        Write-Host "$Label attempt $attempt/$MaxAttempts" -ForegroundColor Yellow
        $last = & $Operation
        if ($last.ExitCode -eq 0) { return $last }
        if ($attempt -lt $MaxAttempts) { Start-Sleep -Seconds (3 * $attempt) }
    }
    return $last
}

function Get-RemoteVariable {
    param([Parameter(Mandatory)][string] $WorkingDirectory)

    return Invoke-EasCommand -WorkingDirectory $WorkingDirectory -Arguments @(
        "env:get", "development",
        "--variable-name", "GOOGLE_MAPS_ANDROID_API_KEY",
        "--scope", "project",
        "--format", "long",
        "--non-interactive"
    )
}

function Test-ReactNativeMapsPlugin {
    param([AllowNull()] $Plugins)

    foreach ($plugin in @($Plugins)) {
        if ($plugin -is [string] -and $plugin -eq "react-native-maps") { return $true }
        if ($plugin -is [System.Collections.IList] -and $plugin.Count -gt 0 -and [string]$plugin[0] -eq "react-native-maps") { return $true }
    }
    return $false
}

function Test-AndroidGoogleMapsConfig {
    param([Parameter(Mandatory)] $Config)

    if ($null -eq $Config.android) { return $false }
    if ($null -eq $Config.android.config) { return $false }
    if ($null -eq $Config.android.config.googleMaps) { return $false }

    $configuredApiKey = [string]$Config.android.config.googleMaps.apiKey
    return -not [string]::IsNullOrWhiteSpace($configuredApiKey)
}

if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
    throw "Required mobile manifest is missing: $ManifestPath"
}

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -Depth 100
$app = $manifest.apps.$AppKey
if ($null -eq $app) { throw "Unknown app key: $AppKey" }

$features = @($app.features)
if ($features -notcontains "maps") {
    throw "$AppKey does not declare the native maps capability in the mobile manifest."
}

$appDirectory = Join-Path $RepoRoot "apps\$AppKey\runtime"
$expectedPackage = [string]$app.androidPackage
$slug = [string]$app.slug
$easProjectId = [string]$app.projectId
$suffix = Get-AppEnvironmentSuffix -Key $AppKey

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " BTHWANI EAS GOOGLE MAPS KEY SETUP" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "App:        $AppKey"
Write-Host "Slug:       $slug"
Write-Host "Project ID: $easProjectId"
Write-Host "Package:    $expectedPackage"
Write-Host "Mode:       $(if ($VerifyOnly) { 'VERIFY ONLY' } else { 'VERIFY + SET' })`n"

$whoami = Invoke-WithRetry -Label "EAS authentication" -Operation {
    Invoke-EasCommand -WorkingDirectory $appDirectory -Arguments @("whoami")
}
if ($whoami.ExitCode -ne 0) { throw "EAS authentication/API query failed after $MaxAttempts attempts.`n$($whoami.Text)" }
Write-Host "PASS: EAS authentication succeeded." -ForegroundColor Green

$before = Invoke-WithRetry -Label "EAS GOOGLE_MAPS_ANDROID_API_KEY metadata query" -Operation {
    Get-RemoteVariable -WorkingDirectory $appDirectory
}
$beforeExists = $before.ExitCode -eq 0

if ($VerifyOnly) {
    if (-not $beforeExists) {
        throw "GOOGLE_MAPS_ANDROID_API_KEY could not be proven in the $AppKey development environment.`n$($before.Text)"
    }

    @(
        "PASS: GOOGLE_MAPS_ANDROID_API_KEY exists",
        "App: $AppKey",
        "Slug: $slug",
        "Project ID: $easProjectId",
        "Package: $expectedPackage",
        "Environment: development",
        "Value: intentionally not recorded"
    ) | Set-Content -LiteralPath $ReportPath -Encoding UTF8

    Write-Host "PASS: GOOGLE_MAPS_ANDROID_API_KEY exists in the $AppKey EAS development environment." -ForegroundColor Green
    Write-Host "Report: $ReportPath"
    return
}

$resolvedApiKey = Get-ConfiguredApiKey -Key $AppKey
if ([string]::IsNullOrWhiteSpace($resolvedApiKey)) {
    throw "Provide -ApiKey or set GOOGLE_MAPS_ANDROID_API_KEY_${suffix} in the current PowerShell process."
}
if ($resolvedApiKey -notmatch '^AIza[0-9A-Za-z_-]{20,}$') {
    throw "The supplied Google Maps Android API key does not have the expected Google API key format."
}

$environmentOverrides = @{
    "GOOGLE_MAPS_ANDROID_API_KEY" = $resolvedApiKey
    "GOOGLE_MAPS_ANDROID_API_KEY_${suffix}" = $resolvedApiKey
}

$setResult = Invoke-WithRetry -Label "EAS Google Maps sensitive-key set" -Operation {
    Invoke-EasCommand -WorkingDirectory $appDirectory -SecretValues @($resolvedApiKey) -EnvironmentOverrides $environmentOverrides -Arguments @(
        "env:set", "development",
        "--name", "GOOGLE_MAPS_ANDROID_API_KEY",
        "--value", $resolvedApiKey,
        "--type", "string",
        "--visibility", "sensitive",
        "--scope", "project",
        "--non-interactive"
    )
}
if ($setResult.ExitCode -ne 0) {
    throw "EAS Google Maps variable set failed after $MaxAttempts attempts.`n$($setResult.Text)"
}

$after = Invoke-WithRetry -Label "Post-set EAS metadata verification" -Operation {
    Get-RemoteVariable -WorkingDirectory $appDirectory
}
if ($after.ExitCode -ne 0) {
    throw "The set command returned success, but GOOGLE_MAPS_ANDROID_API_KEY could not be verified.`n$($after.Text)"
}

$previousCommonMapsKey = [Environment]::GetEnvironmentVariable("GOOGLE_MAPS_ANDROID_API_KEY", "Process")
$previousScopedMapsKey = [Environment]::GetEnvironmentVariable("GOOGLE_MAPS_ANDROID_API_KEY_${suffix}", "Process")
$nativeMapsConfigProof = "unproven"
try {
    [Environment]::SetEnvironmentVariable("GOOGLE_MAPS_ANDROID_API_KEY", $resolvedApiKey, "Process")
    [Environment]::SetEnvironmentVariable("GOOGLE_MAPS_ANDROID_API_KEY_${suffix}", $resolvedApiKey, "Process")
    Push-Location -LiteralPath $appDirectory
    try {
        $configOutput = & pnpm exec expo config --json 2>&1
        $configExitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    } finally {
        Pop-Location
    }

    $configText = (($configOutput | ForEach-Object { [string]$_ }) -join "`n").Trim().Replace($resolvedApiKey, "<redacted>")
    $jsonStart = $configText.IndexOf("{")
    if ($configExitCode -ne 0 -or $jsonStart -lt 0) {
        throw "Expo config verification failed after the EAS variable set.`n$configText"
    }

    $config = $configText.Substring($jsonStart) | ConvertFrom-Json -Depth 100
    $hasMapsPlugin = Test-ReactNativeMapsPlugin -Plugins $config.plugins
    $hasAndroidMapsConfig = Test-AndroidGoogleMapsConfig -Config $config

    if ($config.extra.maps.androidNativeConfigured -ne $true) {
        throw "Expo config did not mark Android maps as natively configured."
    }
    if (-not ($hasMapsPlugin -or $hasAndroidMapsConfig)) {
        throw "Expo config did not expose a Google Maps Android native config path."
    }

    $nativeMapsConfigProof = if ($hasMapsPlugin) { "react-native-maps config plugin" } else { "android.config.googleMaps.apiKey" }
} finally {
    [Environment]::SetEnvironmentVariable("GOOGLE_MAPS_ANDROID_API_KEY", $previousCommonMapsKey, "Process")
    [Environment]::SetEnvironmentVariable("GOOGLE_MAPS_ANDROID_API_KEY_${suffix}", $previousScopedMapsKey, "Process")
}

@(
    "PASS: GOOGLE_MAPS_ANDROID_API_KEY set and verified",
    "App: $AppKey",
    "Slug: $slug",
    "Project ID: $easProjectId",
    "Package: $expectedPackage",
    "Visibility: sensitive",
    "Type: string",
    "Environment: development",
    "Expo Google Maps config path: $nativeMapsConfigProof",
    "Expo Android native maps flag: true",
    "Value: intentionally not recorded"
) | Set-Content -LiteralPath $ReportPath -Encoding UTF8

Write-Host "`nPASS: Google Maps Android configuration was set and verified for $AppKey." -ForegroundColor Green
Write-Host "Report: $ReportPath"
