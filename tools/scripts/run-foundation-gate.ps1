Set-Location -LiteralPath "C:\bthwani-suite-next"

$ErrorActionPreference = "Stop"

$Zip = $args -contains "-Zip"
$GuardArgIndex = [Array]::IndexOf($args, "-Guard")
$RequestedGuard = if ($GuardArgIndex -ge 0 -and ($GuardArgIndex + 1) -lt $args.Count) { $args[$GuardArgIndex + 1] } else { $null }

$SessionId = "FOUNDATION-GATE-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$EvidenceRoot = Join-Path (Get-Location) "tools\registry\runs\$SessionId"
New-Item -ItemType Directory -Force -Path $EvidenceRoot | Out-Null

$LogPath = Join-Path $EvidenceRoot "commands.log"
Set-Content -LiteralPath $LogPath -Value "" -Encoding UTF8

function Run-Step {
  param(
    [string]$Name,
    [scriptblock]$Command
  )

  $out = Join-Path $EvidenceRoot "$Name.txt"
  Add-Content -LiteralPath $LogPath -Value "RUN: $Name" -Encoding UTF8

  try {
    & $Command *> $out
    Add-Content -LiteralPath $LogPath -Value "PASS: $Name" -Encoding UTF8
    return $true
  } catch {
    $_ | Out-String | Set-Content -LiteralPath $out -Encoding UTF8
    Add-Content -LiteralPath $LogPath -Value "FAIL: $Name" -Encoding UTF8
    return $false
  }
}

$manifest = Get-Content -LiteralPath "tools\guards\guard-manifest.json" -Raw | ConvertFrom-Json

$foundationGuards = @($manifest.guardSets.foundation)
if ($RequestedGuard) {
  $foundationGuards = @($RequestedGuard)
}

$results = @()

$results += [pscustomobject]@{ step = "node-version"; ok = (Run-Step "node-version" { node --version }) }
$results += [pscustomobject]@{ step = "pnpm-version"; ok = (Run-Step "pnpm-version" { pnpm --version }) }
$results += [pscustomobject]@{ step = "git-diff-check"; ok = (Run-Step "git-diff-check" { git --no-pager diff --check }) }
$results += [pscustomobject]@{ step = "pnpm-typecheck"; ok = (Run-Step "pnpm-typecheck" { pnpm typecheck }) }
$results += [pscustomobject]@{ step = "ui-kit-contracts"; ok = (Run-Step "ui-kit-contracts" { pnpm --dir shared/ui-kit typecheck:contracts }) }

foreach ($guard in $foundationGuards) {
  $guardEntry = $manifest.guards | Where-Object { $_.id -eq $guard } | Select-Object -First 1
  if (-not $guardEntry) {
    throw "Unknown foundation guard: $guard"
  }

  $guardPath = $guardEntry.path
  $stepName = "guard-$guard"
  $results += [pscustomobject]@{ step = $stepName; ok = (Run-Step $stepName { node $guardPath }) }
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
  exit 1
}
