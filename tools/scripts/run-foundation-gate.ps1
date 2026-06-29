Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = "Stop"

$Zip = $args -contains "-Zip"
$Soft = $args -contains "-Soft"
$SkipTypecheck = $args -contains "-SkipTypecheck"
$GuardArgIndex = [Array]::IndexOf($args, "-Guard")
$RequestedGuard = if ($GuardArgIndex -ge 0 -and ($GuardArgIndex + 1) -lt $args.Count) { $args[$GuardArgIndex + 1] } else { $null }

$SessionId = "FOUNDATION-GATE-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$EvidenceRoot = Join-Path (Get-Location) "tools\registry\runs\$SessionId"
New-Item -ItemType Directory -Force -Path $EvidenceRoot | Out-Null

$LogPath = Join-Path $EvidenceRoot "commands.log"
Set-Content -LiteralPath $LogPath -Value "" -Encoding UTF8

. (Join-Path $PSScriptRoot "gate-run-step.ps1")

$manifest = Get-Content -LiteralPath "tools\guards\guard-manifest.json" -Raw | ConvertFrom-Json

$foundationGuards = @($manifest.guardSets.foundation)
if ($RequestedGuard) {
  $foundationGuards = @($RequestedGuard)
}

$results = @()

$results += [pscustomobject]@{ step = "node-version"; ok = (Invoke-GateStep "node-version" { node --version } $EvidenceRoot $LogPath) }
$results += [pscustomobject]@{ step = "pnpm-version"; ok = (Invoke-GateStep "pnpm-version" { pnpm --version } $EvidenceRoot $LogPath) }
$results += [pscustomobject]@{ step = "git-diff-check"; ok = (Invoke-GateStep "git-diff-check" { git --no-pager diff --check } $EvidenceRoot $LogPath) }
if (-not $SkipTypecheck) {
  $results += [pscustomobject]@{ step = "pnpm-typecheck"; ok = (Invoke-GateStep "pnpm-typecheck" { pnpm typecheck } $EvidenceRoot $LogPath) }
  $results += [pscustomobject]@{ step = "ui-kit-contracts"; ok = (Invoke-GateStep "ui-kit-contracts" { pnpm --dir shared/ui-kit typecheck:contracts } $EvidenceRoot $LogPath) }
}

foreach ($guard in $foundationGuards) {
  $guardEntry = $manifest.guards | Where-Object { $_.id -eq $guard } | Select-Object -First 1
  if (-not $guardEntry) {
    throw "Unknown foundation guard: $guard"
  }

  $guardPath = $guardEntry.path
  $stepName = "guard-$guard"
  $isWarning = $guardEntry.severity -eq "warning"

  $stepOk = Invoke-GateStep $stepName { node $guardPath } $EvidenceRoot $LogPath
  if (-not $stepOk -and $isWarning) {
    Write-Host "WARNING: Guard $guard failed, but is warning-only." -ForegroundColor Yellow
    $stepOk = $true
  }
  $results += [pscustomobject]@{ step = $stepName; ok = $stepOk }
}

$results | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $EvidenceRoot "evidence.json") -Encoding UTF8
git --no-pager status --short | Set-Content -LiteralPath (Join-Path $EvidenceRoot "git-status.txt") -Encoding UTF8

$failed = @($results | Where-Object { -not $_.ok })

$status = if ($failed.Count -eq 0) { "PASS" } else { "FAIL" }

@"
status: $status
session_id: $SessionId
evidence_root: $EvidenceRoot
zip_created: $Zip
guards_run: $($foundationGuards -join ", ")
"@ | Set-Content -LiteralPath (Join-Path $EvidenceRoot "summary.txt") -Encoding UTF8

if ($Zip) {
  Compress-Archive -Path (Join-Path $EvidenceRoot "*") -DestinationPath (Join-Path $EvidenceRoot "_HANDOFF.zip") -Force
}

Write-Host "RESULT: $status"
Write-Host "Evidence: $EvidenceRoot"
if ($Zip) {
  Write-Host "Handoff:  $(Join-Path $EvidenceRoot "_HANDOFF.zip")"
}

if ($failed.Count -gt 0) {
  if ($Soft) {
    Write-Host "WARNING: Foundation gate failed, but exiting with code 0 due to -Soft flag."
    exit 0
  } else {
    exit 1
  }
}
