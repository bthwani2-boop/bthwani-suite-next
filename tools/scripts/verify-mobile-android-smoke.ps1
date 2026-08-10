param(
  [ValidateSet("app-client", "app-partner", "app-captain", "app-field", "all")]
  [string]$App = "all",
  [string]$Serial = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location $RepoRoot

$AdbCommand = Get-Command adb.exe -ErrorAction SilentlyContinue
if (-not $AdbCommand) {
  $AdbCommand = Get-Command adb -ErrorAction Stop
}
$Adb = $AdbCommand.Source

$deviceLines = & $Adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\sdevice$" }
if ($Serial) {
  if (-not ($deviceLines | Where-Object { $_ -match "^$([regex]::Escape($Serial))\s+device$" })) {
    throw "ADB device '$Serial' is not connected in device state."
  }
} else {
  if ($deviceLines.Count -ne 1) {
    throw "Expected exactly one ADB device. Found $($deviceLines.Count). Pass -Serial when multiple devices are connected."
  }
  $Serial = ($deviceLines[0] -split "\s+")[0]
}

$Manifest = Get-Content "tools/mobile/mobile-apps.manifest.json" -Raw | ConvertFrom-Json
$Apps = if ($App -eq "all") {
  @("app-client", "app-partner", "app-captain", "app-field")
} else {
  @($App)
}

foreach ($AppKey in $Apps) {
  $Config = $Manifest.apps.$AppKey
  if (-not $Config) {
    throw "Missing mobile manifest entry for $AppKey."
  }
  $Package = [string]$Config.androidPackage
  if (-not $Package) {
    throw "Missing androidPackage for $AppKey."
  }

  Write-Host "`n=== Android smoke: $AppKey ($Package) ===" -ForegroundColor Cyan

  $packagePath = & $Adb -s $Serial shell pm path $Package 2>&1
  if ($LASTEXITCODE -ne 0 -or -not ($packagePath -match "^package:")) {
    throw "$AppKey is not installed on ADB device $Serial."
  }

  & $Adb -s $Serial shell am force-stop $Package | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Could not force-stop $AppKey before smoke launch."
  }

  $launchOutput = & $Adb -s $Serial shell monkey -p $Package -c android.intent.category.LAUNCHER 1 2>&1
  if ($LASTEXITCODE -ne 0 -or ($launchOutput -join "`n") -match "No activities found|monkey aborted") {
    throw "$AppKey launcher activity failed to start.`n$($launchOutput -join "`n")"
  }

  Start-Sleep -Seconds 5
  $pid = (& $Adb -s $Serial shell pidof $Package 2>$null).Trim()
  if (-not $pid) {
    throw "$AppKey process is not alive after launch."
  }

  $activity = & $Adb -s $Serial shell dumpsys activity activities 2>&1 | Select-String -SimpleMatch $Package | Select-Object -First 1
  if (-not $activity) {
    throw "$AppKey has no visible/resumed activity evidence after launch."
  }

  Write-Host "$AppKey Android launch smoke: PASS pid=$pid" -ForegroundColor Green
}

Write-Host "`nmobile-android-smoke: PASS device=$Serial" -ForegroundColor Green
