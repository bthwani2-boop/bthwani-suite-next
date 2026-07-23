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

if (-not (Test-Path -LiteralPath $RuntimeDir -PathType Container)) {
    throw "Runtime directory not found: $RuntimeDir"
}
if (-not (Test-Path -LiteralPath $AdbHelper -PathType Leaf)) {
    throw "ADB helper not found: $AdbHelper"
}

. $AdbHelper
Set-Location -LiteralPath $RuntimeDir

# Fixed ports are part of the multi-app runtime contract. Never let Expo switch
# interactively to another port because that invalidates adb reverse and scripts.
$ExistingListener = Get-NetTCPConnection `
    -State Listen `
    -LocalPort $MetroPort `
    -ErrorAction SilentlyContinue |
    Select-Object -First 1

if ($ExistingListener) {
    $OwnerLabel = "PID $($ExistingListener.OwningProcess)"
    try {
        $OwnerProcess = Get-Process -Id $ExistingListener.OwningProcess -ErrorAction Stop
        $OwnerLabel = "$($OwnerProcess.ProcessName) (PID $($OwnerProcess.Id))"
    } catch {
        # The listener can disappear between discovery and process resolution.
    }
    throw "Metro port $MetroPort is already in use by $OwnerLabel. Stop that process before starting $AppKey."
}

# LAN information is diagnostic only. Runtime traffic uses adb reverse, so VPNs,
# missing default routes, or network-interface changes must not block startup.
$LanIp = "not-required (adb reverse)"
try {
    $DefaultRoute = Get-NetRoute `
        -AddressFamily IPv4 `
        -DestinationPrefix "0.0.0.0/0" `
        -ErrorAction Stop |
        Sort-Object RouteMetric, InterfaceMetric |
        Select-Object -First 1

    if ($DefaultRoute) {
        $HostAddress = Get-NetIPAddress `
            -AddressFamily IPv4 `
            -InterfaceIndex $DefaultRoute.InterfaceIndex `
            -ErrorAction Stop |
            Where-Object {
                -not $_.SkipAsSource -and
                $_.IPAddress -notmatch "^(127\.|169\.254\.)"
            } |
            Select-Object -First 1

        if ($HostAddress) {
            $LanIp = $HostAddress.IPAddress
        }
    }
} catch {
    # The selected device still reaches localhost through adb reverse.
}

# Metro and local APIs are reached from Android through explicit reverse bridges.
$env:NODE_OPTIONS = "--dns-result-order=ipv4first"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "127.0.0.1"
$env:EXPO_PACKAGER_PROXY_URL = "http://127.0.0.1:$MetroPort"
$env:BTHWANI_ADB_REVERSE_ENABLED = "1"
$env:EXPO_PUBLIC_ADB_REVERSE_ENABLED = "true"
$env:EXPO_PUBLIC_DSH_API_BASE_URL       = "http://127.0.0.1:58080"
$env:NEXT_PUBLIC_DSH_API_BASE_URL       = "http://127.0.0.1:58080"
$env:EXPO_PUBLIC_IDENTITY_API_BASE_URL  = "http://127.0.0.1:58082"
$env:NEXT_PUBLIC_IDENTITY_API_BASE_URL  = "http://127.0.0.1:58082"
$env:EXPO_PUBLIC_WLT_API_BASE_URL       = "http://127.0.0.1:58083"
$env:NEXT_PUBLIC_WLT_API_BASE_URL       = "http://127.0.0.1:58083"
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
$WatchdogSetting = [string] $env:BTHWANI_ADB_WATCHDOG
$WatchdogEnabled = $WatchdogSetting.Trim().ToLowerInvariant() -in @("1", "true", "reverse")
$WatchdogEligible = $SelectedDevice.IsTcpIp -and $WatchdogEnabled

Write-Host ""
Write-Host "=== MOBILE RUNTIME ==="
Write-Host "App:          $AppKey"
Write-Host "Runtime:      $RuntimeDir"
Write-Host "Metro URL:    http://127.0.0.1:$MetroPort"
Write-Host "LAN IP:       $LanIp"
Write-Host "ADB:          $AdbPath"
Write-Host "Device:       $SelectedSerial"
Write-Host "Transport:    $(if ($SelectedDevice.IsTcpIp) { 'tcp' } else { 'usb' })"
Write-Host "Metro port:   $MetroPort"
Write-Host "Reverse:      verified"
Write-Host "Watchdog:     $(if ($WatchdogEligible) { 'reverse-only' } else { 'off' })"
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

# Optional TCP watchdog repairs only missing reverse mappings. It deliberately
# never runs `adb disconnect` or `adb connect`, which previously caused periodic
# Wi-Fi transport drops and interrupted scrcpy/Metro sessions.
$AdbWatchdog = $null
if ($WatchdogEligible) {
    $AdbWatchdog = Start-Job `
        -ArgumentList @($AdbPath, $SelectedSerial, $Ports) `
        -ScriptBlock {
            param(
                [string] $WatchAdb,
                [string] $WatchSerial,
                [int[]] $WatchPorts
            )

            $ErrorActionPreference = "SilentlyContinue"

            while ($true) {
                $State = (
                    & $WatchAdb -s $WatchSerial get-state 2>$null |
                    Out-String
                ).Trim()

                if ($LASTEXITCODE -eq 0 -and $State -eq "device") {
                    $Mappings = @(
                        & $WatchAdb -s $WatchSerial reverse --list 2>$null |
                        ForEach-Object { [string] $_ }
                    )

                    foreach ($WatchPort in ($WatchPorts | Select-Object -Unique)) {
                        $Pattern = "tcp:$WatchPort\s+tcp:$WatchPort(?:\s|$)"
                        $Exists = @($Mappings | Where-Object { $_ -match $Pattern }).Count -gt 0
                        if (-not $Exists) {
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

                Start-Sleep -Seconds 10
            }
        }
}

try {
    & pnpm @ExpoArguments

    if ($LASTEXITCODE -ne 0) {
        throw "Expo runtime failed for $AppKey."
    }
} finally {
    if ($AdbWatchdog) {
        Stop-Job -Job $AdbWatchdog -ErrorAction SilentlyContinue
        Remove-Job -Job $AdbWatchdog -Force -ErrorAction SilentlyContinue
    }
}
