param(
    [Parameter(Mandatory)]
    [ValidateSet("app-client", "app-partner", "app-captain", "app-field")]
    [string] $AppKey,

    [Parameter(Mandatory)]
    [ValidateRange(1024, 65535)]
    [int] $MetroPort,

    [switch] $ClearCache
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$RuntimeDir = Join-Path $RepoRoot "apps\$AppKey\runtime"
$AdbHelper = Join-Path $PSScriptRoot "mobile-adb.ps1"
$LanHelper = Join-Path $PSScriptRoot "mobile-lan.ps1"
$MobileEnvFile = Join-Path $RepoRoot "infra\local\mobile.env"
$DevSessionBrokerScript = Join-Path $RepoRoot "tools\dev\local-dev-session-broker.mjs"
$DevSessionBrokerPort = 58100
$DevSessionBrokerContractVersion = 2
$DevGatewayPort = 58110
$DevGatewayContractVersion = 1

if (-not (Test-Path -LiteralPath $RuntimeDir -PathType Container)) {
    throw "Runtime directory not found: $RuntimeDir"
}
if (-not (Test-Path -LiteralPath $LanHelper -PathType Leaf)) {
    throw "LAN transport helper not found: $LanHelper"
}
if (-not (Test-Path -LiteralPath $DevSessionBrokerScript -PathType Leaf)) {
    throw "Local development session broker not found: $DevSessionBrokerScript"
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
        if (-not $key) { continue }
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

function Clear-BthwaniProcessEnvironment {
    param([Parameter(Mandatory)][string[]] $Names)
    foreach ($name in $Names) {
        Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue
    }
}

function Test-BthwaniDevSessionBroker {
    try {
        $response = Invoke-RestMethod `
            -Uri "http://127.0.0.1:$DevSessionBrokerPort/health" `
            -TimeoutSec 1 `
            -ErrorAction Stop
        return [string] $response.status -eq "healthy" `
            -and [string] $response.service -eq "local-dev-session-broker" `
            -and [int] $response.contractVersion -eq $DevSessionBrokerContractVersion
    } catch {
        return $false
    }
}

function Get-BthwaniDevSessionBrokerListener {
    if (-not (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue)) {
        return $null
    }
    return Get-NetTCPConnection `
        -State Listen `
        -LocalPort $DevSessionBrokerPort `
        -ErrorAction SilentlyContinue |
        Select-Object -First 1
}

function Stop-BthwaniStaleDevSessionBroker {
    param([Parameter(Mandatory)] $Listener)

    if (-not (Get-Command Get-CimInstance -ErrorAction SilentlyContinue)) {
        throw "Port $DevSessionBrokerPort is occupied and the owning process cannot be verified safely."
    }
    $owner = Get-CimInstance `
        -ClassName Win32_Process `
        -Filter "ProcessId = $($Listener.OwningProcess)" `
        -ErrorAction SilentlyContinue
    $ownerName = if ($owner) { [string] $owner.Name } else { "" }
    $ownerCommandLine = if ($owner) { [string] $owner.CommandLine } else { "" }
    $isBrokerProcess = $owner `
        -and $ownerName -match '^node(?:\.exe)?$' `
        -and $ownerCommandLine -like '*local-dev-session-broker.mjs*'

    if (-not $isBrokerProcess) {
        throw "Port $DevSessionBrokerPort is occupied by a process that is not the BThwani local dev session broker."
    }

    Write-Host "Replacing stale local dev session broker contract on port $DevSessionBrokerPort..." -ForegroundColor DarkGray
    Stop-Process -Id $Listener.OwningProcess -Force -ErrorAction Stop
    for ($attempt = 1; $attempt -le 30; $attempt++) {
        if (-not (Get-BthwaniDevSessionBrokerListener)) { return }
        Start-Sleep -Milliseconds 100
    }
    throw "Stale local dev session broker did not release port $DevSessionBrokerPort."
}

function Ensure-BthwaniDevSessionBroker {
    if (Test-BthwaniDevSessionBroker) {
        return "ready"
    }

    $listener = Get-BthwaniDevSessionBrokerListener
    if ($listener) {
        Stop-BthwaniStaleDevSessionBroker -Listener $listener
    }

    $node = Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $node) { $node = Get-Command node -ErrorAction SilentlyContinue | Select-Object -First 1 }
    if (-not $node) { throw "Node.js was not found; the local development session broker cannot start." }

    $runtimeMode = ([string] $env:BTHWANI_RUNTIME_MODE).Trim().ToLowerInvariant()
    $nodeMode = ([string] $env:NODE_ENV).Trim().ToLowerInvariant()
    if ($runtimeMode -in @("production", "prod") -or $nodeMode -in @("production", "prod")) {
        throw "Quick developer login is forbidden in production mode."
    }

    $env:BTHWANI_DEV_SESSION_BROKER_PORT = [string] $DevSessionBrokerPort
    $startParameters = @{
        FilePath = $node.Source
        ArgumentList = @($DevSessionBrokerScript)
        WorkingDirectory = $RepoRoot
        PassThru = $true
    }
    if ($IsWindows) { $startParameters.WindowStyle = "Hidden" }
    $process = Start-Process @startParameters

    for ($attempt = 1; $attempt -le 50; $attempt++) {
        if ($process.HasExited) {
            throw "Local development session broker exited during startup with code $($process.ExitCode)."
        }
        if (Test-BthwaniDevSessionBroker) {
            return "started"
        }
        Start-Sleep -Milliseconds 100
    }
    throw "Local development session broker contract v$DevSessionBrokerContractVersion did not become healthy on port $DevSessionBrokerPort."
}

function Assert-BthwaniMetroPortAvailable {
    if (-not (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue)) {
        return
    }
    $listener = Get-NetTCPConnection -State Listen -LocalPort $MetroPort -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (-not $listener) { return }

    $ownerLabel = "PID $($listener.OwningProcess)"
    try {
        $owner = Get-Process -Id $listener.OwningProcess -ErrorAction Stop
        $ownerLabel = "$($owner.ProcessName) (PID $($owner.Id))"
    } catch { }
    throw "Metro port $MetroPort is already in use by $ownerLabel. Stop that process before starting $AppKey."
}

Import-BthwaniMobileEnvironment
foreach ($name in @(
    "EXPO_PUBLIC_SENTRY_DSN",
    "SENTRY_PROJECT",
    "GOOGLE_SERVICES_JSON"
)) {
    Copy-AppScopedEnvironmentValue -Name $name
}

$requestedPlatform = ([string] $env:BTHWANI_MOBILE_PLATFORM).Trim().ToLowerInvariant()
if (-not $requestedPlatform) { $requestedPlatform = "auto" }
if ($requestedPlatform -notin @("auto", "android", "ios")) {
    throw "BTHWANI_MOBILE_PLATFORM must be one of: auto, android, ios."
}

$requestedTransport = ([string] $env:BTHWANI_MOBILE_TRANSPORT).Trim().ToLowerInvariant()
if (-not $requestedTransport) { $requestedTransport = "auto" }
if ($requestedTransport -notin @("lan", "adb", "auto")) {
    throw "BTHWANI_MOBILE_TRANSPORT must be one of: lan, adb, auto."
}
if ($requestedTransport -eq "adb" -and $requestedPlatform -eq "ios") {
    throw "BTHWANI_MOBILE_TRANSPORT=adb is Android-only; iOS does not support the ADB fallback. Use LAN for iOS development."
}

$resolvedTransport = $null
$lanContext = $null
$autoFallbackReason = ""
if ($requestedTransport -in @("lan", "auto")) {
    . $LanHelper
    try {
        $lanContext = Resolve-BthwaniMobileLanContext
        $resolvedTransport = "lan"
    } catch {
        if ($requestedTransport -eq "lan") { throw }
        $autoFallbackReason = $_.Exception.Message
    }
}

if (-not $resolvedTransport) {
    if ($requestedPlatform -eq "ios") {
        throw "LAN transport could not be resolved for iOS. iOS does not support the ADB fallback. LAN failure: $autoFallbackReason"
    }
    if ($requestedTransport -eq "auto" -and $requestedPlatform -eq "auto" -and $IsMacOS) {
        throw "LAN transport could not be resolved on macOS while BTHWANI_MOBILE_PLATFORM=auto. Set BTHWANI_MOBILE_PLATFORM=android to permit Android ADB fallback, or repair LAN for iOS. LAN failure: $autoFallbackReason"
    }
    if (-not (Test-Path -LiteralPath $AdbHelper -PathType Leaf)) {
        throw "Android ADB fallback was selected but the ADB helper is missing: $AdbHelper"
    }
    . $AdbHelper
    $resolvedTransport = "adb"
}

$resolvedPlatform = if ($resolvedTransport -eq "adb") {
    "android"
} elseif ($requestedPlatform -eq "auto") {
    "shared"
} else {
    $requestedPlatform
}

$devSessionBrokerState = Ensure-BthwaniDevSessionBroker
Set-Location -LiteralPath $RuntimeDir
Assert-BthwaniMetroPortAvailable

$shouldClearCache = $ClearCache -or $env:BTHWANI_METRO_CLEAR -eq "1"
$sentryState = if ([string]::IsNullOrWhiteSpace($env:EXPO_PUBLIC_SENTRY_DSN)) {
    "disabled (configure infra/local/mobile.env)"
} else {
    "enabled"
}

$metroHost = ""
$expoHostFlag = ""
$transportDetail = ""
$devLoginDetail = ""
$reverseDetail = "not-used"
$watchdogDetail = "off"
$gatewayDetail = "not-used"
$adbPath = $null
$selectedDevice = $null
$selectedSerial = ""
$ports = @()
$watchdogEligible = $false

# Gateway values are generated per LAN gateway instance and must never leak from
# a previous invocation. ADB preferences are intentionally preserved until the
# Android ADB branch consumes them.
Clear-BthwaniProcessEnvironment -Names @(
    "EXPO_PUBLIC_BTHWANI_DEV_GATEWAY_BASE_URL",
    "EXPO_PUBLIC_BTHWANI_DEV_GATEWAY_TOKEN"
)

$currentNodeOptions = ([string] $env:NODE_OPTIONS).Trim()
if ($currentNodeOptions -notmatch '(?:^|\s)--dns-result-order=') {
    $env:NODE_OPTIONS = (($currentNodeOptions + " --dns-result-order=ipv4first").Trim())
}
$env:BTHWANI_MOBILE_TRANSPORT_RESOLVED = $resolvedTransport
$env:EXPO_PUBLIC_BTHWANI_MOBILE_TRANSPORT = $resolvedTransport
$env:BTHWANI_MOBILE_PLATFORM_RESOLVED = $resolvedPlatform
$env:EXPO_PUBLIC_BTHWANI_MOBILE_PLATFORM = $resolvedPlatform

if ($resolvedTransport -eq "lan") {
    Clear-BthwaniProcessEnvironment -Names @("ANDROID_SERIAL", "BTHWANI_ANDROID_SERIAL", "ADB")

    $gateway = Ensure-BthwaniMobileDevGateway `
        -RepoRoot $RepoRoot `
        -LanHost $lanContext.Host `
        -Port $DevGatewayPort `
        -ContractVersion $DevGatewayContractVersion

    $metroHost = [string] $lanContext.Host
    $expoHostFlag = "--lan"
    $gatewayBase = [string] $gateway.BaseUrl

    $env:BTHWANI_ADB_REVERSE_ENABLED = "0"
    $env:EXPO_PUBLIC_ADB_REVERSE_ENABLED = "false"
    $env:EXPO_PUBLIC_BTHWANI_DEV_GATEWAY_BASE_URL = $gatewayBase
    $env:EXPO_PUBLIC_BTHWANI_DEV_GATEWAY_TOKEN = [string] $gateway.Capability
    $env:EXPO_PUBLIC_DSH_API_BASE_URL = $gatewayBase
    $env:EXPO_PUBLIC_IDENTITY_API_BASE_URL = $gatewayBase
    $env:EXPO_PUBLIC_WORKFORCE_API_BASE_URL = $gatewayBase

    $transportDetail = "lan ($($lanContext.Source), profile=$($lanContext.NetworkCategory))"
    $gatewayDetail = "$($gateway.State) $gatewayBase (contract v$DevGatewayContractVersion, pid=$($gateway.Pid))"
    $devLoginDetail = "$devSessionBrokerState via gateway -> 127.0.0.1:$DevSessionBrokerPort"
} else {
    $metroHost = "127.0.0.1"
    $expoHostFlag = "--localhost"

    $env:BTHWANI_ADB_REVERSE_ENABLED = "1"
    $env:EXPO_PUBLIC_ADB_REVERSE_ENABLED = "true"
    $env:EXPO_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
    $identityHostPort = if ([string]::IsNullOrWhiteSpace($env:BTHWANI_IDENTITY_API_HOST_PORT)) { "18082" } else { [string] $env:BTHWANI_IDENTITY_API_HOST_PORT }
    $env:EXPO_PUBLIC_IDENTITY_API_BASE_URL = "http://127.0.0.1:$identityHostPort"
    $env:EXPO_PUBLIC_WORKFORCE_API_BASE_URL = "http://127.0.0.1:58086"

    $adbPath = Resolve-BthwaniAdb
    Start-BthwaniAdbServer -AdbPath $adbPath
    $devices = Get-BthwaniAndroidDevices -AdbPath $adbPath
    $selectedDevice = Select-BthwaniAndroidDevice -Devices $devices
    $selectedSerial = $selectedDevice.Serial
    $env:ANDROID_SERIAL = $selectedSerial
    $env:BTHWANI_ANDROID_SERIAL = $selectedSerial
    $env:ADB = $adbPath

    $ports = @(58080, [int] $identityHostPort, 58086, 58100, 59000, $MetroPort)
    Invoke-BthwaniAdbReverse -AdbPath $adbPath -Serial $selectedSerial -Ports $ports

    $watchdogSetting = ([string] $env:BTHWANI_ADB_WATCHDOG).Trim().ToLowerInvariant()
    $watchdogEnabled = $watchdogSetting -in @("1", "true", "reverse")
    $watchdogEligible = $selectedDevice.IsTcpIp -and $watchdogEnabled
    $transportDetail = "adb/$(if ($selectedDevice.IsTcpIp) { 'tcp' } else { 'usb' })"
    $devLoginDetail = "$devSessionBrokerState via verified reverse -> 127.0.0.1:$DevSessionBrokerPort"
    $reverseDetail = "verified"
    $watchdogDetail = if ($watchdogEligible) { "reverse-only" } else { "off" }
}

$env:REACT_NATIVE_PACKAGER_HOSTNAME = $metroHost
$env:EXPO_PACKAGER_PROXY_URL = "http://${metroHost}:$MetroPort"

$slugByApp = @{
    "app-client"  = "app-client-next"
    "app-partner" = "app-partner-next"
    "app-captain" = "app-captain-next"
    "app-field"   = "app-field-next"
}
$encodedMetroUrl = [Uri]::EscapeDataString("http://${metroHost}:$MetroPort")
$developmentClientUrl = "exp+$($slugByApp[$AppKey])://expo-development-client/?url=$encodedMetroUrl"

Write-Host ""
Write-Host "=== MOBILE RUNTIME ==="
Write-Host "App:          $AppKey"
Write-Host "Runtime:      $RuntimeDir"
Write-Host "Platform:     $resolvedPlatform"
Write-Host "Transport:    $transportDetail"
if ($requestedTransport -eq "auto" -and $resolvedTransport -eq "adb") {
    Write-Host "LAN fallback: $autoFallbackReason"
}
Write-Host "Metro URL:    http://${metroHost}:$MetroPort"
Write-Host "Dev Client:   $developmentClientUrl"
Write-Host "Gateway:      $gatewayDetail"
Write-Host "Dev login:    $devLoginDetail"
Write-Host "Reverse:      $reverseDetail"
Write-Host "Watchdog:     $watchdogDetail"
Write-Host "Sentry:       $sentryState"
Write-Host "Cache clear:  $shouldClearCache"
if ($resolvedTransport -eq "adb") {
    Write-Host "ADB:          $adbPath"
    Write-Host "Device:       $selectedSerial"
} else {
    Write-Host "ADB:          not used"
    Write-Host "Device open:  open the installed Dev Client manually; mirroring is independent of LAN runtime"
}
Write-Host ""

$expoArguments = @(
    "--dir",
    $RuntimeDir,
    "exec",
    "expo",
    "start",
    "--dev-client",
    $expoHostFlag,
    "--port",
    [string] $MetroPort
)
if ($shouldClearCache) { $expoArguments += "--clear" }

$androidLaunchJob = $null
if ($resolvedTransport -eq "adb") {
    $androidLaunchJob = Start-Job `
        -ArgumentList @($adbPath, $selectedSerial, $MetroPort, $developmentClientUrl) `
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
                } catch { } finally {
                    $client.Dispose()
                }
                Start-Sleep -Seconds 1
            }
            throw "Metro port $LaunchPort did not become ready for Android launch."
        }
}

$adbWatchdog = $null
if ($resolvedTransport -eq "adb" -and $watchdogEligible) {
    $watchPortsCsv = $ports -join ","
    $adbWatchdog = Start-Job `
        -ArgumentList @($adbPath, $selectedSerial, $watchPortsCsv) `
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
                $state = (& $WatchAdb -s $WatchSerial get-state 2>$null | Out-String).Trim()
                if ($LASTEXITCODE -eq 0 -and $state -eq "device") {
                    $mappings = @(
                        & $WatchAdb -s $WatchSerial reverse --list 2>$null |
                        ForEach-Object { [string] $_ }
                    )
                    foreach ($watchPort in ($WatchPorts | Select-Object -Unique)) {
                        $pattern = "tcp:$watchPort\s+tcp:$watchPort(?:\s|$)"
                        $exists = @($mappings | Where-Object { $_ -match $pattern }).Count -gt 0
                        if (-not $exists) {
                            & $WatchAdb -s $WatchSerial reverse "tcp:$watchPort" "tcp:$watchPort" 2>$null | Out-Null
                        }
                    }
                }
                Start-Sleep -Seconds 10
            }
        }
}

try {
    & pnpm @expoArguments
    if ($LASTEXITCODE -ne 0) {
        throw "Expo runtime failed for $AppKey."
    }
} finally {
    foreach ($job in @($androidLaunchJob, $adbWatchdog)) {
        if ($null -ne $job) {
            Stop-Job -Job $job -ErrorAction SilentlyContinue
            Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
        }
    }
}
