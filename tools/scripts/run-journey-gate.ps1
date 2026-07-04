Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = "Stop"

$Soft = $args -contains "-Soft"
$Full = $args -contains "-Full"
$GuardArgIndex = [Array]::IndexOf($args, "-Guard")
$RequestedGuard = if ($GuardArgIndex -ge 0 -and ($GuardArgIndex + 1) -lt $args.Count) { $args[$GuardArgIndex + 1] } else { $null }

$JourneyArgIndex = [Array]::IndexOf($args, "-Journey")
$Journey = if ($JourneyArgIndex -ge 0 -and ($JourneyArgIndex + 1) -lt $args.Count) { $args[$JourneyArgIndex + 1] } else { "UNSPECIFIED_JOURNEY" }

. (Join-Path $PSScriptRoot "gate-run-step.ps1")

$manifest = Get-Content -LiteralPath "tools\guards\guard-manifest.json" -Raw | ConvertFrom-Json

$journeyGuards = @($manifest.guardSets.journey)
if ($RequestedGuard) {
  $journeyGuards = @($RequestedGuard)
}

$results = @()

function Run-Step {
  param([string]$Name, [scriptblock]$Block)
  Write-Host "[ RUN ] $Name" -ForegroundColor Cyan
  $global:LASTEXITCODE = 0
  try {
    & $Block
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "exit $LASTEXITCODE" }
    Write-Host "[ OK  ] $Name" -ForegroundColor Green
    return $true
  } catch {
    Write-Host "[ FAIL] $Name — $_" -ForegroundColor Red
    return $false
  }
}

# 1. Base Git Diff Check
$results += [pscustomobject]@{ step = "git-diff-check"; ok = (Run-Step "git-diff-check" { git --no-pager diff --check }) }

# 2. Heavy verification checks only active when -Full parameter is supplied
if ($Full) {
  $results += [pscustomobject]@{ step = "nx-projects"; ok = (Run-Step "nx-projects" { pnpm nx show projects }) }
  $results += [pscustomobject]@{ step = "contracts-lint"; ok = (Run-Step "contracts-lint" { pnpm run contracts:lint }) }
  $results += [pscustomobject]@{ step = "typecheck"; ok = (Run-Step "typecheck" { pnpm run typecheck }) }
  $results += [pscustomobject]@{ step = "test"; ok = (Run-Step "test" { pnpm run test }) }
}

# 3. Policy Guard checks from manifest (dynamically resolved)
foreach ($guard in $journeyGuards) {
  $guardPath = if ($guard -eq "no-broken-imports") { "tools/guards/no-broken-imports.mjs" } else { "tools/guards/$guard-gate.mjs" }
  $stepName = "guard-$guard"
  
  $stepOk = Run-Step $stepName { node $guardPath }
  $results += [pscustomobject]@{ step = $stepName; ok = $stepOk }
}

$failed = @($results | Where-Object { -not $_.ok })
$status = if ($failed.Count -eq 0) { "LOCAL_VERIFIED_AWAITING_REMOTE_EVIDENCE" } else { "FAIL" }

Write-Host ""
Write-Host "RESULT: $status  journey=$Journey" -ForegroundColor $(if ($failed.Count -eq 0) { "Green" } else { "Red" })
if ($failed.Count -gt 0) {
  Write-Host "Failed steps: $($failed.step -join ', ')" -ForegroundColor Red
}

if ($failed.Count -gt 0) {
  if ($Soft) {
    Write-Host "WARNING: Journey gate failed, but exiting with code 0 due to -Soft flag."
    exit 0
  } else {
    exit 1
  }
}
