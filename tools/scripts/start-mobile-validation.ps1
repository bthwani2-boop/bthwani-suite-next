[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("client", "partner", "captain", "field")]
  [string]$App,

  [ValidateSet("lan", "adb", "auto")]
  [string]$Transport = "lan",

  [string]$Serial = "",
  [string]$LanHost = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location -LiteralPath $RepoRoot

if ($Transport -eq "lan" -and $Serial) {
  throw "-Serial is only valid for adb/auto validation; LAN mode must not depend on an ADB device."
}
if ($Transport -eq "adb" -and -not $Serial) {
  Write-Host "ADB mode: no serial supplied; the canonical ADB selector will require an unambiguous connected device." -ForegroundColor Yellow
}
if ($Transport -ne "lan" -and $LanHost) {
  throw "-LanHost is only valid for LAN validation."
}

$env:BTHWANI_MOBILE_TRANSPORT = $Transport
if ($Serial) {
  $env:BTHWANI_ANDROID_SERIAL = $Serial
}
if ($LanHost) {
  $env:BTHWANI_MOBILE_LAN_HOST = $LanHost
}

Write-Host "=== BThwani mobile validation launcher ===" -ForegroundColor Cyan
Write-Host "App:       $App"
Write-Host "Transport: $Transport"
if ($Serial) { Write-Host "ADB serial: $Serial" }
if ($LanHost) { Write-Host "LAN host:   $LanHost" }

if ($Transport -eq "lan") {
  Write-Host "ADB is not part of the selected runtime path. Keep this terminal open while validating Quick Login, media, journeys, and Fast Refresh on the physical device." -ForegroundColor Yellow
} elseif ($Transport -eq "adb") {
  Write-Host "ADB fallback is explicitly selected. Keep this terminal open while validating reverse mappings, Quick Login, media, journeys, and Fast Refresh." -ForegroundColor Yellow
} else {
  Write-Host "AUTO transport is selected; the runtime must prefer LAN and fall back to ADB only when LAN cannot be established." -ForegroundColor Yellow
}

& pnpm $App
$exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
if ($exitCode -ne 0) {
  throw "pnpm $App failed in $Transport mode with exit code $exitCode."
}
