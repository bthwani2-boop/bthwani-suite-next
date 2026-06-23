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
$results += [pscustomobject]@{ step = "nx-projects"; ok = (Invoke-GateStep "nx-projects" { pnpm nx show projects } $EvidenceRoot $LogPath) }
$results += [pscustomobject]@{ step = "graphify-code"; ok = (Invoke-GateStep "graphify-code" { pnpm run graphify:code } $EvidenceRoot $LogPath) }
$results += [pscustomobject]@{ step = "contracts-lint"; ok = (Invoke-GateStep "contracts-lint" { pnpm run contracts:lint } $EvidenceRoot $LogPath) }
$results += [pscustomobject]@{ step = "contracts-typecheck"; ok = (Invoke-GateStep "contracts-typecheck" { pnpm nx run contracts:typecheck } $EvidenceRoot $LogPath) }
$results += [pscustomobject]@{ step = "dsh-typecheck"; ok = (Invoke-GateStep "dsh-typecheck" { pnpm nx run dsh:typecheck } $EvidenceRoot $LogPath) }
$results += [pscustomobject]@{ step = "dsh-build"; ok = (Invoke-GateStep "dsh-build" { pnpm nx run dsh:build } $EvidenceRoot $LogPath) }
$results += [pscustomobject]@{ step = "dsh-test"; ok = (Invoke-GateStep "dsh-test" { pnpm nx run dsh:test } $EvidenceRoot $LogPath) }
$results += [pscustomobject]@{ step = "dsh-go-test"; ok = (Invoke-GateStep "dsh-go-test" {
  $previousGoCache = $env:GOCACHE
  $env:GOCACHE = Join-Path (Get-Location) ".cache\go-build"
  Push-Location "services/dsh/backend"
  try { go test ./... } finally {
    Pop-Location
    $env:GOCACHE = $previousGoCache
  }
} $EvidenceRoot $LogPath) }
$results += [pscustomobject]@{ step = "runtime-smoke"; ok = (Invoke-GateStep "runtime-smoke" { pnpm run runtime:smoke } $EvidenceRoot $LogPath) }
$results += [pscustomobject]@{ step = "no-financial-mutation-outside-wlt"; ok = (Invoke-GateStep "no-financial-mutation-outside-wlt" { pnpm run guard:no-financial-mutation-outside-wlt } $EvidenceRoot $LogPath) }
$results += [pscustomobject]@{ step = "dsh-shared-ownership"; ok = (Invoke-GateStep "dsh-shared-ownership" { pnpm run guard:dsh-frontend-shared-ownership } $EvidenceRoot $LogPath) }
$results += [pscustomobject]@{ step = "wlt-dsh-shared-ownership"; ok = (Invoke-GateStep "wlt-dsh-shared-ownership" { pnpm run guard:wlt-dsh-frontend-shared-ownership } $EvidenceRoot $LogPath) }
$results += [pscustomobject]@{ step = "dsh-001-cross-surface"; ok = (Invoke-GateStep "dsh-001-cross-surface" { pnpm run guard:dsh-001-cross-surface-dependency-map } $EvidenceRoot $LogPath) }

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
$status = if ($failed.Count -eq 0) { "LOCAL_VERIFIED_AWAITING_REMOTE_EVIDENCE" } else { "FAIL" }

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
