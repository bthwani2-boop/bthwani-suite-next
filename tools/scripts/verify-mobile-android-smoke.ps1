param(
  [ValidateSet("app-client", "app-partner", "app-captain", "app-field", "all")]
  [string]$App = "all",
  [string]$Serial = "",
  [string]$EvidencePath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location $RepoRoot

$AdbCommand = Get-Command adb.exe -ErrorAction SilentlyContinue
if (-not $AdbCommand) { $AdbCommand = Get-Command adb -ErrorAction Stop }
$Adb = $AdbCommand.Source

$deviceLines = @(& $Adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\sdevice$" })
if ($LASTEXITCODE -ne 0) { throw "adb devices failed with exit code $LASTEXITCODE." }
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
$CanonicalApps = @($Manifest.apps.PSObject.Properties.Name | Sort-Object)
$Apps = if ($App -eq "all") { $CanonicalApps } else { @($App) }
if ($EvidencePath -and $App -ne "all") {
  throw "SHA-bound Android physical launch evidence requires -App all."
}

foreach ($AppKey in $Apps) {
  $Config = $Manifest.apps.$AppKey
  if (-not $Config) { throw "Missing mobile manifest entry for $AppKey." }
  $Package = [string]$Config.androidPackage
  if (-not $Package) { throw "Missing androidPackage for $AppKey." }

  Write-Host "`n=== Android physical launch L0: $AppKey ($Package) ===" -ForegroundColor Cyan
  $packagePath = & $Adb -s $Serial shell pm path $Package 2>&1
  if ($LASTEXITCODE -ne 0 -or -not ($packagePath -match "^package:")) {
    throw "$AppKey is not installed on ADB device $Serial."
  }

  & $Adb -s $Serial shell am force-stop $Package | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not force-stop $AppKey before launch proof." }

  $launchOutput = & $Adb -s $Serial shell monkey -p $Package -c android.intent.category.LAUNCHER 1 2>&1
  if ($LASTEXITCODE -ne 0 -or ($launchOutput -join "`n") -match "No activities found|monkey aborted") {
    throw "$AppKey launcher activity failed to start.`n$($launchOutput -join "`n")"
  }

  Start-Sleep -Seconds 5
  $processId = (& $Adb -s $Serial shell pidof $Package 2>$null).Trim()
  if (-not $processId) { throw "$AppKey process is not alive after launch." }
  $activity = & $Adb -s $Serial shell dumpsys activity activities 2>&1 | Select-String -SimpleMatch $Package | Select-Object -First 1
  if (-not $activity) { throw "$AppKey has no visible/resumed activity evidence after launch." }
  Write-Host "$AppKey physical Android launch L0: PASS pid=$processId" -ForegroundColor Green
}

if ($EvidencePath) {
  $sourceSha = (& git rev-parse HEAD 2>&1 | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $sourceSha -notmatch '^[0-9a-f]{40}$') {
    throw "Cannot bind Android launch evidence to an exact Git SHA: $sourceSha"
  }
  $model = (& $Adb -s $Serial shell getprop ro.product.model 2>$null | Out-String).Trim()
  $absoluteEvidence = if ([IO.Path]::IsPathRooted($EvidencePath)) { $EvidencePath } else { Join-Path $RepoRoot $EvidencePath }
  $parent = Split-Path -Parent $absoluteEvidence
  if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
  [ordered]@{
    schemaVersion = 1
    sourceSha = $sourceSha
    result = "PASS"
    producer = "tools/scripts/verify-mobile-android-smoke.ps1"
    apps = $CanonicalApps
    tiers = @("mobile:android:physical-launch")
    platform = "android"
    physicalDevice = $true
    device = [ordered]@{ serial = $Serial; model = $model }
  } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $absoluteEvidence -Encoding utf8
  Write-Host "Android launch evidence: $absoluteEvidence" -ForegroundColor DarkGray
}

Write-Host "`nmobile:android:physical-launch: PASS device=$Serial (L0 launch only; integration not claimed)" -ForegroundColor Green
