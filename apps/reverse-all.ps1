Set-Location -LiteralPath "$PSScriptRoot"

# Resolve adb: prefer PATH, fallback to SDK default location
$AdbCmd     = "adb"
$AdbSdkPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
  if (Test-Path -LiteralPath $AdbSdkPath) { $AdbCmd = $AdbSdkPath }
  else { $AdbCmd = $null }
}

if ($AdbCmd) {
  # All ports for apps and services in the project
  $Ports   = @(
    "tcp:58080", 
    "tcp:58082", 
    "tcp:58083", 
    "tcp:59000", 
    "tcp:18101", 
    "tcp:18102", 
    "tcp:18103", 
    "tcp:18104"
  )
  
  $Devices = & $AdbCmd devices | Select-String -Pattern "^(\S+)\s+device$" | ForEach-Object { $_.Matches[0].Groups[1].Value }
  
  if ($Devices.Count -eq 0) {
    Write-Host "[adb] No connected Android devices or emulators found." -ForegroundColor Yellow
    exit 0
  }

  foreach ($Serial in $Devices) {
    Write-Host "[adb] Applying reverse proxy for device: $Serial" -ForegroundColor Green
    foreach ($Port in $Ports) {
      & $AdbCmd -s $Serial reverse $Port $Port | Out-Null
      Write-Host "  $Port -> $Port"
    }
  }
  Write-Host "[adb] Successfully reversed all project ports on $($Devices.Count) device(s)!" -ForegroundColor Cyan
} else {
  Write-Error "adb was not found in PATH or at default Android SDK location."
  exit 1
}
