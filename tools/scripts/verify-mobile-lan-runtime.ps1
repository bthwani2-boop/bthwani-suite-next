[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$LanHelper = Join-Path $RepoRoot "apps/mobile/mobile-lan.ps1"
if (-not (Test-Path -LiteralPath $LanHelper -PathType Leaf)) {
    throw "LAN transport helper not found: $LanHelper"
}

. $LanHelper
Set-Location -LiteralPath $RepoRoot

function Invoke-DirectJsonRequest {
    param(
        [Parameter(Mandatory)][string] $Uri,
        [Parameter(Mandatory)][string] $ExpectedStatus
    )

    $handler = [Net.Http.HttpClientHandler]::new()
    $handler.UseProxy = $false
    $client = [Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(5)
    try {
        $response = $client.GetAsync($Uri).GetAwaiter().GetResult()
        if (-not $response.IsSuccessStatusCode) {
            throw "$Uri returned HTTP $([int]$response.StatusCode)."
        }
        $raw = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        $body = $raw | ConvertFrom-Json -ErrorAction Stop
        if ([string] $body.status -ne $ExpectedStatus) {
            throw "$Uri returned status '$($body.status)', expected '$ExpectedStatus'."
        }
        return $body
    } finally {
        $client.Dispose()
        $handler.Dispose()
    }
}

function Test-TcpReachable {
    param(
        [Parameter(Mandatory)][string] $TargetHost,
        [Parameter(Mandatory)][int] $Port,
        [int] $TimeoutMs = 750
    )

    $client = [Net.Sockets.TcpClient]::new()
    try {
        $task = $client.ConnectAsync($TargetHost, $Port)
        return $task.Wait($TimeoutMs) -and $client.Connected
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

$lan = Resolve-BthwaniMobileLanContext
$gateway = Ensure-BthwaniMobileDevGateway -RepoRoot $RepoRoot -LanHost $lan.Host -Port 58110 -ContractVersion 1
$gatewayBase = [string] $gateway.BaseUrl

Write-Host "LAN host:      $($lan.Host)" -ForegroundColor Cyan
Write-Host "LAN source:    $($lan.Source)"
Write-Host "LAN profile:   $($lan.NetworkCategory)"
Write-Host "Gateway:       $gatewayBase ($($gateway.State))"
Write-Host "ADB:           not used"

$gatewayHealth = Invoke-DirectJsonRequest -Uri "$gatewayBase/__bthwani/health" -ExpectedStatus "healthy"
if ([string] $gatewayHealth.service -ne "bthwani-mobile-dev-gateway") {
    throw "Unexpected gateway service identity: $($gatewayHealth.service)"
}
if ([int] $gatewayHealth.contractVersion -ne 1) {
    throw "Unexpected gateway contract version: $($gatewayHealth.contractVersion)"
}

Invoke-DirectJsonRequest -Uri "$gatewayBase/dsh/health" -ExpectedStatus "healthy" | Out-Null
Invoke-DirectJsonRequest -Uri "$gatewayBase/identity/readiness" -ExpectedStatus "HEALTHY" | Out-Null
Invoke-DirectJsonRequest -Uri "$gatewayBase/workforce/health" -ExpectedStatus "healthy" | Out-Null

# The gateway must be the only LAN-visible development ingress. These services
# are intentionally bound to host loopback in Docker and must stay unreachable
# through the machine's LAN address even while the runtime is healthy.
$forbiddenDirectPorts = @(58080, 58082, 58083, 58086, 59000, 59001)
foreach ($port in $forbiddenDirectPorts) {
    if (Test-TcpReachable -TargetHost $lan.Host -Port $port) {
        throw "Private runtime port $port is reachable directly on LAN host $($lan.Host); only gateway port 58110 may be LAN-visible."
    }
}

if (-not (Test-TcpReachable -TargetHost $lan.Host -Port 58110)) {
    throw "Mobile development gateway is not reachable on LAN host $($lan.Host):58110."
}

Write-Host "mobile-lan-runtime: PASS" -ForegroundColor Green
