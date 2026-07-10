Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$AdbHelper = Join-Path $RepoRoot "tools\scripts\mobile-adb.ps1"

. $AdbHelper

$AdbPath = Resolve-BthwaniAdb

& $AdbPath start-server

if ($LASTEXITCODE -ne 0) {
    throw "ADB server failed to start."
}

$Devices = Get-BthwaniAndroidDevices -AdbPath $AdbPath
$SelectedDevice = Select-BthwaniAndroidDevice -Devices $Devices
$SelectedSerial = $SelectedDevice.Serial

$env:ANDROID_SERIAL = $SelectedSerial

$Ports = @(
    58080,
    58082,
    58083,
    59000,
    18101,
    18102,
    18103,
    18104
)

Invoke-BthwaniAdbReverse `
    -AdbPath $AdbPath `
    -Serial $SelectedSerial `
    -Ports $Ports

Write-Host ""
Write-Host "ADB:    $AdbPath"
Write-Host "Device: $SelectedSerial"
Write-Host "Ports:  $($Ports -join ', ')"
Write-Host ""
Write-Host "RESULT: ALL REVERSE PORTS APPLIED"
