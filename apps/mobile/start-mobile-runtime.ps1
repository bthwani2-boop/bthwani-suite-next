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
$RuntimePhase = Join-Path $PSScriptRoot "invoke-runtime-phase.ps1"
$MobileEnvFile = Join-Path $RepoRoot "infra\local\mobile.env"

if (-not (Test-Path -LiteralPath $RuntimeDir -PathType Container)) {
    throw "Runtime directory not found: $RuntimeDir"
}
if (-not (Test-Path -LiteralPath $AdbHelper -PathType Leaf)) {
    throw "ADB helper not found: $AdbHelper"
}
if (-not (Test-Path -LiteralPath $RuntimePhase -PathType Leaf)) {
    throw "Runtime phase helper not found: $RuntimePhase"
}

function Import-BthwaniMobileEnvironment {
    if (-not (Test-Path -LiteralPath $MobileEnvFile -PathType Leaf)) {
        return
    }

    foreach ($rawLine in Get-Content -LiteralPath $MobileEnvFile) {
        $line = $rawLine.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
            continue
        }

        $parts = $line.Split("=", 2)
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()
        if (-not $key) {
            continue
        }
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        if (-not (Get-Item -Path "Env:$key" -ErrorAction SilentlyContinue)) {
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

function Copy-AppScopedEnvironmentValue {
    param([Parameter(Mandatory)][string] $Name)

    $suffix = $AppKey.Replace("-", "_").ToUpperInvariant()
    $scopedName = "${Name}_${suffix}"
    $scopedValue = [Environment]::GetEnvironmentVariable($scopedName, "Process")
    $commonValue = [Environment]::GetEnvironmentVariable($Name, "Process")
    if ([string]::IsNullOrWhiteSpace($commonValue) -and -not [string]::IsNullOrWhiteSpace($scopedValue)) {
        [Environment]::SetEnvironmentVariable($Name, $scopedValue, "Process")
    }
}

function Test-BthwaniHealthEndpoint {
    param(
        [Parameter(Mandatory)][string] $Uri,
        [Parameter(Mandatory)][string] $ExpectedStatus
    )

    try {
        $response = Invoke-RestMethod -Uri $Uri -TimeoutSec 3 -ErrorAction Stop
        return [string] $response.status -eq $ExpectedStatus
    } catch {
        return $false
    }
}

function Test-BthwaniMobileBackend {
    $checks = @(
        @{ Uri = "http://127.0.0.1:58082/identity/health"; Status = "healthy" },
        @{ Uri = "http://127.0.0.1:58086/workforce/health"; Status = "healthy" },
        @{ Uri = "http://127.0.0.1:58083/wlt/health"; Status = "healthy" },
        @{ Uri = "http://127.0.0.1:58080/dsh/health"; Status = "healthy" }
    )

    foreach ($check in $checks) {
        if (-not (Test-BthwaniHealthEndpoint -Uri $check.Uri -ExpectedStatus $check.Status)) {
            return $false
        }
    }
    return $true
}

function Ensure-BthwaniMobileBackend {
    if (Test-BthwaniMobileBackend) {
        return "ready"
    }

    $setting = ([string] $env:BTHWANI_AUTO_START_BACKEND).Trim().ToLowerInvariant()
    $autoStart = $setting -notin @("0", "false", "off", "disabled")
    if (-not $autoStart) {
        throw "Mobile backend is not ready. Run 'pnpm run runtime:mobile:up' and 'pnpm run runtime:mobile:bootstrap-dev', or remove BTHWANI_AUTO_START_BACKEND=0."
    }
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "Mobile backend is not ready and Docker was not found. Start Docker Desktop, then run the app again."
    }

    Write-Host "Mobile backend is not ready; starting governed local services..."
    Push-Location -LiteralPath $RepoRoot
    try {
        & pwsh -NoProfile -ExecutionPolicy Bypass -File $RuntimePhase `
            -Action up `
            -Profiles "identity,workforce,dsh,wlt,media"
        if ($LASTEXITCODE -ne 0) {
            throw "Mobile backend startup failed (exit $LASTEXITCODE)."
        }

        & pwsh -NoProfile -ExecutionPolicy Bypass -File $RuntimePhase `
            -Action bootstrap-dev `
            -Profiles "identity,workforce,dsh,wlt,media" `
            -Force
        if ($LASTEXITCODE -ne 0) {
            throw "Mobile development bootstrap failed (exit $LASTEXITCODE)."
        }
    } finally {
        Pop-Location
    }

    if (-not (Test-BthwaniMobileBackend)) {
        throw "Mobile backend startup completed but one or more required APIs are still unhealthy (Identity 58082, Workforce 58086, WLT 58083, DSH 58080)."
    }
    return "auto-started"
}

Import-BthwaniMobileEnvironment
foreach ($name in @(
    "EXPO_PUBLIC_SENTRY_DSN",
    "SENTRY_PROJECT",
    "GOOGLE_SERVICES_JSON"
)) {
    Copy-AppScopedEnvironmentValue -Name $name
}

. $AdbHelper

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

$BackendState = Ensure-BthwaniMobileBackend
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

$AdbPath = Resolve-BthwaniAdb
Start-BthwaniAdbServer -AdbPath $AdbPath
Write-Host "ADB server ready."

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
$SentryState = if ([string]::IsNullOrWhiteSpace($env:EXPO_PUBLIC_SENTRY_DSN)) {
    "disabled (configure infra/local/mobile.env)"
} else {
    "enabled"
}

Write-Host ""
Write-Host "=== MOBILE RUNTIME ==="
Write-Host "App:          $AppKey"
Write-Host "Runtime:      $RuntimeDir"
Write-Host "Backend:      $BackendState"
Write-Host "Metro URL:    http://127.0.0.1:$MetroPort"
Write-Host "LAN IP:       $LanIp"
Write-Host "ADB:          $AdbPath"
Write-Host "Device:       $SelectedSerial"
Write-Host "Transport:    $(if ($SelectedDevice.IsTcpIp) { 'tcp' } else { 'usb' })"
Write-Host "Metro port:   $MetroPort"
Write-Host "Reverse:      verified"
Write-Host "Watchdog:     $(if ($WatchdogEligible) { 'reverse-only' } else { 'off' })"
Write-Host "Sentry:       $SentryState"
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
    [string] $MetroPort
)

if ($ShouldClearCache) {
    $ExpoArguments += "--clear"
}

# Expo's --android path can repeatedly pipe ADB output after the stream closes on
# TCP devices. Start Metro without it and open the development client once after
# the fixed port is listening.
$SlugByApp = @{
    "app-client"  = "app-client-next"
    "app-partner" = "app-partner-next"
    "app-captain" = "app-captain-next"
    "app-field"   = "app-field-next"
}
$EncodedMetroUrl = [Uri]::EscapeDataString("http://127.0.0.1:$MetroPort")
$DevelopmentClientUrl = "exp+$($SlugByApp[$AppKey])://expo-development-client/?url=$EncodedMetroUrl"
$AndroidLaunchJob = Start-Job `
    -ArgumentList @($AdbPath, $SelectedSerial, $MetroPort, $DevelopmentClientUrl) `
    -ScriptBlock {
        param(
            [string] $LaunchAdb,
            [string] $LaunchSerial,
            [int] $LaunchPort,
            [string] $LaunchUrl
        )

        $ErrorActionPreference = "SilentlyContinue"
        for ($attempt = 1; $attempt -le 120; $attempt++) {
            $client = [Net.Sockets.TcpClient]::new()
            try {
                $connect = $client.ConnectAsync("127.0.0.1", $LaunchPort)
                if ($connect.Wait(500) -and $client.Connected) {
                    & $LaunchAdb -s $LaunchSerial shell am start -W `
                        -a android.intent.action.VIEW `
                        -d $LaunchUrl 2>$null | Out-Null
                    return
                }
            } catch {
                # Metro is still starting.
            } finally {
                $client.Dispose()
            }
            Start-Sleep -Seconds 1
        }
        throw "Metro port $LaunchPort did not become ready for Android launch."
    }

# Optional TCP watchdog repairs only missing reverse mappings. It deliberately
# never runs `adb disconnect` or `adb connect`, which previously caused periodic
# Wi-Fi transport drops and interrupted scrcpy/Metro sessions.
$AdbWatchdog = $null
if ($WatchdogEligible) {
    $WatchPortsCsv = $Ports -join ","
    $AdbWatchdog = Start-Job `
        -ArgumentList @($AdbPath, $SelectedSerial, $WatchPortsCsv) `
        -ScriptBlock {
            param(
                [string] $WatchAdb,
                [string] $WatchSerial,
                [string] $WatchPortsCsv
            )

            $ErrorActionPreference = "SilentlyContinue"
            [int[]] $WatchPorts = @(
                $WatchPortsCsv.Split(",", [StringSplitOptions]::RemoveEmptyEntries) |
                    ForEach-Object { [int] $_ }
            )

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
    foreach ($job in @($AndroidLaunchJob, $AdbWatchdog)) {
        if ($null -ne $job) {
            Stop-Job -Job $job -ErrorAction SilentlyContinue
            Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
        }
    }
}
