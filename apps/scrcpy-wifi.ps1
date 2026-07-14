param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 5555,

    [ValidateRange(1, 60)]
    [int]$ReconnectDelaySeconds = 3,

    [switch]$ConnectOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$StateDirectory = Join-Path $env:LOCALAPPDATA "Bthwani\ScrcpyWiFi"
$ConfigPath = Join-Path $StateDirectory "config.json"

New-Item -ItemType Directory -Path $StateDirectory -Force | Out-Null

# Clean up legacy folders if any
$LegacyStateDir = Join-Path $env:LOCALAPPDATA "ScrcpyWiFi"
Remove-Item -LiteralPath $LegacyStateDir -Recurse -Force -ErrorAction SilentlyContinue

function Run-Cmd {
    param([string]$cmd, [string[]]$cmdArgs)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & $cmd $cmdArgs 2>&1
    $ErrorActionPreference = $prev
    return [pscustomobject]@{
        ExitCode = $LASTEXITCODE
        Output = [string]::Join("`n", @($output)).Trim()
    }
}

function Resolve-ScrcpyTools {
    $scrcpy = (Get-Command scrcpy.exe -ErrorAction SilentlyContinue | Select-Object -First 1).Source
    if (-not $scrcpy) { throw "scrcpy.exe not found. Install it or add it to PATH." }
    $dir = Split-Path -Parent $scrcpy
    $adbCandidates = @(
        "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
        "$dir\adb.exe",
        "$env:ANDROID_HOME\platform-tools\adb.exe",
        "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe",
        (Get-Command adb.exe -ErrorAction SilentlyContinue | Select-Object -First 1).Source
    )
    $adb = ($adbCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1)
    if (-not $adb) { throw "adb.exe not found." }
    return [pscustomobject]@{ Scrcpy = $scrcpy; Adb = $adb }
}

function Test-ValidIp {
    param([string]$addr)
    try {
        $bytes = [System.Net.IPAddress]::Parse($addr).GetAddressBytes()
        return ($bytes.Count -eq 4 -and $bytes[0] -ne 127 -and -not ($bytes[0] -eq 169 -and $bytes[1] -eq 254))
    } catch {
        return $false
    }
}

function Get-Devices {
    $res = Run-Cmd $Adb @("devices", "-l")
    $devices = @()
    foreach ($line in ($res.Output -split "`n")) {
        if ($line.Trim() -match "^(?<serial>\S+)\s+(?<state>device|offline|unauthorized)(?:\s+(?<details>.*))?$") {
            $serial = $Matches.serial
            $devices += [pscustomobject]@{
                Serial  = $serial
                State   = $Matches.state
                IsTcpIp = [bool]($serial -match "^\d{1,3}(\.\d{1,3}){3}:\d+$")
            }
        }
    }
    return $devices
}

function Get-PhoneIp {
    param([string]$serial)
    $res = Run-Cmd $Adb @("-s", $serial, "shell", "ip -f inet addr show wlan0")
    if ($res.Output -match "inet\s+(?<ip>\d{1,3}(\.\d{1,3}){3})/") { return $Matches.ip }
    $res = Run-Cmd $Adb @("-s", $serial, "shell", "getprop dhcp.wlan0.ipaddress")
    if ($res.Output -match "^\d{1,3}(\.\d{1,3}){3}$") { return $res.Output.Trim() }
    
    # Scan other active interfaces
    $res = Run-Cmd $Adb @("-s", $serial, "shell", "ip -f inet addr show")
    $iface = ""
    foreach ($line in ($res.Output -split "`n")) {
        $trimmed = $line.Trim()
        if ($trimmed -match "^\d+:\s+(?<name>[^:@\s]+)") { $iface = $Matches.name }
        if ($trimmed -match "inet\s+(?<ip>\d{1,3}(\.\d{1,3}){3})/" -and $iface -notmatch "lo|dummy") {
            if ($iface -match "wlan|ap|eth") { return $Matches.ip }
        }
    }
    return $null
}

function Test-Endpoint {
    param([string]$endpoint, [string]$expectedSerial)
    Run-Cmd $Adb @("connect", $endpoint) | Out-Null
    Start-Sleep -Milliseconds 400
    $resState = Run-Cmd $Adb @("-s", $endpoint, "get-state")
    if ($resState.Output -ne "device") { return $false }
    $resSerial = Run-Cmd $Adb @("-s", $endpoint, "shell", "getprop ro.serialno")
    $serial = ($resSerial.Output -split "`n" | Select-Object -Last 1).Trim()
    if ($serial -eq $expectedSerial) { return $true }
    Run-Cmd $Adb @("disconnect", $endpoint) | Out-Null
    return $false
}

function Get-LocalSubnets {
    $ips = @()
    try {
        $ips = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop | 
            Where-Object { $_.IPAddress -notmatch "^(127\.|169\.254\.)" -and -not $_.SkipAsSource } | 
            Select-Object -ExpandProperty IPAddress)
    } catch {
        $ips = [System.Net.Dns]::GetHostEntry([System.Net.Dns]::GetHostName()).AddressList | 
            Where-Object { $_.AddressFamily -eq 'InterNetwork' } | 
            ForEach-Object { $_.IPAddressToString } | 
            Where-Object { $_ -notmatch "^(127\.|169\.254\.)" }
    }
    return @($ips | ForEach-Object { $parts = $_.Split('.'); if ($parts.Count -eq 4) { "$($parts[0]).$($parts[1]).$($parts[2])" } } | Select-Object -Unique)
}

function Scan-Subnets {
    param([string[]]$prefixes, [int]$port)
    $open = @()
    foreach ($prefix in $prefixes) {
        Write-Host "Scanning $prefix.0/24 on port $port..."
        $clients = @()
        foreach ($i in 1..254) {
            $ip = "$prefix.$i"
            $client = New-Object System.Net.Sockets.TcpClient
            try {
                $ar = $client.BeginConnect($ip, $port, $null, $null)
                $clients += [pscustomobject]@{ Client = $client; AsyncResult = $ar; Ip = $ip }
            } catch {
                $client.Close()
            }
        }
        Start-Sleep -Milliseconds 1000
        foreach ($c in $clients) {
            if ($c.AsyncResult.IsCompleted -and $c.Client.Connected) {
                $open += $c.Ip
            }
            $c.Client.Close()
        }
    }
    return $open
}

function Init-UsbDevice {
    param($usb)
    Write-Host "Configuring phone through USB ($($usb.Serial))..." -ForegroundColor Cyan
    $model = (Run-Cmd $Adb @("-s", $($usb.Serial), "shell", "getprop ro.product.model")).Output
    $serial = (Run-Cmd $Adb @("-s", $($usb.Serial), "shell", "getprop ro.serialno")).Output
    $ip = Get-PhoneIp -serial $($usb.Serial)
    if (-not $ip) { throw "The phone has no usable IP address. Ensure Wi-Fi/Ethernet is connected on phone." }
    
    Write-Host "Phone: $model ($serial), IP: $ip" -ForegroundColor Green
    $tcpipRes = Run-Cmd $Adb @("-s", $($usb.Serial), "tcpip", $Port)
    if ($tcpipRes.Output -notmatch "(?i)(restarting in TCP mode|already.*TCP)") {
        Write-Warning "TCP/IP activation output: $($tcpipRes.Output)"
    }
    Start-Sleep -Seconds 3

    $endpoint = "${ip}:$Port"
    if (-not (Test-Endpoint $endpoint $serial)) {
        throw "Could not connect to ADB Wi-Fi endpoint: $endpoint"
    }

    $config = [ordered]@{
        IpAddress = $ip; Port = $Port; PhysicalSerial = $serial; Model = $model; AdbPath = $Adb; ScrcpyPath = $Scrcpy
    }
    $config | ConvertTo-Json | Set-Content -LiteralPath $ConfigPath -Encoding UTF8
    Write-Host "Configuration saved to: $ConfigPath" -ForegroundColor Green
    return $config
}

function Find-Endpoint {
    param($cfg)
    $saved = "$($cfg.IpAddress):$($cfg.Port)"
    if (Test-Endpoint $saved $($cfg.PhysicalSerial)) { return $saved }

    Write-Warning "Saved endpoint $saved is unavailable. Searching network..."
    $subnets = Get-LocalSubnets
    $parts = $cfg.IpAddress.Split('.')
    if ($parts.Count -eq 4) { $subnets += "$($parts[0]).$($parts[1]).$($parts[2])" }
    $subnets = @($subnets | Select-Object -Unique)

    foreach ($ip in (Scan-Subnets -prefixes $subnets -port $cfg.Port)) {
        $endpoint = "${ip}:$($cfg.Port)"
        if (Test-Endpoint $endpoint $($cfg.PhysicalSerial)) {
            $cfg.IpAddress = $ip
            $cfg | ConvertTo-Json | Set-Content -LiteralPath $ConfigPath -Encoding UTF8
            Write-Host "Found phone at: $endpoint (configuration updated)" -ForegroundColor Green
            return $endpoint
        }
    }
    return $null
}

function Start-Watchdog {
    param($cfg)
    Write-Host "Watchdog started for $($cfg.Model) ($($cfg.PhysicalSerial))" -ForegroundColor Cyan
    while ($true) {
        $endpoint = Find-Endpoint $cfg
        if (-not $endpoint) {
            Write-Warning "Phone not reachable. Retrying in $ReconnectDelaySeconds seconds."
            Start-Sleep -Seconds $ReconnectDelaySeconds
            continue
        }
        if ($ConnectOnly) {
            Write-Host "ADB Wi-Fi is ready at $endpoint" -ForegroundColor Green
            return
        }
        Write-Host "Starting scrcpy through $endpoint..." -ForegroundColor Green
        # Force Normal window style so the UI opens on screen even if script is hidden
        $proc = Start-Process $Scrcpy -ArgumentList @("-s", $endpoint) -WindowStyle Normal -PassThru -Wait
        if ($proc.ExitCode -eq 0) {
            Write-Host "scrcpy closed normally." -ForegroundColor Yellow
            return
        }
        Write-Warning "scrcpy exited with code $($proc.ExitCode). Reconnecting in $ReconnectDelaySeconds seconds."
        Run-Cmd $Adb @("disconnect", $endpoint) | Out-Null
        Start-Sleep -Seconds $ReconnectDelaySeconds
    }
}

# --- Main Entry Point ---
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$LauncherPath = Join-Path $DesktopPath "Start Scrcpy WiFi.cmd"
$LauncherContent = "@echo off`r`npowershell -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`"`r`n"
Set-Content -LiteralPath $LauncherPath -Value $LauncherContent -Encoding Ascii

$Tools = Resolve-ScrcpyTools
$Adb = $Tools.Adb
$Scrcpy = $Tools.Scrcpy
$env:ADB = $Adb

$sdkRoot = Split-Path -Parent (Split-Path -Parent $Adb)
if (Test-Path "$sdkRoot\platform-tools\adb.exe") {
    $env:ANDROID_HOME = $sdkRoot
    $env:ANDROID_SDK_ROOT = $sdkRoot
}

Write-Host "ADB:    $Adb"
Write-Host "scrcpy: $Scrcpy"

Run-Cmd $Adb "start-server" | Out-Null

$devices = Get-Devices
$usbDevices = @($devices | Where-Object { -not $_.IsTcpIp -and $_.State -eq "device" })
$unauth = @($devices | Where-Object { -not $_.IsTcpIp -and $_.State -eq "unauthorized" })

if ($unauth.Count -gt 0) {
    throw "USB device is unauthorized. Unlock phone and approve debugging prompt."
}

$cfg = $null
if (Test-Path $ConfigPath) {
    try {
        $cfg = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
        if (-not ($cfg.IpAddress -and $cfg.Port -and $cfg.PhysicalSerial -and $cfg.Model)) { throw "Invalid configuration fields" }
    } catch {
        $cfg = $null
    }
}

if ($cfg) {
    $saved = "$($cfg.IpAddress):$($cfg.Port)"
    Write-Host "Checking saved Wi-Fi connection: $saved"
    if (Test-Endpoint $saved $($cfg.PhysicalSerial)) {
        Write-Host "Saved ADB Wi-Fi connection is ready: $saved" -ForegroundColor Green
    } elseif ($usbDevices.Count -eq 1) {
        Write-Warning "Saved Wi-Fi connection unavailable. Reconfiguring through USB..."
        $cfg = Init-UsbDevice $usbDevices[0]
    } else {
        Write-Warning "Saved endpoint unavailable. No USB phone connected. Trying automatic network recovery..."
    }
} elseif ($usbDevices.Count -eq 1) {
    $cfg = Init-UsbDevice $usbDevices[0]
} else {
    throw "No verified ADB Wi-Fi configuration exists, and no USB phone is connected. Connect phone via USB first."
}

Start-Watchdog $cfg
