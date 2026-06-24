Set-Location -LiteralPath "$PSScriptRoot"

$env:REACT_NATIVE_PACKAGER_HOSTNAME = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Get-NetIPInterface | Get-NetIPAddress -AddressFamily IPv4 | Select-Object -First 1).IPAddress
$env:EXPO_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
$env:NEXT_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"

$AdbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (Test-Path -LiteralPath $AdbPath) {
  & $AdbPath reverse tcp:58080 tcp:58080
  & $AdbPath reverse tcp:59000 tcp:59000
}

pnpm exec expo start --dev-client --host lan --port 18101 --android --clear
