Set-Location -LiteralPath "$PSScriptRoot"

$env:REACT_NATIVE_PACKAGER_HOSTNAME    = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Get-NetIPInterface | Get-NetIPAddress -AddressFamily IPv4 | Select-Object -First 1).IPAddress
$env:EXPO_PUBLIC_DSH_API_BASE_URL      = "http://127.0.0.1:58080"
$env:NEXT_PUBLIC_DSH_API_BASE_URL      = "http://127.0.0.1:58080"
$env:EXPO_PUBLIC_IDENTITY_API_BASE_URL = "http://127.0.0.1:58082"
$env:NEXT_PUBLIC_IDENTITY_API_BASE_URL = "http://127.0.0.1:58082"
$env:EXPO_PUBLIC_WLT_API_BASE_URL      = "http://127.0.0.1:58083"
$env:NEXT_PUBLIC_WLT_API_BASE_URL      = "http://127.0.0.1:58083"
$env:EXPO_PUBLIC_DEV_STORE_ID          = try { (Invoke-RestMethod "http://127.0.0.1:58080/dsh/stores?limit=1&offset=0" -TimeoutSec 3 -ErrorAction SilentlyContinue).stores[0].id } catch { "store-1005" }

# Resolve adb: prefer PATH, fallback to SDK default location
$AdbCmd     = "adb"
$AdbSdkPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
  if (Test-Path -LiteralPath $AdbSdkPath) { $AdbCmd = $AdbSdkPath }
  else { $AdbCmd = $null }
}
if ($AdbCmd) {
  $Ports   = @("tcp:58080", "tcp:58082", "tcp:58083", "tcp:59000", "tcp:18102")
  $Devices = & $AdbCmd devices | Select-String -Pattern "^(\S+)\s+device$" | ForEach-Object { $_.Matches[0].Groups[1].Value }
  foreach ($Serial in $Devices) {
    foreach ($Port in $Ports) { & $AdbCmd -s $Serial reverse $Port $Port | Out-Null }
  }
  Write-Host "[adb] reverse applied to $($Devices.Count) device(s)"
}

pnpm exec expo start --dev-client --host lan --port 18102 --android --clear
