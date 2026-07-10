param(
    [Parameter(Mandatory)]
    [ValidateSet(
        "app-client",
        "app-partner",
        "app-captain",
        "app-field"
    )]
    [string] $AppKey,

    [Parameter(Mandatory)]
    [ValidateRange(1024, 65535)]
    [int] $MetroPort,

    [switch] $NeedsDevStoreId,

    [switch] $ClearCache
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

if ($NeedsDevStoreId) {
    try {
        $StoreResponse = Invoke-RestMethod `
            -Uri "http://127.0.0.1:58080/dsh/stores?limit=1&offset=0" `
            -TimeoutSec 3 `
            -ErrorAction Stop

        $StoreId = [string] $StoreResponse.stores[0].id

        if ([string]::IsNullOrWhiteSpace($StoreId)) {
            throw "Store ID was empty."
        }

        $env:EXPO_PUBLIC_DEV_STORE_ID = $StoreId
    }
    catch {
        $env:EXPO_PUBLIC_DEV_STORE_ID = "store-1005"
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

# Force all Android tools launched by this process to use one device only.
$env:ANDROID_SERIAL = $SelectedSerial

$Ports = @(
    58080,
    58082,
    58083,
    59000,
    $MetroPort
)

Invoke-BthwaniAdbReverse `
    -AdbPath $AdbPath `
    -Serial $SelectedSerial `
    -Ports $Ports

Write-Host ""
Write-Host "=== MOBILE RUNTIME ==="
Write-Host "App:          $AppKey"
Write-Host "Runtime:      $RuntimeDir"
Write-Host "Host IP:      $($HostAddress.IPAddress)"
Write-Host "ADB:          $AdbPath"
Write-Host "Device:       $SelectedSerial"
Write-Host "Metro port:   $MetroPort"
Write-Host "Cache clear:  $($ClearCache -or $env:BTHWANI_METRO_CLEAR -eq '1')"
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

$ShouldClearCache =
    $ClearCache -or
    $env:BTHWANI_METRO_CLEAR -eq "1"

if ($ShouldClearCache) {
    $ExpoArguments += "--clear"
}

& pnpm @ExpoArguments

if ($LASTEXITCODE -ne 0) {
    throw "Expo runtime failed for $AppKey."
}
