param(
    [Parameter(Mandatory)]
    [ValidateSet("app-client", "app-partner", "app-captain", "app-field")]
    [string] $AppKey,

    [Parameter(Mandatory)]
    [ValidateRange(1024, 65535)]
    [int] $MetroPort,

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

# Metro is reached through adb reverse, not through an incoming LAN port.
$env:NODE_OPTIONS = "--dns-result-order=ipv4first"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "127.0.0.1"
$env:EXPO_PACKAGER_PROXY_URL = "http://127.0.0.1:$MetroPort"
$env:EXPO_PUBLIC_DSH_API_BASE_URL      = "http://127.0.0.1:58080"
$env:NEXT_PUBLIC_DSH_API_BASE_URL      = "http://127.0.0.1:58080"
$env:EXPO_PUBLIC_IDENTITY_API_BASE_URL = "http://127.0.0.1:58082"
$env:NEXT_PUBLIC_IDENTITY_API_BASE_URL = "http://127.0.0.1:58082"
$env:EXPO_PUBLIC_WLT_API_BASE_URL      = "http://127.0.0.1:58083"
$env:NEXT_PUBLIC_WLT_API_BASE_URL      = "http://127.0.0.1:58083"
$env:EXPO_PUBLIC_WORKFORCE_API_BASE_URL = "http://127.0.0.1:58086"
$env:NEXT_PUBLIC_WORKFORCE_API_BASE_URL = "http://127.0.0.1:58086"

$AdbPath = Resolve-BthwaniAdb
& $AdbPath start-server
if ($LASTEXITCODE -ne 0) {
    throw "ADB server failed to start."
}

$Devices = Get-BthwaniAndroidDevices -AdbPath $AdbPath
$SelectedDevice = Select-BthwaniAndroidDevice -Devices $Devices
$SelectedSerial = $SelectedDevice.Serial
$env:ANDROID_SERIAL = $SelectedSerial
$env:BTHWANI_ANDROID_SERIAL = $SelectedSerial
$env:ADB = $AdbPath

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
Write-Host "Metro URL:    http://127.0.0.1:$MetroPort"
Write-Host "LAN IP:       $($HostAddress.IPAddress)"
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
    "--localhost",
    "--port",
    [string] $MetroPort,
    "--android"
)

if ($ShouldClearCache) {
    $ExpoArguments += "--clear"
}

# BTHWANI_ADB_WATCHDOG:
# Keep the TCP/IP transport online and restore reverse mappings
# whenever Android temporarily marks the Wi-Fi device offline.
$AdbWatchdog = $null

if (
    $SelectedSerial -match
    "^\d{1,3}(?:\.\d{1,3}){3}:\d+$"
) {
    $AdbWatchdog = Start-Job `
        -ArgumentList @(
            $AdbPath,
            $SelectedSerial,
            $Ports
        ) `
        -ScriptBlock {
            param(
                [string] $WatchAdb,
                [string] $WatchSerial,
                [int[]] $WatchPorts
            )

            $ErrorActionPreference = "SilentlyContinue"

            while ($true) {
                $State = (
                    & $WatchAdb `
                        -s $WatchSerial `
                        get-state 2>$null |
                        Out-String
                ).Trim()

                $StateExitCode = $LASTEXITCODE

                if (
                    $StateExitCode -ne 0 -or
                    $State -ne "device"
                ) {
                    & $WatchAdb `
                        disconnect $WatchSerial `
                        2>$null |
                        Out-Null

                    Start-Sleep -Milliseconds 750

                    & $WatchAdb `
                        connect $WatchSerial `
                        2>$null |
                        Out-Null

                    Start-Sleep -Seconds 1

                    $RecoveredState = (
                        & $WatchAdb `
                            -s $WatchSerial `
                            get-state 2>$null |
                            Out-String
                    ).Trim()

                    if ($RecoveredState -eq "device") {
                        foreach (
                            $WatchPort in
                            ($WatchPorts | Select-Object -Unique)
                        ) {
                            & $WatchAdb `
                                -s $WatchSerial `
                                reverse `
                                "tcp:$WatchPort" `
                                "tcp:$WatchPort" `
                                2>$null |
                                Out-Null
                        }
                    }
                }

                Start-Sleep -Seconds 2
            }
        }
}

try {
    & pnpm @ExpoArguments

    if ($LASTEXITCODE -ne 0) {
        throw "Expo runtime failed for $AppKey."
    }
}
finally {
    if ($AdbWatchdog) {
        Stop-Job `
            -Job $AdbWatchdog `
            -ErrorAction SilentlyContinue

        Remove-Job `
            -Job $AdbWatchdog `
            -Force `
            -ErrorAction SilentlyContinue
    }
}
