Set-StrictMode -Version Latest

function Resolve-BthwaniAdb {
    $DefaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    $Candidates = New-Object System.Collections.Generic.List[string]

    # Keep scrcpy and the mobile runtimes on one ADB executable/server.
    if ($env:ADB) {
        $Candidates.Add($env:ADB)
    }

    $Scrcpy = Get-Command scrcpy.exe -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if ($Scrcpy) {
        $ScrcpyAdb = Join-Path (Split-Path $Scrcpy.Source) "adb.exe"
        $Candidates.Add($ScrcpyAdb)
    }

    if ($env:ANDROID_HOME) {
        $Candidates.Add(
            (Join-Path $env:ANDROID_HOME "platform-tools\adb.exe")
        )
    }

    if ($env:ANDROID_SDK_ROOT) {
        $Candidates.Add(
            (Join-Path $env:ANDROID_SDK_ROOT "platform-tools\adb.exe")
        )
    }

    $DefaultAdb = Join-Path $DefaultSdk "platform-tools\adb.exe"
    $Candidates.Add($DefaultAdb)

    $PathAdb = Get-Command adb.exe -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if ($PathAdb) {
        $Candidates.Add($PathAdb.Source)
    }

    foreach ($Candidate in ($Candidates | Select-Object -Unique)) {
        if ($Candidate -and (Test-Path -LiteralPath $Candidate)) {
            $Resolved = (Resolve-Path -LiteralPath $Candidate).Path
            $env:ADB = $Resolved

            if ($Resolved -eq $DefaultAdb) {
                $env:ANDROID_HOME = $DefaultSdk
                $env:ANDROID_SDK_ROOT = $DefaultSdk
            }

            return $Resolved
        }
    }

    throw @"
ADB was not found.

Expected one of:
- %ADB%
- adb.exe next to scrcpy.exe
- %ANDROID_HOME%\platform-tools\adb.exe
- %ANDROID_SDK_ROOT%\platform-tools\adb.exe
- %LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
- adb.exe in PATH
"@
}

function Get-BthwaniAndroidDevices {
    param(
        [Parameter(Mandatory)]
        [string] $AdbPath
    )

    $RawOutput = @(& $AdbPath devices -l 2>&1)

    if ($LASTEXITCODE -ne 0) {
        throw "adb devices failed: $($RawOutput -join [Environment]::NewLine)"
    }

    $Devices = foreach ($Entry in $RawOutput) {
        $Line = [string] $Entry

        if ($Line -match "^(?<serial>\S+)\s+(?<state>device|offline|unauthorized)(?:\s+(?<details>.*))?$") {
            [pscustomobject]@{
                Serial  = $Matches.serial
                State   = $Matches.state
                Details = $Matches.details
                IsTcpIp = $Matches.serial -match "^\d{1,3}(?:\.\d{1,3}){3}:\d+$"
            }
        }
    }

    return @($Devices)
}

function Select-BthwaniAndroidDevice {
    param(
        [Parameter(Mandatory)]
        [object[]] $Devices
    )

    $Online = @(
        $Devices |
            Where-Object State -eq "device"
    )

    $Unauthorized = @(
        $Devices |
            Where-Object State -eq "unauthorized"
    )

    $Offline = @(
        $Devices |
            Where-Object State -eq "offline"
    )

    if ($Online.Count -eq 0) {
        if ($Unauthorized.Count -gt 0) {
            throw "Android device is unauthorized. Unlock the phone and approve USB debugging."
        }

        if ($Offline.Count -gt 0) {
            throw "Android device is offline. Restore the existing ADB connection; the runtime will not disconnect and reconnect it automatically."
        }

        throw "No authorized Android device is connected."
    }

    $PreferredSerial = $env:BTHWANI_ANDROID_SERIAL

    if ($PreferredSerial) {
        $Preferred = @(
            $Online |
                Where-Object Serial -eq $PreferredSerial
        )

        if ($Preferred.Count -eq 1) {
            return $Preferred[0]
        }

        $Available = ($Online.Serial -join ", ")
        throw "BTHWANI_ANDROID_SERIAL '$PreferredSerial' is unavailable. Available: $Available"
    }

    $Transport = if ($env:BTHWANI_ANDROID_TRANSPORT) {
        $env:BTHWANI_ANDROID_TRANSPORT.Trim().ToLowerInvariant()
    } else {
        "auto"
    }

    if ($Transport -notin @("auto", "usb", "tcp")) {
        throw "BTHWANI_ANDROID_TRANSPORT must be auto, usb, or tcp."
    }

    $UsbDevices = @($Online | Where-Object { -not $_.IsTcpIp })
    $TcpDevices = @($Online | Where-Object IsTcpIp)

    if ($Transport -eq "usb") {
        if ($UsbDevices.Count -eq 1) {
            return $UsbDevices[0]
        }
        if ($UsbDevices.Count -eq 0) {
            throw "No online USB Android device was found."
        }
        $Available = ($UsbDevices.Serial -join ", ")
        throw "Multiple USB Android devices found: $Available. Set BTHWANI_ANDROID_SERIAL."
    }

    if ($Transport -eq "tcp") {
        if ($TcpDevices.Count -eq 1) {
            return $TcpDevices[0]
        }
        if ($TcpDevices.Count -eq 0) {
            throw "No online TCP/IP Android device was found."
        }
        $Available = ($TcpDevices.Serial -join ", ")
        throw "Multiple TCP/IP Android devices found: $Available. Set BTHWANI_ANDROID_SERIAL."
    }

    if ($Online.Count -eq 1) {
        return $Online[0]
    }

    # When both transports expose the same phone, USB is the stable default.
    # Wi-Fi remains automatic when it is the only available transport.
    if ($UsbDevices.Count -eq 1) {
        return $UsbDevices[0]
    }

    if ($UsbDevices.Count -gt 1) {
        $Available = ($UsbDevices.Serial -join ", ")
        throw "Multiple USB Android devices found: $Available. Set BTHWANI_ANDROID_SERIAL."
    }

    if ($TcpDevices.Count -eq 1) {
        return $TcpDevices[0]
    }

    $Available = ($Online.Serial -join ", ")
    throw "Multiple Android devices found: $Available. Set BTHWANI_ANDROID_SERIAL."
}

function Get-BthwaniAdbReverseMappings {
    param(
        [Parameter(Mandatory)]
        [string] $AdbPath,

        [Parameter(Mandatory)]
        [string] $Serial
    )

    $RawOutput = @(& $AdbPath -s $Serial reverse --list 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "adb reverse --list failed for $Serial`: $($RawOutput -join [Environment]::NewLine)"
    }

    return @($RawOutput | ForEach-Object { [string] $_ })
}

function Assert-BthwaniAdbReverse {
    param(
        [Parameter(Mandatory)]
        [string] $AdbPath,

        [Parameter(Mandatory)]
        [string] $Serial,

        [Parameter(Mandatory)]
        [int[]] $Ports
    )

    $Mappings = Get-BthwaniAdbReverseMappings -AdbPath $AdbPath -Serial $Serial

    foreach ($Port in ($Ports | Select-Object -Unique)) {
        $Pattern = "tcp:$Port\s+tcp:$Port(?:\s|$)"
        $Found = @($Mappings | Where-Object { $_ -match $Pattern }).Count -gt 0
        if (-not $Found) {
            throw "adb reverse mapping was not confirmed for $Serial on port $Port."
        }
    }
}

function Invoke-BthwaniAdbReverse {
    param(
        [Parameter(Mandatory)]
        [string] $AdbPath,

        [Parameter(Mandatory)]
        [string] $Serial,

        [Parameter(Mandatory)]
        [int[]] $Ports
    )

    foreach ($Port in ($Ports | Select-Object -Unique)) {
        $RawOutput = @(
            & $AdbPath `
                -s $Serial `
                reverse `
                "tcp:$Port" `
                "tcp:$Port" `
                2>&1
        )

        if ($LASTEXITCODE -ne 0) {
            throw "adb reverse failed for $Serial on port $Port`: $($RawOutput -join [Environment]::NewLine)"
        }
    }

    Assert-BthwaniAdbReverse -AdbPath $AdbPath -Serial $Serial -Ports $Ports
}
