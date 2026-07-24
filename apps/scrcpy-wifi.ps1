param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 5555,

    [ValidateRange(1, 60)]
    [int]$ReconnectDelaySeconds = 3,

    [switch]$ConnectOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Shared ADB helper (Resolve-BthwaniAdb + Start-BthwaniAdbServer)
# ---------------------------------------------------------------------------
$AdbHelper = Join-Path $PSScriptRoot "..\tools\scripts\mobile-adb.ps1"
if (-not (Test-Path -LiteralPath $AdbHelper -PathType Leaf)) {
    throw "ADB helper not found: $AdbHelper"
}
. $AdbHelper

# ---------------------------------------------------------------------------
# Config persistence
# ---------------------------------------------------------------------------
$StateDir  = Join-Path $env:LOCALAPPDATA "Bthwani\ScrcpyWiFi"
$ConfigPath = Join-Path $StateDir "config.json"
New-Item -ItemType Directory -Path $StateDir -Force | Out-Null

# Remove legacy folder if it survived earlier cleanup
$LegacyDir = Join-Path $env:LOCALAPPDATA "ScrcpyWiFi"
Remove-Item -LiteralPath $LegacyDir -Recurse -Force -ErrorAction SilentlyContinue

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
function Run-Cmd {
    param([string]$Cmd, [string[]]$Args)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $out = & $Cmd $Args 2>&1
    $ErrorActionPreference = $prev
    [pscustomobject]@{ ExitCode = $LASTEXITCODE; Output = ($out -join "`n").Trim() }
}

function Get-Devices {
    $res = Run-Cmd $Adb @("devices", "-l")
    foreach ($line in ($res.Output -split "`n")) {
        if ($line -match "^(?<serial>\S+)\s+(?<state>device|offline|unauthorized)(\s+(?<details>.*))?$") {
            [pscustomobject]@{
                Serial  = $Matches.serial
                State   = $Matches.state
                IsTcpIp = [bool]($Matches.serial -match "^\d{1,3}(\.\d{1,3}){3}:\d+$")
            }
        }
    }
}

function Get-PhoneIp {
    param([string]$Serial)
    $r = Run-Cmd $Adb @("-s", $Serial, "shell", "ip -f inet addr show wlan0")
    if ($r.Output -match "inet\s+(?<ip>\d{1,3}(\.\d{1,3}){3})/") { return $Matches.ip }
    $r = Run-Cmd $Adb @("-s", $Serial, "shell", "getprop dhcp.wlan0.ipaddress")
    if ($r.Output -match "^\d{1,3}(\.\d{1,3}){3}$") { return $r.Output.Trim() }
    # Fallback: scan active interfaces
    $r = Run-Cmd $Adb @("-s", $Serial, "shell", "ip -f inet addr show")
    $iface = ""
    foreach ($line in ($r.Output -split "`n")) {
        $t = $line.Trim()
        if ($t -match "^\d+:\s+(?<name>[^:@\s]+)") { $iface = $Matches.name }
        if ($t -match "inet\s+(?<ip>\d{1,3}(\.\d{1,3}){3})/" -and $iface -notmatch "lo|dummy") {
            if ($iface -match "wlan|ap|eth") { return $Matches.ip }
        }
    }
    return $null
}

function Test-Endpoint {
    param([string]$Endpoint, [string]$ExpectedSerial)
    Run-Cmd $Adb @("connect", $Endpoint) | Out-Null
    Start-Sleep -Milliseconds 400
    if ((Run-Cmd $Adb @("-s", $Endpoint, "get-state")).Output -ne "device") { return $false }
    $serial = ((Run-Cmd $Adb @("-s", $Endpoint, "shell", "getprop ro.serialno")).Output -split "`n" |
               Select-Object -Last 1).Trim()
    if ($serial -eq $ExpectedSerial) { return $true }
    Run-Cmd $Adb @("disconnect", $Endpoint) | Out-Null
    return $false
}

function Get-LocalSubnets {
    try {
        Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object { $_.IPAddress -notmatch "^(127\.|169\.254\.)" -and -not $_.SkipAsSource } |
            ForEach-Object { ($_.IPAddress -split '\.')[0..2] -join '.' } |
            Select-Object -Unique
    } catch {
        [System.Net.Dns]::GetHostEntry([System.Net.Dns]::GetHostName()).AddressList |
            Where-Object AddressFamily -eq InterNetwork |
            ForEach-Object { $_.IPAddressToString } |
            Where-Object { $_ -notmatch "^(127\.|169\.254\.)" } |
            ForEach-Object { ($_ -split '\.')[0..2] -join '.' } |
            Select-Object -Unique
    }
}

function Scan-Subnets {
    param([string[]]$Prefixes, [int]$ScanPort)
    $clients = foreach ($prefix in $Prefixes) {
        Write-Host "Scanning $prefix.0/24 on port $ScanPort..."
        foreach ($i in 1..254) {
            $c = [System.Net.Sockets.TcpClient]::new()
            try { [pscustomobject]@{ Client = $c; Ar = $c.BeginConnect("$prefix.$i", $ScanPort, $null, $null); Ip = "$prefix.$i" } }
            catch { $c.Close() }
        }
    }
    Start-Sleep -Milliseconds 1000
    foreach ($c in $clients) {
        if ($c.Ar.IsCompleted -and $c.Client.Connected) { $c.Ip }
        $c.Client.Close()
    }
}

function Init-UsbDevice {
    param($Usb)
    Write-Host "Configuring phone via USB ($($Usb.Serial))..." -ForegroundColor Cyan
    $model  = (Run-Cmd $Adb @("-s", $Usb.Serial, "shell", "getprop ro.product.model")).Output
    $serial = (Run-Cmd $Adb @("-s", $Usb.Serial, "shell", "getprop ro.serialno")).Output
    $ip     = Get-PhoneIp -Serial $Usb.Serial
    if (-not $ip) { throw "Phone has no usable IP. Ensure Wi-Fi is connected on the device." }
    Write-Host "Phone: $model ($serial) at $ip" -ForegroundColor Green
    $r = Run-Cmd $Adb @("-s", $Usb.Serial, "tcpip", "$Port")
    if ($r.Output -notmatch "(?i)(restarting in TCP mode|already.*TCP)") {
        Write-Warning "tcpip output: $($r.Output)"
    }
    Start-Sleep -Seconds 3
    $endpoint = "${ip}:$Port"
    if (-not (Test-Endpoint $endpoint $serial)) {
        throw "Could not connect to ADB Wi-Fi endpoint: $endpoint"
    }
    $cfg = [ordered]@{ IpAddress = $ip; Port = $Port; PhysicalSerial = $serial; Model = $model }
    $cfg | ConvertTo-Json | Set-Content -LiteralPath $ConfigPath -Encoding UTF8
    Write-Host "Config saved: $ConfigPath" -ForegroundColor Green
    return $cfg
}

function Find-Endpoint {
    param($Cfg)
    $saved = "$($Cfg.IpAddress):$($Cfg.Port)"
    if (Test-Endpoint $saved $Cfg.PhysicalSerial) { return $saved }
    Write-Warning "Saved endpoint $saved unavailable. Scanning network..."
    $subnets = @(Get-LocalSubnets)
    $parts = $Cfg.IpAddress -split '\.'
    if ($parts.Count -eq 4) { $subnets += "$($parts[0]).$($parts[1]).$($parts[2])" }
    foreach ($ip in (Scan-Subnets -Prefixes ($subnets | Select-Object -Unique) -ScanPort $Cfg.Port)) {
        $ep = "${ip}:$($Cfg.Port)"
        if (Test-Endpoint $ep $Cfg.PhysicalSerial) {
            $Cfg.IpAddress = $ip
            $Cfg | ConvertTo-Json | Set-Content -LiteralPath $ConfigPath -Encoding UTF8
            Write-Host "Found at $ep (config updated)" -ForegroundColor Green
            return $ep
        }
    }
    return $null
}

function Start-Watchdog {
    param($Cfg)
    $scrcpy = (Get-Command scrcpy.exe -ErrorAction Stop | Select-Object -First 1).Source
    Write-Host "Watchdog started for $($Cfg.Model) ($($Cfg.PhysicalSerial))" -ForegroundColor Cyan
    while ($true) {
        $endpoint = Find-Endpoint $Cfg
        if (-not $endpoint) {
            Write-Warning "Phone unreachable. Retrying in $ReconnectDelaySeconds s."
            Start-Sleep -Seconds $ReconnectDelaySeconds
            continue
        }
        if ($ConnectOnly) {
            Write-Host "ADB Wi-Fi ready: $endpoint" -ForegroundColor Green
            return
        }
        Write-Host "Starting scrcpy on $endpoint..." -ForegroundColor Green
        $proc = Start-Process $scrcpy -ArgumentList @("-s", $endpoint) -WindowStyle Normal -PassThru -Wait
        if ($proc.ExitCode -eq 0) { Write-Host "scrcpy closed normally." -ForegroundColor Yellow; return }
        Write-Warning "scrcpy exited $($proc.ExitCode). Reconnecting in $ReconnectDelaySeconds s."
        Run-Cmd $Adb @("disconnect", $endpoint) | Out-Null
        Start-Sleep -Seconds $ReconnectDelaySeconds
    }
}

# ---------------------------------------------------------------------------
# Desktop launcher (.cmd shortcut)
# ---------------------------------------------------------------------------
$LauncherPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "Start Scrcpy WiFi.cmd"
Set-Content -LiteralPath $LauncherPath -Encoding Ascii -Value "@echo off`r`npwsh -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"`r`n"

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
$Adb = Resolve-BthwaniAdb
Write-Host "ADB: $Adb"

Start-BthwaniAdbServer -AdbPath $Adb

$devices    = @(Get-Devices)
$usbDevices = @($devices | Where-Object { -not $_.IsTcpIp -and $_.State -eq "device" })
$unauth     = @($devices | Where-Object { -not $_.IsTcpIp -and $_.State -eq "unauthorized" })

if ($unauth.Count -gt 0) {
    throw "USB device is unauthorized. Unlock phone and approve USB debugging."
}

$cfg = $null
if (Test-Path $ConfigPath) {
    try {
        $cfg = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
        if (-not ($cfg.IpAddress -and $cfg.Port -and $cfg.PhysicalSerial -and $cfg.Model)) {
            throw "Invalid config"
        }
    } catch { $cfg = $null }
}

if ($cfg) {
    $saved = "$($cfg.IpAddress):$($cfg.Port)"
    Write-Host "Checking saved connection: $saved"
    if (-not (Test-Endpoint $saved $cfg.PhysicalSerial)) {
        if ($usbDevices.Count -eq 1) {
            Write-Warning "Wi-Fi unavailable. Reconfiguring via USB..."
            $cfg = Init-UsbDevice $usbDevices[0]
        } else {
            Write-Warning "Saved endpoint unavailable. Will scan on watchdog start."
        }
    }
} elseif ($usbDevices.Count -eq 1) {
    $cfg = Init-UsbDevice $usbDevices[0]
} else {
    throw "No Wi-Fi config found and no USB phone connected. Connect phone via USB first."
}

Start-Watchdog $cfg
