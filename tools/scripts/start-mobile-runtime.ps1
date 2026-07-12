param(
    [Parameter(Mandatory)]
    [ValidateSet("app-client", "app-partner", "app-captain", "app-field")]
    [string] $AppKey,

    [Parameter(Mandatory)]
    [ValidateRange(1024, 65535)]
    [int] $MetroPort,

    [switch] $NeedsDevStoreId,
    [switch] $ClearCache,
    [switch] $MirrorDevice
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$RuntimeDir = Join-Path $RepoRoot "apps\$AppKey\runtime"
$AdbHelper = Join-Path $PSScriptRoot "mobile-adb.ps1"

if (-not (Test-Path -LiteralPath $RuntimeDir)) {
    throw "Runtime directory not found: $RuntimeDir"
}
if (-not (Test-Path -LiteralPath $AdbHelper)) {
    throw "ADB helper not found: $AdbHelper"
}

. $AdbHelper
Set-Location -LiteralPath $RuntimeDir

$DefaultRoute = Get-NetRoute `
    -AddressFamily IPv4 `
    -DestinationPrefix "0.0.0.0/0" `
    -ErrorAction Stop |
    Sort-Object RouteMetric, InterfaceMetric |
    Select-Object -First 1

if (-not $DefaultRoute) {
    throw "No active IPv4 default route was found."
}

$HostAddress = Get-NetIPAddress `
    -AddressFamily IPv4 `
    -InterfaceIndex $DefaultRoute.InterfaceIndex `
    -ErrorAction Stop |
    Where-Object {
        -not $_.SkipAsSource -and
        $_.IPAddress -notmatch "^(127\.|169\.254\.)"
    } |
    Select-Object -First 1

if (-not $HostAddress) {
    throw "No usable IPv4 address was found on the active network interface."
}

$env:REACT_NATIVE_PACKAGER_HOSTNAME = $HostAddress.IPAddress
$env:EXPO_PUBLIC_DSH_API_BASE_URL      = "http://127.0.0.1:58080"
$env:NEXT_PUBLIC_DSH_API_BASE_URL      = "http://127.0.0.1:58080"
$env:EXPO_PUBLIC_IDENTITY_API_BASE_URL = "http://127.0.0.1:58082"
$env:NEXT_PUBLIC_IDENTITY_API_BASE_URL = "http://127.0.0.1:58082"
$env:EXPO_PUBLIC_WLT_API_BASE_URL      = "http://127.0.0.1:58083"
$env:NEXT_PUBLIC_WLT_API_BASE_URL      = "http://127.0.0.1:58083"
$env:EXPO_PUBLIC_WORKFORCE_API_BASE_URL = "http://127.0.0.1:58086"
$env:NEXT_PUBLIC_WORKFORCE_API_BASE_URL = "http://127.0.0.1:58086"

if ($NeedsDevStoreId) {
    try {
        $StoreResponse = Invoke-RestMethod `
            -Uri "http://127.0.0.1:58080/dsh/stores?limit=1&offset=0" `
            -TimeoutSec 3 `
            -ErrorAction Stop

        $StoreId = [string] $StoreResponse.stores[0].id
        if ([string]::IsNullOrWhiteSpace($StoreId)) {
            throw "DSH returned an empty store ID."
        }
        $env:EXPO_PUBLIC_DEV_STORE_ID = $StoreId
    }
    catch {
        if ($env:BTHWANI_ALLOW_DEV_STORE_FALLBACK -eq "1") {
            $env:EXPO_PUBLIC_DEV_STORE_ID = "store-1005"
            Write-Warning "DSH store lookup failed; explicit fallback enabled: $($_.Exception.Message)"
        }
        else {
            throw "DSH store lookup failed. Start the runtime services, or explicitly set BTHWANI_ALLOW_DEV_STORE_FALLBACK=1. Cause: $($_.Exception.Message)"
        }
    }
}

$AdbPath = Resolve-BthwaniAdb
& $AdbPath start-server
if ($LASTEXITCODE -ne 0) {
    throw "ADB server failed to start."
}

$Devices = Get-BthwaniAndroidDevices -AdbPath $AdbPath
$SelectedDevice = Select-BthwaniAndroidDevice -Devices $Devices
$SelectedSerial = $SelectedDevice.Serial
$env:ANDROID_SERIAL = $SelectedSerial

$Ports = @(58080, 58082, 58083, 58086, 59000, $MetroPort)
Invoke-BthwaniAdbReverse `
    -AdbPath $AdbPath `
    -Serial $SelectedSerial `
    -Ports $Ports

$ShouldMirror = $MirrorDevice -or $env:BTHWANI_MIRROR_DEVICE -eq "1"
if ($ShouldMirror) {
    $Scrcpy = Get-Command scrcpy.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $Scrcpy) {
        throw "scrcpy.exe was requested but was not found in PATH."
    }
    Start-Process -FilePath $Scrcpy.Source -ArgumentList @("-s", $SelectedSerial)
}

$ShouldClearCache = $ClearCache -or $env:BTHWANI_METRO_CLEAR -eq "1"

Write-Host ""
Write-Host "=== MOBILE RUNTIME ==="
Write-Host "App:          $AppKey"
Write-Host "Runtime:      $RuntimeDir"
Write-Host "Host IP:      $($HostAddress.IPAddress)"
Write-Host "ADB:          $AdbPath"
Write-Host "Device:       $SelectedSerial"
Write-Host "Metro port:   $MetroPort"
Write-Host "Mirror:       $ShouldMirror"
Write-Host "Cache clear:  $ShouldClearCache"
Write-Host ""

$ExpoArguments = @(
    "exec",
    "expo",
    "start",
    "--dev-client",
    "--host",
    "lan",
    "--port",
    [string] $MetroPort,
    "--android"
)

if ($ShouldClearCache) {
    $ExpoArguments += "--clear"
}

& pnpm @ExpoArguments
if ($LASTEXITCODE -ne 0) {
    throw "Expo runtime failed for $AppKey."
}
