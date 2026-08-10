[CmdletBinding()]
param(
  [string]$ExpectedBranch = "BB",
  [string]$Serial = "",
  [string[]]$EvidenceReceipt = @(),
  [switch]$SkipFetch,
  [switch]$KeepRuntime
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location -LiteralPath $RepoRoot

function Invoke-External {
  param([Parameter(Mandatory = $true)][string]$Name, [Parameter(Mandatory = $true)][scriptblock]$Action)
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  $global:LASTEXITCODE = 0
  & $Action
  $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
  if ($exitCode -ne 0) { throw "$Name failed with exit code $exitCode" }
}

function Get-GitValue {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)
  $value = (& git @Arguments 2>&1 | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') failed: $value" }
  return $value
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "git is required for final closure verification." }
if (-not $SkipFetch) { Invoke-External "Refresh origin refs" { git fetch origin --prune } }

$currentBranch = Get-GitValue -Arguments @("branch", "--show-current")
if ($currentBranch -ne $ExpectedBranch) { throw "Expected branch '$ExpectedBranch' but current branch is '$currentBranch'." }
$dirty = Get-GitValue -Arguments @("status", "--porcelain")
if ($dirty) { throw "Working tree is not clean. Commit, stash, or remove local changes before final closure verification.`n$dirty" }

$headBefore = Get-GitValue -Arguments @("rev-parse", "HEAD")
$remoteRef = "origin/$ExpectedBranch"
$remoteBefore = Get-GitValue -Arguments @("rev-parse", $remoteRef)
if ($headBefore -ne $remoteBefore) {
  throw "Local $ExpectedBranch is not pinned to $remoteRef. local=$headBefore remote=$remoteBefore. Run git pull --ff-only origin $ExpectedBranch first."
}

$Manifest = Get-Content "tools/mobile/mobile-apps.manifest.json" -Raw | ConvertFrom-Json
$CanonicalApps = @($Manifest.apps.PSObject.Properties.Name | Sort-Object)
if ($CanonicalApps.Count -ne 4) { throw "Final mobile closure requires the canonical four-app inventory." }
$EvidenceRoot = Join-Path ([IO.Path]::GetTempPath()) "bthwani-mobile-evidence-$headBefore"
Remove-Item -LiteralPath $EvidenceRoot -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $EvidenceRoot -Force | Out-Null
$SharedReceipt = Join-Path $EvidenceRoot "shared-integration.json"
$AndroidLaunchReceipt = Join-Path $EvidenceRoot "android-physical-launch.json"

Write-Host "Pinned candidate: $headBefore" -ForegroundColor Green
Write-Host "Evidence staging: $EvidenceRoot" -ForegroundColor DarkGray

$verificationPassed = $false
try {
  Invoke-External "Full shared mobile/control automated closure" {
    & pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/verify-mobile-test-stack.ps1 -Full
  }

  [ordered]@{
    schemaVersion = 1
    sourceSha = $headBefore
    result = "PASS"
    producer = "tools/scripts/verify-mobile-final-closure.ps1"
    apps = $CanonicalApps
    tiers = @("mobile:shared:integration")
    platform = "shared"
    physicalDevice = $false
  } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $SharedReceipt -Encoding utf8

  Invoke-External "Physical Android launch L0 for all four apps" {
    if ($Serial) {
      & pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/verify-mobile-android-smoke.ps1 -App all -Serial $Serial -EvidencePath $AndroidLaunchReceipt
    } else {
      & pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/verify-mobile-android-smoke.ps1 -App all -EvidencePath $AndroidLaunchReceipt
    }
  }

  $allReceipts = @($SharedReceipt, $AndroidLaunchReceipt)
  foreach ($receipt in $EvidenceReceipt) {
    if ([string]::IsNullOrWhiteSpace($receipt)) { continue }
    $resolved = (Resolve-Path -LiteralPath $receipt -ErrorAction Stop).Path
    $allReceipts += $resolved
  }

  Invoke-External "Exact-SHA Android+iOS evidence closure" {
    $arguments = @("tools/scripts/verify-mobile-evidence-receipts.mjs", "--sha", $headBefore)
    foreach ($receipt in $allReceipts) { $arguments += @("--receipt", $receipt) }
    & node @arguments
  }

  if (-not $SkipFetch) { Invoke-External "Re-resolve origin after verification" { git fetch origin --prune } }
  $headAfter = Get-GitValue -Arguments @("rev-parse", "HEAD")
  $remoteAfter = Get-GitValue -Arguments @("rev-parse", $remoteRef)
  if ($headAfter -ne $headBefore) { throw "Local HEAD moved during verification. before=$headBefore after=$headAfter" }
  if ($remoteAfter -ne $remoteBefore) { throw "Remote branch moved during verification. before=$remoteBefore after=$remoteAfter. Reconcile and rerun the full closure." }
  if ($headAfter -ne $remoteAfter) { throw "Final candidate no longer matches $remoteRef. local=$headAfter remote=$remoteAfter" }

  $verificationPassed = $true
  Write-Host "`nmobile-final-closure: PASS sha=$headAfter evidence=$($allReceipts -join ',')" -ForegroundColor Green
}
finally {
  if (-not $KeepRuntime) {
    Write-Host "`n=== Stop governed runtime ===" -ForegroundColor Cyan
    pnpm run runtime:full:down
    if ($LASTEXITCODE -ne 0 -and $verificationPassed) {
      throw "Final verification passed but runtime cleanup failed with exit code $LASTEXITCODE."
    }
  }
}
