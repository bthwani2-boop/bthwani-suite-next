param(
    [ValidateRange(1024, 65535)]
    [int] $Port = 5555,

    [ValidateRange(1, 60)]
    [int] $ReconnectDelaySeconds = 3,

    [switch] $ConnectOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$StateDirectory = Join-Path $env:LOCALAPPDATA "Bthwani\ScrcpyWiFi"
$ConfigPath = Join-Path $StateDirectory "config.json"

New-Item `
    -ItemType Directory `
    -Path $StateDirectory `
    -Force |
    Out-Null

# Remove files created by the previous invalid setup.
$LegacyStateDirectory = Join-Path $env:LOCALAPPDATA "ScrcpyWiFi"
$LegacyDesktopLauncher = Join-Path `
    ([Environment]::GetFolderPath("Desktop")) `
    "Start Scrcpy WiFi.cmd"

Remove-Item `
    -LiteralPath $LegacyStateDirectory `
    -Recurse `
    -Force `
    -ErrorAction SilentlyContinue

Remove-Item `
    -LiteralPath $LegacyDesktopLauncher `
    -Force `
    -ErrorAction SilentlyContinue

function Write-Section {
    param(
        [Parameter(Mandatory)]
        [string] $Title
    )

    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host "===================================================" -ForegroundColor Cyan
}

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory)]
        [string] $FilePath,

        [string[]] $Arguments = @(),

        [switch] $IgnoreExitCode
    )

    $StartInfo = New-Object System.Diagnostics.ProcessStartInfo
    $StartInfo.FileName = $FilePath
    $StartInfo.Arguments = ($Arguments -join " ")
    $StartInfo.UseShellExecute = $false
    $StartInfo.CreateNoWindow = $true
    $StartInfo.RedirectStandardOutput = $true
    $StartInfo.RedirectStandardError = $true

    $Process = New-Object System.Diagnostics.Process
    $Process.StartInfo = $StartInfo

    try {
        if (-not $Process.Start()) {
            throw "Could not start native process: $FilePath"
        }

        $StandardOutput = $Process.StandardOutput.ReadToEnd()
        $StandardError = $Process.StandardError.ReadToEnd()

        $Process.WaitForExit()

        $OutputParts = @()

        if (-not [string]::IsNullOrWhiteSpace($StandardOutput)) {
            $OutputParts += $StandardOutput.Trim()
        }

        if (-not [string]::IsNullOrWhiteSpace($StandardError)) {
            $OutputParts += $StandardError.Trim()
        }

        $CombinedOutput = ($OutputParts -join [Environment]::NewLine).Trim()

        $Result = [pscustomobject]@{
            ExitCode = $Process.ExitCode
            Output   = $CombinedOutput
        }

        if ($Process.ExitCode -ne 0 -and -not $IgnoreExitCode) {
            throw @"
Native command failed.

Executable: $FilePath
Arguments:  $($Arguments -join " ")
Exit code:  $($Process.ExitCode)
Output:
$CombinedOutput
"@
        }

        return $Result
    }
    finally {
        $Process.Dispose()
    }
}

function Get-LastOutputLine {
    param(
        [AllowEmptyString()]
        [string] $Text
    )

    return @(
        $Text -split "\r?\n" |
            ForEach-Object { $_.Trim() } |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    ) | Select-Object -Last 1
}

function Resolve-ScrcpyTools {
    $ScrcpyCommand = Get-Command `
        scrcpy.exe `
        -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if (-not $ScrcpyCommand) {
        throw @"
scrcpy.exe was not found.

Install scrcpy or add its directory to PATH, then run this script again.
"@
    }

    $ScrcpyPath = $ScrcpyCommand.Source
    $ScrcpyDirectory = Split-Path -Parent $ScrcpyPath

    # BTHWANI_SDK_ADB_SSOT:
    # scrcpy, Expo and all repository scripts must use one ADB binary.
    $SdkAdbCandidate = Join-Path `
        $env:LOCALAPPDATA `
        "Android\Sdk\platform-tools\adb.exe"

    $BundledAdbCandidate = Join-Path `
        $ScrcpyDirectory `
        "adb.exe"

    $AdbCandidates = @(
        $SdkAdbCandidate,
        $BundledAdbCandidate
    )

    if ($env:ANDROID_HOME) {
        $AdbCandidates += Join-Path `
            $env:ANDROID_HOME `
            "platform-tools\adb.exe"
    }

    if ($env:ANDROID_SDK_ROOT) {
        $AdbCandidates += Join-Path `
            $env:ANDROID_SDK_ROOT `
            "platform-tools\adb.exe"
    }

    $PathAdb = Get-Command `
        adb.exe `
        -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if ($PathAdb) {
        $AdbCandidates += $PathAdb.Source
    }

    $AdbPath = $null

    foreach ($Candidate in ($AdbCandidates | Select-Object -Unique)) {
        if (
            -not [string]::IsNullOrWhiteSpace($Candidate) -and
            (Test-Path -LiteralPath $Candidate)
        ) {
            $AdbPath = (Resolve-Path -LiteralPath $Candidate).Path
            break
        }
    }

    if (-not $AdbPath) {
        throw "adb.exe was not found."
    }

    return [pscustomobject]@{
        Scrcpy = (Resolve-Path -LiteralPath $ScrcpyPath).Path
        Adb    = $AdbPath
    }
}

function Get-AndroidDevices {
    param(
        [Parameter(Mandatory)]
        [string] $AdbPath
    )

    $Result = Invoke-NativeCommand `
        -FilePath $AdbPath `
        -Arguments @("devices", "-l")

    $Devices = foreach ($RawLine in ($Result.Output -split "\r?\n")) {
        $Line = $RawLine.Trim()

        if (
            $Line -match
            "^(?<serial>\S+)\s+(?<state>device|offline|unauthorized)(?:\s+(?<details>.*))?$"
        ) {
            [pscustomobject]@{
                Serial  = $Matches.serial
                State   = $Matches.state
                Details = $Matches.details
                IsTcpIp = (
                    $Matches.serial -match
                    "^\d{1,3}(?:\.\d{1,3}){3}:\d+$"
                )
            }
        }
    }

    return @($Devices)
}

function Test-PrivateIPv4 {
    param(
        [Parameter(Mandatory)]
        [string] $Address
    )

    try {
        $Bytes = [System.Net.IPAddress]::Parse($Address).GetAddressBytes()
    }
    catch {
        return $false
    }

    if ($Bytes.Count -ne 4) {
        return $false
    }

    return (
        $Bytes[0] -eq 10 -or
        (
            $Bytes[0] -eq 172 -and
            $Bytes[1] -ge 16 -and
            $Bytes[1] -le 31
        ) -or
        (
            $Bytes[0] -eq 192 -and
            $Bytes[1] -eq 168
        )
    )
}

function Test-SameIPv4Subnet {
    param(
        [Parameter(Mandatory)]
        [string] $FirstAddress,

        [Parameter(Mandatory)]
        [string] $SecondAddress,

        [Parameter(Mandatory)]
        [ValidateRange(0, 32)]
        [int] $PrefixLength
    )

    try {
        $FirstBytes = (
            [System.Net.IPAddress]::Parse($FirstAddress)
        ).GetAddressBytes()

        $SecondBytes = (
            [System.Net.IPAddress]::Parse($SecondAddress)
        ).GetAddressBytes()
    }
    catch {
        return $false
    }

    if ($FirstBytes.Count -ne 4 -or $SecondBytes.Count -ne 4) {
        return $false
    }

    $CompleteBytes = [math]::Floor($PrefixLength / 8)
    $RemainingBits = $PrefixLength % 8

    for ($Index = 0; $Index -lt $CompleteBytes; $Index++) {
        if ($FirstBytes[$Index] -ne $SecondBytes[$Index]) {
            return $false
        }
    }

    if ($RemainingBits -gt 0) {
        $Mask = [byte](256 - [math]::Pow(2, 8 - $RemainingBits))

        if (
            ($FirstBytes[$CompleteBytes] -band $Mask) -ne
            ($SecondBytes[$CompleteBytes] -band $Mask)
        ) {
            return $false
        }
    }

    return $true
}

function Get-UsableLocalIPv4Addresses {
    $IgnoredAdapterPattern = (
        "vEthernet|Hyper-V|Virtual|VMware|VirtualBox|" +
        "VPN|WireGuard|Tailscale|ZeroTier|Docker|WSL|" +
        "Loopback|Bluetooth|Npcap"
    )

    $Adapters = @(
        Get-NetAdapter -ErrorAction Stop |
            Where-Object {
                $_.Status -eq "Up" -and
                $_.Name -notmatch $IgnoredAdapterPattern -and
                $_.InterfaceDescription -notmatch $IgnoredAdapterPattern
            }
    )

    $Addresses = foreach ($Adapter in $Adapters) {
        $InterfaceAddresses = @(
            Get-NetIPAddress `
                -InterfaceIndex $Adapter.ifIndex `
                -AddressFamily IPv4 `
                -ErrorAction SilentlyContinue |
                Where-Object {
                    $_.IPAddress -notmatch "^(127\.|169\.254\.)" -and
                    -not $_.SkipAsSource -and
                    (Test-PrivateIPv4 -Address $_.IPAddress)
                }
        )

        foreach ($Address in $InterfaceAddresses) {
            [pscustomobject]@{
                IPAddress        = $Address.IPAddress
                PrefixLength     = [int] $Address.PrefixLength
                AdapterName      = $Adapter.Name
                AdapterDescription = $Adapter.InterfaceDescription
            }
        }
    }

    return @(
        $Addresses |
            Sort-Object `
                @{ Expression = {
                    if (
                        $_.AdapterName -match
                        "Wi-Fi|WLAN|Wireless"
                    ) {
                        0
                    }
                    else {
                        1
                    }
                } },
                IPAddress
    )
}

function Get-PhoneWiFiAddress {
    param(
        [Parameter(Mandatory)]
        [string] $AdbPath,

        [Parameter(Mandatory)]
        [string] $UsbSerial
    )

    # Read wlan0 only. Never use the first "src" from all phone routes.
    $AddressResult = Invoke-NativeCommand `
        -FilePath $AdbPath `
        -Arguments @(
            "-s",
            $UsbSerial,
            "shell",
            "ip",
            "-f",
            "inet",
            "addr",
            "show",
            "wlan0"
        ) `
        -IgnoreExitCode

    $PhoneAddress = $null

    if (
        $AddressResult.Output -match
        "\binet\s+(?<ip>(?:\d{1,3}\.){3}\d{1,3})/"
    ) {
        $PhoneAddress = $Matches.ip
    }

    if (-not $PhoneAddress) {
        $PropertyResult = Invoke-NativeCommand `
            -FilePath $AdbPath `
            -Arguments @(
                "-s",
                $UsbSerial,
                "shell",
                "getprop",
                "dhcp.wlan0.ipaddress"
            ) `
            -IgnoreExitCode

        $PropertyAddress = Get-LastOutputLine `
            -Text $PropertyResult.Output

        if (
            $PropertyAddress -match
            "^(?:\d{1,3}\.){3}\d{1,3}$"
        ) {
            $PhoneAddress = $PropertyAddress
        }
    }

    if (-not $PhoneAddress) {
        throw @"
The phone has no usable IPv4 address on wlan0.

Confirm:
- Wi-Fi is enabled on the phone.
- The phone is connected to the same router as the laptop.
- Mobile data is not being mistaken for Wi-Fi.
"@
    }

    if (-not (Test-PrivateIPv4 -Address $PhoneAddress)) {
        throw "Rejected non-private phone wlan0 address: $PhoneAddress"
    }

    return $PhoneAddress
}

function Get-MatchingLocalNetwork {
    param(
        [Parameter(Mandatory)]
        [string] $PhoneAddress
    )

    $LocalAddresses = @(Get-UsableLocalIPv4Addresses)

    if ($LocalAddresses.Count -eq 0) {
        throw "No usable physical private IPv4 address was found on the laptop."
    }

    $MatchingAddresses = @(
        $LocalAddresses |
            Where-Object {
                Test-SameIPv4Subnet `
                    -FirstAddress $_.IPAddress `
                    -SecondAddress $PhoneAddress `
                    -PrefixLength $_.PrefixLength
            }
    )

    if ($MatchingAddresses.Count -eq 0) {
        $Available = (
            $LocalAddresses |
                ForEach-Object {
                    "$($_.IPAddress)/$($_.PrefixLength) [$($_.AdapterName)]"
                }
        ) -join ", "

        throw @"
The phone wlan0 address is not on the laptop's active physical network.

Phone wlan0: $PhoneAddress
Laptop IPv4: $Available

Do not continue with this address.
"@
    }

    return $MatchingAddresses[0]
}

function Test-AdbEndpoint {
    param(
        [Parameter(Mandatory)]
        [string] $AdbPath,

        [Parameter(Mandatory)]
        [string] $Endpoint,

        [Parameter(Mandatory)]
        [string] $ExpectedSerial
    )

    $ConnectResult = Invoke-NativeCommand `
        -FilePath $AdbPath `
        -Arguments @("connect", $Endpoint) `
        -IgnoreExitCode

    Start-Sleep -Milliseconds 500

    $StateResult = Invoke-NativeCommand `
        -FilePath $AdbPath `
        -Arguments @("-s", $Endpoint, "get-state") `
        -IgnoreExitCode

    $State = Get-LastOutputLine -Text $StateResult.Output

    if ($State -ne "device") {
        return $false
    }

    $SerialResult = Invoke-NativeCommand `
        -FilePath $AdbPath `
        -Arguments @(
            "-s",
            $Endpoint,
            "shell",
            "getprop",
            "ro.serialno"
        ) `
        -IgnoreExitCode

    $DetectedSerial = Get-LastOutputLine `
        -Text $SerialResult.Output

    if (
        [string]::IsNullOrWhiteSpace($DetectedSerial) -or
        $DetectedSerial -ne $ExpectedSerial
    ) {
        Invoke-NativeCommand `
            -FilePath $AdbPath `
            -Arguments @("disconnect", $Endpoint) `
            -IgnoreExitCode |
            Out-Null

        return $false
    }

    return $true
}

function Save-WiFiConfiguration {
    param(
        [Parameter(Mandatory)]
        [string] $PhoneAddress,

        [Parameter(Mandatory)]
        [int] $PhonePort,

        [Parameter(Mandatory)]
        [string] $PhysicalSerial,

        [Parameter(Mandatory)]
        [string] $Model,

        [Parameter(Mandatory)]
        [string] $AdbPath,

        [Parameter(Mandatory)]
        [string] $ScrcpyPath
    )

    $Configuration = [ordered]@{
        IpAddress       = $PhoneAddress
        Port            = $PhonePort
        PhysicalSerial  = $PhysicalSerial
        Model           = $Model
        AdbPath         = $AdbPath
        ScrcpyPath      = $ScrcpyPath
        ConfiguredAtUtc = [DateTime]::UtcNow.ToString("o")
    }

    $Configuration |
        ConvertTo-Json |
        Set-Content `
            -LiteralPath $ConfigPath `
            -Encoding UTF8
}

function Initialize-WiFiAdbFromUsb {
    param(
        [Parameter(Mandatory)]
        [string] $AdbPath,

        [Parameter(Mandatory)]
        [string] $ScrcpyPath,

        [Parameter(Mandatory)]
        [pscustomobject] $UsbDevice
    )

    Write-Section "USB TO WIFI ADB SETUP"

    if ($UsbDevice.State -ne "device") {
        throw "USB device state is '$($UsbDevice.State)'."
    }

    $UsbSerial = $UsbDevice.Serial

    $ModelResult = Invoke-NativeCommand `
        -FilePath $AdbPath `
        -Arguments @(
            "-s",
            $UsbSerial,
            "shell",
            "getprop",
            "ro.product.model"
        )

    $SerialResult = Invoke-NativeCommand `
        -FilePath $AdbPath `
        -Arguments @(
            "-s",
            $UsbSerial,
            "shell",
            "getprop",
            "ro.serialno"
        )

    $Model = Get-LastOutputLine -Text $ModelResult.Output
    $PhysicalSerial = Get-LastOutputLine -Text $SerialResult.Output

    if ([string]::IsNullOrWhiteSpace($PhysicalSerial)) {
        throw "Could not read the phone physical serial."
    }

    $PhoneAddress = Get-PhoneWiFiAddress `
        -AdbPath $AdbPath `
        -UsbSerial $UsbSerial

    $LocalNetwork = Get-MatchingLocalNetwork `
        -PhoneAddress $PhoneAddress

    $Endpoint = "${PhoneAddress}:$Port"

    Write-Host "USB serial:       $UsbSerial" -ForegroundColor Green
    Write-Host "Phone model:      $Model" -ForegroundColor Green
    Write-Host "Physical serial:  $PhysicalSerial" -ForegroundColor Green
    Write-Host "Phone wlan0:      $PhoneAddress" -ForegroundColor Green
    Write-Host "Laptop IPv4:      $($LocalNetwork.IPAddress)" -ForegroundColor Green
    Write-Host "Laptop adapter:   $($LocalNetwork.AdapterName)" -ForegroundColor Green
    Write-Host "ADB endpoint:     $Endpoint" -ForegroundColor Green
    Write-Host ""

    $TcpIpResult = Invoke-NativeCommand `
        -FilePath $AdbPath `
        -Arguments @("-s", $UsbSerial, "tcpip", [string] $Port)

    if (
        $TcpIpResult.Output -notmatch
        "(?i)(restarting in TCP mode|already.*TCP)"
    ) {
        throw @"
The phone did not confirm ADB TCP/IP activation.

Output:
$($TcpIpResult.Output)
"@
    }

    Start-Sleep -Seconds 4

    $Verified = $false

    for ($Attempt = 1; $Attempt -le 10; $Attempt++) {
        Write-Host "Wi-Fi verification attempt $Attempt of 10..."

        if (
            Test-AdbEndpoint `
                -AdbPath $AdbPath `
                -Endpoint $Endpoint `
                -ExpectedSerial $PhysicalSerial
        ) {
            $Verified = $true
            break
        }

        Start-Sleep -Seconds 2
    }

    if (-not $Verified) {
        throw @"
ADB Wi-Fi could not be verified at $Endpoint.

The configuration was not saved.
Keep USB connected and confirm that port 5555 is not blocked by router client isolation.
"@
    }

    Save-WiFiConfiguration `
        -PhoneAddress $PhoneAddress `
        -PhonePort $Port `
        -PhysicalSerial $PhysicalSerial `
        -Model $Model `
        -AdbPath $AdbPath `
        -ScrcpyPath $ScrcpyPath

    Write-Host ""
    Write-Host "ADB Wi-Fi verified successfully." -ForegroundColor Green
    Write-Host "Configuration saved only after verification:" -ForegroundColor Green
    Write-Host $ConfigPath -ForegroundColor Cyan

    return Get-Content `
        -LiteralPath $ConfigPath `
        -Raw |
        ConvertFrom-Json
}

function Get-OpenTcpHosts {
    param(
        [Parameter(Mandatory)]
        [string] $SubnetPrefix,

        [Parameter(Mandatory)]
        [int] $TargetPort,

        [int] $TimeoutMilliseconds = 1500
    )

    $Probes = New-Object System.Collections.Generic.List[object]

    foreach ($HostNumber in 1..254) {
        $Address = "${SubnetPrefix}.${HostNumber}"
        $Client = New-Object System.Net.Sockets.TcpClient

        try {
            $AsyncResult = $Client.BeginConnect(
                $Address,
                $TargetPort,
                $null,
                $null
            )

            $Probes.Add(
                [pscustomobject]@{
                    Address = $Address
                    Client  = $Client
                    Async   = $AsyncResult
                }
            )
        }
        catch {
            $Client.Close()
        }
    }

    Start-Sleep -Milliseconds $TimeoutMilliseconds

    $OpenHosts = New-Object System.Collections.Generic.List[string]

    foreach ($Probe in $Probes) {
        try {
            if ($Probe.Async.IsCompleted -and $Probe.Client.Connected) {
                $Probe.Client.EndConnect($Probe.Async)
                $OpenHosts.Add($Probe.Address)
            }
        }
        catch {
        }
        finally {
            $Probe.Client.Close()
        }
    }

    return @($OpenHosts)
}

function Update-ConfigurationAddress {
    param(
        [Parameter(Mandatory)]
        [pscustomobject] $Configuration,

        [Parameter(Mandatory)]
        [string] $NewAddress
    )

    $Configuration.IpAddress = $NewAddress

    $Configuration |
        ConvertTo-Json |
        Set-Content `
            -LiteralPath $ConfigPath `
            -Encoding UTF8
}

function Find-WorkingEndpoint {
    param(
        [Parameter(Mandatory)]
        [string] $AdbPath,

        [Parameter(Mandatory)]
        [pscustomobject] $Configuration
    )

    $SavedEndpoint = "$($Configuration.IpAddress):$($Configuration.Port)"

    if (
        Test-AdbEndpoint `
            -AdbPath $AdbPath `
            -Endpoint $SavedEndpoint `
            -ExpectedSerial $Configuration.PhysicalSerial
    ) {
        return $SavedEndpoint
    }

    Write-Warning "Saved endpoint is unavailable: $SavedEndpoint"
    Write-Host "Scanning active physical local networks for the same phone..."

    $LocalAddresses = @(Get-UsableLocalIPv4Addresses)

    $SubnetPrefixes = @(
        $LocalAddresses |
            ForEach-Object {
                $Parts = $_.IPAddress.Split(".")

                if ($Parts.Count -eq 4) {
                    "$($Parts[0]).$($Parts[1]).$($Parts[2])"
                }
            } |
            Select-Object -Unique
    )

    foreach ($SubnetPrefix in $SubnetPrefixes) {
        Write-Host "Scanning ${SubnetPrefix}.0/24 on TCP port $($Configuration.Port)..."

        $Candidates = @(
            Get-OpenTcpHosts `
                -SubnetPrefix $SubnetPrefix `
                -TargetPort ([int] $Configuration.Port)
        )

        foreach ($CandidateAddress in $Candidates) {
            $CandidateEndpoint = (
                "${CandidateAddress}:$($Configuration.Port)"
            )

            if (
                Test-AdbEndpoint `
                    -AdbPath $AdbPath `
                    -Endpoint $CandidateEndpoint `
                    -ExpectedSerial $Configuration.PhysicalSerial
            ) {
                Update-ConfigurationAddress `
                    -Configuration $Configuration `
                    -NewAddress $CandidateAddress

                Write-Host (
                    "Phone found at new address: " +
                    $CandidateEndpoint
                ) -ForegroundColor Green

                return $CandidateEndpoint
            }
        }
    }

    return $null
}

function Start-ScrcpyWatchdog {
    param(
        [Parameter(Mandatory)]
        [string] $AdbPath,

        [Parameter(Mandatory)]
        [string] $ScrcpyPath,

        [Parameter(Mandatory)]
        [pscustomobject] $Configuration
    )

    Write-Section "SCRCPY WIFI WATCHDOG"

    Write-Host "Phone:         $($Configuration.Model)"
    Write-Host "Serial:        $($Configuration.PhysicalSerial)"
    Write-Host "Saved address: $($Configuration.IpAddress):$($Configuration.Port)"
    Write-Host ""
    Write-Host "Close this PowerShell window to stop the watchdog."
    Write-Host "Closing scrcpy normally also stops the watchdog."
    Write-Host ""

    while ($true) {
        $Endpoint = Find-WorkingEndpoint `
            -AdbPath $AdbPath `
            -Configuration $Configuration

        if (-not $Endpoint) {
            Write-Warning (
                "The phone is not reachable through ADB Wi-Fi. " +
                "Retrying in $ReconnectDelaySeconds seconds."
            )

            Start-Sleep -Seconds $ReconnectDelaySeconds
            continue
        }

        Write-Host ""
        Write-Host "Starting scrcpy through $Endpoint..." -ForegroundColor Green

        if ($ConnectOnly) {
            Write-Host "ADB Wi-Fi connection is ready." -ForegroundColor Green
            return
        }

        $ScrcpyProcess = Start-Process `
            -FilePath $ScrcpyPath `
            -ArgumentList @("-s", $Endpoint) `
            -PassThru `
            -Wait

        $ExitCode = $ScrcpyProcess.ExitCode

        if ($ExitCode -eq 0) {
            Write-Host ""
            Write-Host "scrcpy was closed normally." -ForegroundColor Yellow
            return
        }

        Write-Warning (
            "scrcpy stopped unexpectedly with exit code $ExitCode. " +
            "Reconnecting in $ReconnectDelaySeconds seconds."
        )

        Invoke-NativeCommand `
            -FilePath $AdbPath `
            -Arguments @("disconnect", $Endpoint) `
            -IgnoreExitCode |
            Out-Null

        Start-Sleep -Seconds $ReconnectDelaySeconds
    }
}

Write-Section "BTHWANI SCRCPY WIFI"

$Tools = Resolve-ScrcpyTools
$Adb = $Tools.Adb
$Scrcpy = $Tools.Scrcpy

# Ensure scrcpy, Expo and repository scripts use the same ADB executable.
$env:ADB = $Adb

$SdkRoot = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$SdkAdb = Join-Path $SdkRoot "platform-tools\adb.exe"

if (
    (Test-Path -LiteralPath $SdkAdb) -and
    ((Resolve-Path -LiteralPath $Adb).Path -eq
        (Resolve-Path -LiteralPath $SdkAdb).Path)
) {
    $env:ANDROID_HOME = $SdkRoot
    $env:ANDROID_SDK_ROOT = $SdkRoot
}

Write-Host "ADB:    $Adb"
Write-Host "scrcpy: $Scrcpy"

Invoke-NativeCommand `
    -FilePath $Adb `
    -Arguments @("start-server") |
    Out-Null

$Devices = Get-AndroidDevices -AdbPath $Adb

$UnauthorizedUsbDevices = @(
    $Devices |
        Where-Object {
            -not $_.IsTcpIp -and
            $_.State -eq "unauthorized"
        }
)

if ($UnauthorizedUsbDevices.Count -gt 0) {
    throw @"
The USB phone is unauthorized.

Unlock the phone and approve the USB debugging RSA prompt.
"@
}

$OnlineUsbDevices = @(
    $Devices |
        Where-Object {
            -not $_.IsTcpIp -and
            $_.State -eq "device"
        }
)

if ($OnlineUsbDevices.Count -gt 1) {
    $AvailableUsbDevices = (
        $OnlineUsbDevices.Serial -join ", "
    )

    throw @"
More than one USB Android device is connected.

Connected USB devices:
$AvailableUsbDevices
"@
}

$Configuration = $null
$SavedConfiguration = $null

if (Test-Path -LiteralPath $ConfigPath) {
    try {
        $SavedConfiguration = Get-Content `
            -LiteralPath $ConfigPath `
            -Raw |
            ConvertFrom-Json

        $RequiredProperties = @(
            "IpAddress",
            "Port",
            "PhysicalSerial",
            "Model"
        )

        foreach ($RequiredProperty in $RequiredProperties) {
            if (
                $SavedConfiguration.PSObject.Properties.Name `
                    -notcontains $RequiredProperty
            ) {
                throw "Missing configuration property: $RequiredProperty"
            }

            $PropertyValue = $SavedConfiguration.$RequiredProperty

            if (
                $null -eq $PropertyValue -or
                [string]::IsNullOrWhiteSpace([string] $PropertyValue)
            ) {
                throw "Empty configuration property: $RequiredProperty"
            }
        }

        $SavedEndpoint = (
            "$($SavedConfiguration.IpAddress):" +
            "$($SavedConfiguration.Port)"
        )

        Write-Host ""
        Write-Host "Checking saved Wi-Fi connection: $SavedEndpoint"

        if (
            Test-AdbEndpoint `
                -AdbPath $Adb `
                -Endpoint $SavedEndpoint `
                -ExpectedSerial $SavedConfiguration.PhysicalSerial
        ) {
            $Configuration = $SavedConfiguration

            Write-Host (
                "Saved ADB Wi-Fi connection is ready: " +
                $SavedEndpoint
            ) -ForegroundColor Green
        }
        elseif ($OnlineUsbDevices.Count -eq 1) {
            Write-Warning (
                "The saved Wi-Fi connection is unavailable. " +
                "Reconfiguring automatically through USB."
            )

            $Configuration = Initialize-WiFiAdbFromUsb `
                -AdbPath $Adb `
                -ScrcpyPath $Scrcpy `
                -UsbDevice $OnlineUsbDevices[0]
        }
        else {
            # The watchdog will scan the active LAN and keep retrying.
            $Configuration = $SavedConfiguration

            Write-Warning (
                "The saved endpoint is currently unavailable. " +
                "No USB phone is connected, so automatic LAN discovery " +
                "and reconnection will be used."
            )
        }
    }
    catch {
        if ($OnlineUsbDevices.Count -eq 1) {
            Write-Warning (
                "The saved configuration is invalid. " +
                "Recreating it automatically through USB. Cause: " +
                $_.Exception.Message
            )

            Remove-Item `
                -LiteralPath $ConfigPath `
                -Force `
                -ErrorAction SilentlyContinue

            $Configuration = Initialize-WiFiAdbFromUsb `
                -AdbPath $Adb `
                -ScrcpyPath $Scrcpy `
                -UsbDevice $OnlineUsbDevices[0]
        }
        else {
            throw @"
The saved ADB Wi-Fi configuration is invalid, and no USB phone is connected.

Connect the phone through USB once and run this same script again.

Cause:
$($_.Exception.Message)
"@
        }
    }
}
elseif ($OnlineUsbDevices.Count -eq 1) {
    $Configuration = Initialize-WiFiAdbFromUsb `
        -AdbPath $Adb `
        -ScrcpyPath $Scrcpy `
        -UsbDevice $OnlineUsbDevices[0]
}
else {
    throw @"
No verified ADB Wi-Fi configuration exists.

Initial setup:
1. Connect the phone through USB.
2. Unlock the phone.
3. Enable USB debugging.
4. Approve the RSA prompt.
5. Run this same script again.
"@
}

Start-ScrcpyWatchdog `
    -AdbPath $Adb `
    -ScrcpyPath $Scrcpy `
    -Configuration $Configuration