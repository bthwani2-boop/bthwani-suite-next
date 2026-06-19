Set-Location -LiteralPath "C:\bthwani-suite-next"

$ErrorActionPreference = "Stop"

$Zip = $args -contains "-Zip"
$GuardArgIndex = [Array]::IndexOf($args, "-Guard")
$RequestedGuard = if ($GuardArgIndex -ge 0 -and ($GuardArgIndex + 1) -lt $args.Count) { $args[$GuardArgIndex + 1] } else { $null }

$SliceArgIndex = [Array]::IndexOf($args, "-Slice")
$Slice = if ($SliceArgIndex -ge 0 -and ($SliceArgIndex + 1) -lt $args.Count) { $args[$SliceArgIndex + 1] } else { "UNSPECIFIED_SLICE" }

$SessionId = "SLICE-GATE-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$EvidenceRoot = Join-Path (Get-Location) "tools\registry\runs\$SessionId"
New-Item -ItemType Directory -Force -Path $EvidenceRoot | Out-Null

$LogPath = Join-Path $EvidenceRoot "commands.log"
Set-Content -LiteralPath $LogPath -Value "" -Encoding UTF8

. (Join-Path $PSScriptRoot "gate-run-step.ps1")

$manifest = Get-Content -LiteralPath "tools\guards\guard-manifest.json" -Raw | ConvertFrom-Json

$sliceGuards = @($manifest.guardSets.slice)
if ($RequestedGuard) {
  $sliceGuards = @($RequestedGuard)
}

$results = @()

$results += [pscustomobject]@{ step = "git-diff-check"; ok = (Invoke-GateStep "git-diff-check" { git --no-pager diff --check } $EvidenceRoot $LogPath) }
$results += [pscustomobject]@{ step = "pnpm-typecheck"; ok = (Invoke-GateStep "pnpm-typecheck" { pnpm typecheck } $EvidenceRoot $LogPath) }

foreach ($guard in $sliceGuards) {
  $guardEntry = $manifest.guards | Where-Object { $_.id -eq $guard } | Select-Object -First 1
  if (-not $guardEntry) {
    throw "Unknown slice guard: $guard"
  }

  $guardPath = $guardEntry.path
  $stepName = "guard-$guard"
  $results += [pscustomobject]@{ step = $stepName; ok = (Invoke-GateStep $stepName { node $guardPath } $EvidenceRoot $LogPath) }
}

$results | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $EvidenceRoot "evidence.json") -Encoding UTF8
git --no-pager status --short | Set-Content -LiteralPath (Join-Path $EvidenceRoot "git-status.txt") -Encoding UTF8

$failed = @($results | Where-Object { -not $_.ok })
$status = if ($failed.Count -eq 0) { "PASS" } else { "FAIL" }

@"
status: $status
slice: $Slice
session_id: $SessionId
evidence_root: $EvidenceRoot
zip_created: $Zip
guards_run: $($sliceGuards -join ", ")
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
  exit 1
}
