Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$AdbHelper = Join-Path $PSScriptRoot 'mobile-adb.ps1'

. $AdbHelper

$AdbPath = Resolve-BthwaniAdb
Start-BthwaniAdbServer -AdbPath $AdbPath

$Devices = Get-BthwaniAndroidDevices -AdbPath $AdbPath
$SelectedDevice = Select-BthwaniAndroidDevice -Devices $Devices
$SelectedSerial = $SelectedDevice.Serial

$env:ANDROID_SERIAL = $SelectedSerial

$Ports = @(
    18080,
    18082,
    18086,
    18100,
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

Write-Host ''
Write-Host "ADB:    $AdbPath"
Write-Host "Device: $SelectedSerial"
Write-Host "Ports:  $($Ports -join ', ')"
Write-Host ''
Write-Host 'RESULT: ALL REVERSE PORTS APPLIED'
