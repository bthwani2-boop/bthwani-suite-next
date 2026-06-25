<#
================================================================================
📋 الأوامر البرمجية الديناميكية والجاهزة للنسخ واللصق اليدوي (PowerShell Copy-Paste)
================================================================================

هذه الكتل البرمجية تقوم بالانتقال التلقائي لمسار المشروع وتجلب الـ IP الفعلي للإنترنت/الراوتر تلقائياً:

--------------------------------------------------------------------------------
1️⃣ تشغيل تطبيق العميل (app-client)
--------------------------------------------------------------------------------
Set-Location -LiteralPath "C:\bthwani-suite-next"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Get-NetIPInterface | Get-NetIPAddress -AddressFamily IPv4 | Select-Object -First 1).IPAddress
$env:EXPO_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
$env:NEXT_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:58080 tcp:58080
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:59000 tcp:59000
pnpm --dir apps/app-client/runtime exec expo start --dev-client --host lan --port 18101 --android --clear

--------------------------------------------------------------------------------
2️⃣ تشغيل تطبيق الشركاء (app-partner)
--------------------------------------------------------------------------------
Set-Location -LiteralPath "C:\bthwani-suite-next"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Get-NetIPInterface | Get-NetIPAddress -AddressFamily IPv4 | Select-Object -First 1).IPAddress
$env:EXPO_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
$env:NEXT_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
$env:EXPO_PUBLIC_DEV_STORE_ID = try { (Invoke-RestMethod "http://127.0.0.1:58080/dsh/stores?limit=1&offset=0" -TimeoutSec 3 -ErrorAction SilentlyContinue).stores[0].id } catch { "store-1005" }
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:58080 tcp:58080
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:59000 tcp:59000
pnpm --dir apps/app-partner/runtime exec expo start --dev-client --host lan --port 18102 --android --clear

--------------------------------------------------------------------------------
3️⃣ تشغيل تطبيق الكابتن والتوصيل (app-captain)
--------------------------------------------------------------------------------
Set-Location -LiteralPath "C:\bthwani-suite-next"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Get-NetIPInterface | Get-NetIPAddress -AddressFamily IPv4 | Select-Object -First 1).IPAddress
$env:EXPO_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
$env:NEXT_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
$env:EXPO_PUBLIC_DEV_STORE_ID = try { (Invoke-RestMethod "http://127.0.0.1:58080/dsh/stores?limit=1&offset=0" -TimeoutSec 3 -ErrorAction SilentlyContinue).stores[0].id } catch { "store-1005" }
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:58080 tcp:58080
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:59000 tcp:59000
pnpm --dir apps/app-captain/runtime exec expo start --dev-client --host lan --port 18103 --android --clear

--------------------------------------------------------------------------------
4️⃣ تشغيل تطبيق العمليات الميدانية (app-field)
--------------------------------------------------------------------------------
Set-Location -LiteralPath "C:\bthwani-suite-next"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Get-NetIPInterface | Get-NetIPAddress -AddressFamily IPv4 | Select-Object -First 1).IPAddress
$env:EXPO_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
$env:NEXT_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
$env:EXPO_PUBLIC_DEV_STORE_ID = try { (Invoke-RestMethod "http://127.0.0.1:58080/dsh/stores?limit=1&offset=0" -TimeoutSec 3 -ErrorAction SilentlyContinue).stores[0].id } catch { "store-1005" }
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:58080 tcp:58080
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:59000 tcp:59000
pnpm --dir apps/app-field/runtime exec expo start --dev-client --host lan --port 18104 --android --clear

================================================================================
# ⚙️ كود التشغيل التلقائي عند استدعاء السكربت كأمر برمجي
================================================================================
#>

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("client", "partner", "field", "captain")]
  [string]$App,

  [string]$StoreId = "",

  [string]$IP = ""
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath "C:\bthwani-suite-next"

# 1. Dynamic host IP discovery based on Internet default route (avoiding sharing and virtual adapters)
if ([string]::IsNullOrWhiteSpace($IP)) {
  $IP = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Get-NetIPInterface | Get-NetIPAddress -AddressFamily IPv4 | Select-Object -First 1).IPAddress
}

if ([string]::IsNullOrWhiteSpace($IP)) {
  Write-Warning "Could not dynamically resolve local IP address. Defaulting to 192.168.0.101"
  $IP = "192.168.0.101"
}

Write-Host "Resolved Physical IP for Metro: $IP" -ForegroundColor Cyan

# 2. Dynamic Store ID discovery from local DSH API with local fallback
if ([string]::IsNullOrWhiteSpace($StoreId) -and $App -ne "client") {
  $StoreId = try {
    $response = Invoke-RestMethod "http://127.0.0.1:58080/dsh/stores?limit=1&offset=0" -TimeoutSec 3 -ErrorAction SilentlyContinue
    $response.stores[0].id
  } catch {
    Write-Warning "Local DSH API is offline or stores are empty. Defaulting to fallback store-1005"
    "store-1005"
  }
}

# 3. Map app to port
$Port = switch ($App) {
  "client"  { 18101 }
  "partner" { 18102 }
  "captain" { 18103 }
  "field"   { 18104 }
}

# 4. Print the exact command that is being run for copy-paste convenience
Write-Host "`n========================================================" -ForegroundColor Gray
Write-Host "👉 Active dynamic command running for app-$App:" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Gray
Write-Host "Set-Location -LiteralPath 'C:\bthwani-suite-next'" -ForegroundColor White
Write-Host "`$env:REACT_NATIVE_PACKAGER_HOSTNAME = '$IP'" -ForegroundColor White
Write-Host "`$env:EXPO_PUBLIC_DSH_API_BASE_URL = 'http://127.0.0.1:58080'" -ForegroundColor White
Write-Host "`$env:NEXT_PUBLIC_DSH_API_BASE_URL = 'http://127.0.0.1:58080'" -ForegroundColor White
if ($App -ne "client") {
  Write-Host "`$env:EXPO_PUBLIC_DEV_STORE_ID = '$StoreId'" -ForegroundColor White
}
Write-Host "pnpm --dir apps/app-$App/runtime exec expo start --dev-client --host lan --port $Port --android --clear" -ForegroundColor White
Write-Host "========================================================`n" -ForegroundColor Gray

# 5. Apply adb reverse mapping automatically
$AdbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (Test-Path -LiteralPath $AdbPath) {
  Write-Host "Setting up adb reverse mappings..." -ForegroundColor Cyan
  & $AdbPath reverse tcp:58080 tcp:58080
  & $AdbPath reverse tcp:59000 tcp:59000
  & $AdbPath reverse --list
} else {
  Write-Warning "ADB executable not found at $AdbPath. Please ensure adb is running and port mapping is set up manually."
}

# 6. Set Env Variables for the current session
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $IP
$env:EXPO_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
$env:NEXT_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"

if ($App -ne "client") {
  $env:EXPO_PUBLIC_DEV_STORE_ID = $StoreId
}

$AppDir = "apps/app-$App/runtime"
Write-Host "Starting Expo App: app-$App on port $Port..." -ForegroundColor Green

# 7. Launch Expo
pnpm --dir $AppDir exec expo start --dev-client --host lan --port $Port --android --clear
