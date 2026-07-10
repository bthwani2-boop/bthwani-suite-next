Set-StrictMode -Version Latest

function Resolve-BthwaniAdb {
    $DefaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    $Candidates = New-Object System.Collections.Generic.List[string]

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
            throw "Android device is offline. Reconnect ADB or restart the phone connection."
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

    # For the user's real-device workflow, prefer the sole TCP/IP connection.
    $TcpDevices = @(
        $Online |
            Where-Object IsTcpIp
    )

    if ($TcpDevices.Count -eq 1) {
        return $TcpDevices[0]
    }

    if ($TcpDevices.Count -gt 1) {
        $Available = ($TcpDevices.Serial -join ", ")
        throw "Multiple TCP/IP Android devices found: $Available. Set BTHWANI_ANDROID_SERIAL."
    }

    if ($Online.Count -eq 1) {
        return $Online[0]
    }

    $Available = ($Online.Serial -join ", ")
    throw "Multiple Android devices found: $Available. Set BTHWANI_ANDROID_SERIAL."
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
        & $AdbPath `
            -s $Serial `
            reverse `
            "tcp:$Port" `
            "tcp:$Port" |
            Out-Null

        if ($LASTEXITCODE -ne 0) {
            throw "adb reverse failed for $Serial on port $Port."
        }
    }
}
