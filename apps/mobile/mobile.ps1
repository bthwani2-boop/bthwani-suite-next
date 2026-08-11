[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('app-client', 'app-partner', 'app-captain', 'app-field')]
    [string] $App,

    [Parameter(Mandatory)]
    [ValidateSet('Run', 'Initialize', 'Preflight', 'Build')]
    [string] $Mode,

    [switch] $ClearCache,
    [switch] $MirrorDevice
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$SourceIntegrityGuard = Join-Path $RepoRoot 'tools\guards\source-integrity-gate.mjs'
$EasScript = Join-Path $PSScriptRoot 'eas.ps1'
$EnsureRuntimeScript = Join-Path $PSScriptRoot 'ensure-mobile-dev-runtime.ps1'
$RuntimeScript = Join-Path $PSScriptRoot 'start-mobile-runtime.ps1'
$MobileEnvFile = Join-Path $RepoRoot 'infra\local\mobile.env'
$AdbHelper = Join-Path $PSScriptRoot 'mobile-adb.ps1'

if (-not (Test-Path -LiteralPath $SourceIntegrityGuard -PathType Leaf)) {
    throw "Source-integrity guard not found: $SourceIntegrityGuard"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js is required to verify repository source integrity before mobile runtime execution.'
}

& node $SourceIntegrityGuard
if ($LASTEXITCODE -ne 0) {
    throw 'Repository source integrity failed. Resolve the reported merge state before running any mobile surface.'
}

function Get-BthwaniMobileEnvValue {
    param([Parameter(Mandatory)][string] $Name)

    $processValue = [Environment]::GetEnvironmentVariable($Name, 'Process')
    if (-not [string]::IsNullOrWhiteSpace($processValue)) {
        return $processValue.Trim()
    }

    if (-not (Test-Path -LiteralPath $MobileEnvFile -PathType Leaf)) {
        return ''
    }

    foreach ($rawLine in Get-Content -LiteralPath $MobileEnvFile) {
        $line = $rawLine.Trim()
        if (-not $line -or $line.StartsWith('#') -or -not $line.Contains('=')) {
            continue
        }
        $parts = $line.Split('=', 2)
        if ($parts[0].Trim() -ne $Name) {
            continue
        }
        $value = $parts[1].Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        return $value
    }

    return ''
}

function Select-BthwaniVerifiedWindowsUsbTransport {
    if (-not $IsWindows) {
        return
    }

    $effectiveTransport = (Get-BthwaniMobileEnvValue -Name 'BTHWANI_MOBILE_TRANSPORT').Trim().ToLowerInvariant()
    if ($effectiveTransport -and $effectiveTransport -ne 'auto') {
        return
    }

    $effectivePlatform = (Get-BthwaniMobileEnvValue -Name 'BTHWANI_MOBILE_PLATFORM').Trim().ToLowerInvariant()
    if ($effectivePlatform -eq 'ios') {
        return
    }

    if (-not (Test-Path -LiteralPath $AdbHelper -PathType Leaf)) {
        return
    }

    try {
        . $AdbHelper
        $adbPath = Resolve-BthwaniAdb
        Start-BthwaniAdbServer -AdbPath $adbPath
        $devices = @(Get-BthwaniAndroidDevices -AdbPath $adbPath)
        $usbDevices = @($devices | Where-Object { $_.State -eq 'device' -and -not $_.IsTcpIp })
        if ($usbDevices.Count -ne 1) {
            return
        }

        $env:BTHWANI_MOBILE_TRANSPORT = 'adb'
        $env:BTHWANI_MOBILE_PLATFORM = 'android'
        $env:BTHWANI_ANDROID_SERIAL = [string] $usbDevices[0].Serial
        Write-Host "Auto transport: verified USB Android $($usbDevices[0].Serial); using ADB reverse." -ForegroundColor DarkGray
    } catch {
        Write-Host "Auto transport: USB ADB preflight unavailable; continuing with canonical LAN-first resolution. $($_.Exception.Message)" -ForegroundColor DarkGray
    }
}

if ($Mode -eq 'Run') {
    $ports = @{
        'app-client' = 18101
        'app-partner' = 18102
        'app-captain' = 18103
        'app-field' = 18104
    }

    Select-BthwaniVerifiedWindowsUsbTransport

    & $EnsureRuntimeScript
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    & $RuntimeScript `
        -AppKey $App `
        -MetroPort $ports[$App] `
        -ClearCache:$ClearCache `
        -MirrorDevice:$MirrorDevice
    exit $LASTEXITCODE
}

& $EasScript -App $App -Mode $Mode -ClearCache:$ClearCache
exit $LASTEXITCODE
