Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-BthwaniPrivateIpv4 {
    param([Parameter(Mandatory)][string] $Address)

    $parsed = $null
    if (-not [Net.IPAddress]::TryParse($Address, [ref] $parsed)) {
        return $false
    }
    if ($parsed.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork) {
        return $false
    }

    $bytes = $parsed.GetAddressBytes()
    if ($bytes[0] -eq 10) { return $true }
    if ($bytes[0] -eq 172 -and $bytes[1] -ge 16 -and $bytes[1] -le 31) { return $true }
    return $bytes[0] -eq 192 -and $bytes[1] -eq 168
}

function Test-BthwaniTruthySetting {
    param([AllowNull()][string] $Value)
    return ([string] $Value).Trim().ToLowerInvariant() -in @("1", "true", "yes", "on")
}

function Assert-BthwaniLanProfile {
    param(
        [Parameter(Mandatory)][int] $InterfaceIndex,
        [Parameter(Mandatory)][string] $Address
    )

    if (-not (Get-Command Get-NetConnectionProfile -ErrorAction SilentlyContinue)) {
        return "unknown"
    }

    $profile = Get-NetConnectionProfile -InterfaceIndex $InterfaceIndex -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (-not $profile) {
        return "unknown"
    }

    $category = [string] $profile.NetworkCategory
    if ($category -eq "Public" -and -not (Test-BthwaniTruthySetting -Value $env:BTHWANI_MOBILE_ALLOW_PUBLIC_NETWORK)) {
        throw "LAN address $Address belongs to a Public Windows network profile. Change the trusted development network to Private, or explicitly set BTHWANI_MOBILE_ALLOW_PUBLIC_NETWORK=1 for this run."
    }
    return $category
}

function Resolve-BthwaniMobileLanContext {
    $override = ([string] $env:BTHWANI_MOBILE_LAN_HOST).Trim()

    if ($override) {
        if (-not (Test-BthwaniPrivateIpv4 -Address $override)) {
            throw "BTHWANI_MOBILE_LAN_HOST must be an RFC1918 IPv4 address (10/8, 172.16/12, or 192.168/16)."
        }

        if (Get-Command Get-NetIPAddress -ErrorAction SilentlyContinue) {
            $match = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
                Where-Object { $_.IPAddress -eq $override -and -not $_.SkipAsSource } |
                Select-Object -First 1
            if (-not $match) {
                throw "BTHWANI_MOBILE_LAN_HOST=$override is not assigned to an active local IPv4 interface."
            }
            $profile = Assert-BthwaniLanProfile -InterfaceIndex $match.InterfaceIndex -Address $override
            return [pscustomobject]@{
                Host = $override
                InterfaceIndex = [int] $match.InterfaceIndex
                NetworkCategory = $profile
                Source = "override"
            }
        }

        return [pscustomobject]@{
            Host = $override
            InterfaceIndex = -1
            NetworkCategory = "unknown"
            Source = "override"
        }
    }

    if (Get-Command Get-NetRoute -ErrorAction SilentlyContinue) {
        $routes = @(
            Get-NetRoute `
                -AddressFamily IPv4 `
                -DestinationPrefix "0.0.0.0/0" `
                -ErrorAction SilentlyContinue |
                Where-Object { $_.State -ne "Unreachable" } |
                Sort-Object RouteMetric, InterfaceMetric
        )

        foreach ($route in $routes) {
            $addresses = @(
                Get-NetIPAddress `
                    -AddressFamily IPv4 `
                    -InterfaceIndex $route.InterfaceIndex `
                    -ErrorAction SilentlyContinue |
                    Where-Object {
                        -not $_.SkipAsSource -and
                        (Test-BthwaniPrivateIpv4 -Address $_.IPAddress)
                    }
            )
            foreach ($address in $addresses) {
                $profile = Assert-BthwaniLanProfile -InterfaceIndex $route.InterfaceIndex -Address $address.IPAddress
                return [pscustomobject]@{
                    Host = [string] $address.IPAddress
                    InterfaceIndex = [int] $route.InterfaceIndex
                    NetworkCategory = $profile
                    Source = "default-route"
                }
            }
        }
    }

    foreach ($adapter in [Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
        if ($adapter.OperationalStatus -ne [Net.NetworkInformation.OperationalStatus]::Up) { continue }
        if ($adapter.NetworkInterfaceType -eq [Net.NetworkInformation.NetworkInterfaceType]::Loopback) { continue }
        $properties = $adapter.GetIPProperties()
        if (@($properties.GatewayAddresses).Count -eq 0) { continue }
        foreach ($unicast in $properties.UnicastAddresses) {
            $candidate = $unicast.Address.ToString()
            if (Test-BthwaniPrivateIpv4 -Address $candidate) {
                return [pscustomobject]@{
                    Host = $candidate
                    InterfaceIndex = [int] $properties.GetIPv4Properties().Index
                    NetworkCategory = "unknown"
                    Source = "network-interface"
                }
            }
        }
    }

    throw "No trusted RFC1918 LAN IPv4 address could be resolved. Set BTHWANI_MOBILE_LAN_HOST to the development machine's private IPv4 address, or use BTHWANI_MOBILE_TRANSPORT=adb."
}

function Get-BthwaniMobileGatewayListener {
    param([Parameter(Mandatory)][int] $Port)

    if (-not (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue)) {
        return $null
    }
    return Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -First 1
}

function Get-BthwaniMobileGatewayDescriptorPath {
    return Join-Path ([IO.Path]::GetTempPath()) "bthwani-mobile-dev-gateway-v1.json"
}

function Read-BthwaniMobileGatewayDescriptor {
    $path = Get-BthwaniMobileGatewayDescriptorPath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        return $null
    }
    try {
        return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -ErrorAction Stop
    } catch {
        Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
        return $null
    }
}

function Write-BthwaniMobileGatewayDescriptor {
    param(
        [Parameter(Mandatory)][string] $LanHost,
        [Parameter(Mandatory)][int] $Port,
        # Must not be named $Pid: PowerShell variable names are case-insensitive,
        # so it would collide with the read-only automatic $PID and fail binding
        # with "Cannot overwrite variable Pid because it is read-only or constant."
        # The emitted 'pid' property below is the public descriptor contract and
        # stays as is.
        [Parameter(Mandatory)][int] $GatewayProcessId,
        [Parameter(Mandatory)][string] $Capability,
        [Parameter(Mandatory)][int] $ContractVersion
    )

    $path = Get-BthwaniMobileGatewayDescriptorPath
    [pscustomobject]@{
        host = $LanHost
        port = $Port
        pid = $GatewayProcessId
        capability = $Capability
        contractVersion = $ContractVersion
        writtenAtUtc = [DateTime]::UtcNow.ToString("o")
    } | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $path -Encoding utf8
}

function Test-BthwaniMobileDevGateway {
    param(
        [Parameter(Mandatory)][string] $LanHost,
        [Parameter(Mandatory)][int] $Port,
        [Parameter(Mandatory)][int] $ContractVersion
    )

    try {
        $response = Invoke-RestMethod `
            -Uri "http://${LanHost}:${Port}/__bthwani/health" `
            -TimeoutSec 1 `
            -ErrorAction Stop
        if (
            [string] $response.status -ne "healthy" -or
            [string] $response.service -ne "bthwani-mobile-dev-gateway" -or
            [int] $response.contractVersion -ne $ContractVersion -or
            [string] $response.host -ne $LanHost -or
            [int] $response.port -ne $Port
        ) {
            return $null
        }
        return $response
    } catch {
        return $null
    }
}

function Stop-BthwaniStaleMobileDevGateway {
    param(
        [Parameter(Mandatory)] $Listener,
        [Parameter(Mandatory)][int] $Port
    )

    if (-not (Get-Command Get-CimInstance -ErrorAction SilentlyContinue)) {
        throw "Port $Port is occupied and the owning process cannot be verified safely."
    }

    $owner = Get-CimInstance `
        -ClassName Win32_Process `
        -Filter "ProcessId = $($Listener.OwningProcess)" `
        -ErrorAction SilentlyContinue
    $ownerName = if ($owner) { [string] $owner.Name } else { "" }
    $ownerCommandLine = if ($owner) { [string] $owner.CommandLine } else { "" }
    $isGatewayProcess = $owner `
        -and $ownerName -match '^node(?:\.exe)?$' `
        -and $ownerCommandLine -like '*mobile-dev-gateway.mjs*'

    if (-not $isGatewayProcess) {
        throw "Port $Port is occupied by a process that is not the BThwani mobile development gateway."
    }

    Write-Host "Replacing stale BThwani mobile development gateway on port $Port..." -ForegroundColor DarkGray
    Stop-Process -Id $Listener.OwningProcess -Force -ErrorAction Stop
    Remove-Item -LiteralPath (Get-BthwaniMobileGatewayDescriptorPath) -Force -ErrorAction SilentlyContinue

    for ($attempt = 1; $attempt -le 30; $attempt++) {
        if (-not (Get-BthwaniMobileGatewayListener -Port $Port)) {
            return
        }
        Start-Sleep -Milliseconds 100
    }
    throw "Stale mobile development gateway did not release port $Port."
}

function New-BthwaniMobileGatewayCapability {
    $bytes = [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
    return ([BitConverter]::ToString($bytes)).Replace("-", "").ToLowerInvariant()
}

function Ensure-BthwaniMobileDevGateway {
    param(
        [Parameter(Mandatory)][string] $RepoRoot,
        [Parameter(Mandatory)][string] $LanHost,
        [int] $Port = 58110,
        [int] $ContractVersion = 1
    )

    $mutexName = if ($IsWindows) { "Global\BthwaniMobileDevGateway" } else { "BthwaniMobileDevGateway" }
    $mutex = [Threading.Mutex]::new($false, $mutexName)
    $mutexAcquired = $false
    try {
        try {
            $mutexAcquired = $mutex.WaitOne([TimeSpan]::FromSeconds(30))
        } catch [Threading.AbandonedMutexException] {
            $mutexAcquired = $true
        }
        if (-not $mutexAcquired) {
            throw "Timed out waiting for mobile development gateway ownership."
        }

        $health = Test-BthwaniMobileDevGateway -LanHost $LanHost -Port $Port -ContractVersion $ContractVersion
        $descriptor = Read-BthwaniMobileGatewayDescriptor
        if (
            $health -and $descriptor -and
            [string] $descriptor.host -eq $LanHost -and
            [int] $descriptor.port -eq $Port -and
            [int] $descriptor.contractVersion -eq $ContractVersion -and
            [int] $descriptor.pid -eq [int] $health.pid -and
            ([string] $descriptor.capability).Length -ge 32
        ) {
            return [pscustomobject]@{
                State = "ready"
                BaseUrl = "http://${LanHost}:${Port}"
                Capability = [string] $descriptor.capability
                Pid = [int] $health.pid
            }
        }

        $listener = Get-BthwaniMobileGatewayListener -Port $Port
        if ($listener) {
            Stop-BthwaniStaleMobileDevGateway -Listener $listener -Port $Port
        }

        $gatewayScript = Join-Path $RepoRoot "tools/dev/mobile-dev-gateway.mjs"
        if (-not (Test-Path -LiteralPath $gatewayScript -PathType Leaf)) {
            throw "Mobile development gateway not found: $gatewayScript"
        }
        $node = Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $node) { $node = Get-Command node -ErrorAction SilentlyContinue | Select-Object -First 1 }
        if (-not $node) { throw "Node.js was not found; the mobile development gateway cannot start." }

        $runtimeMode = ([string] $env:BTHWANI_RUNTIME_MODE).Trim().ToLowerInvariant()
        $nodeMode = ([string] $env:NODE_ENV).Trim().ToLowerInvariant()
        if ($runtimeMode -in @("production", "prod") -or $nodeMode -in @("production", "prod")) {
            throw "Mobile development gateway is forbidden in production mode."
        }

        $capability = New-BthwaniMobileGatewayCapability
        $env:BTHWANI_MOBILE_DEV_GATEWAY_HOST = $LanHost
        $env:BTHWANI_MOBILE_DEV_GATEWAY_PORT = [string] $Port
        $env:BTHWANI_MOBILE_DEV_GATEWAY_TOKEN = $capability
        $env:BTHWANI_MOBILE_SIGNED_MEDIA_HOST = "localhost:59000"

        $startParameters = @{
            FilePath = $node.Source
            ArgumentList = @($gatewayScript)
            WorkingDirectory = $RepoRoot
            PassThru = $true
        }
        if ($IsWindows) { $startParameters.WindowStyle = "Hidden" }
        $process = Start-Process @startParameters

        for ($attempt = 1; $attempt -le 60; $attempt++) {
            if ($process.HasExited) {
                throw "Mobile development gateway exited during startup with code $($process.ExitCode)."
            }
            $health = Test-BthwaniMobileDevGateway -LanHost $LanHost -Port $Port -ContractVersion $ContractVersion
            if ($health) {
                Write-BthwaniMobileGatewayDescriptor `
                    -LanHost $LanHost `
                    -Port $Port `
                    -GatewayProcessId ([int] $health.pid) `
                    -Capability $capability `
                    -ContractVersion $ContractVersion
                return [pscustomobject]@{
                    State = "started"
                    BaseUrl = "http://${LanHost}:${Port}"
                    Capability = $capability
                    Pid = [int] $health.pid
                }
            }
            Start-Sleep -Milliseconds 100
        }

        throw "Mobile development gateway contract v$ContractVersion did not become healthy on ${LanHost}:$Port."
    } finally {
        if ($mutexAcquired) {
            try { $mutex.ReleaseMutex() } catch { }
        }
        $mutex.Dispose()
    }
}
