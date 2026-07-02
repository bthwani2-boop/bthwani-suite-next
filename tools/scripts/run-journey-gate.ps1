Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = "Stop"

$Soft = $args -contains "-Soft"
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
  try {
    & $Block | Out-Host
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "exit $LASTEXITCODE" }
    Write-Host "[ OK  ] $Name" -ForegroundColor Green
    return $true
  } catch {
    Write-Host "[ FAIL] $Name — $_" -ForegroundColor Red
    return $false
  }
}

$results += [pscustomobject]@{ step = "git-diff-check"; ok = (Run-Step "git-diff-check" { git --no-pager diff --check }) }
$results += [pscustomobject]@{ step = "nx-projects"; ok = (Run-Step "nx-projects" { pnpm nx show projects }) }
$results += [pscustomobject]@{ step = "graphify-code"; ok = (Run-Step "graphify-code" {
  if (Get-Command graphify -ErrorAction SilentlyContinue) {
    pnpm run graphify:code
  } else {
    Write-Host "WARNING: graphify command not found. Skipping graphify:code check." -ForegroundColor Yellow
    $true
  }
}) }
$results += [pscustomobject]@{ step = "contracts-lint"; ok = (Run-Step "contracts-lint" { pnpm run contracts:lint }) }
$results += [pscustomobject]@{ step = "contracts-typecheck"; ok = (Run-Step "contracts-typecheck" { pnpm nx run contracts:typecheck }) }
$results += [pscustomobject]@{ step = "dsh-typecheck"; ok = (Run-Step "dsh-typecheck" { pnpm nx run dsh:typecheck }) }
$results += [pscustomobject]@{ step = "dsh-build"; ok = (Run-Step "dsh-build" { pnpm nx run dsh:build }) }
$results += [pscustomobject]@{ step = "dsh-test"; ok = (Run-Step "dsh-test" { pnpm nx run dsh:test }) }
$results += [pscustomobject]@{ step = "dsh-go-test"; ok = (Run-Step "dsh-go-test" {
  $previousGoCache = $env:GOCACHE
  $env:GOCACHE = Join-Path (Get-Location) ".cache\go-build"
  Push-Location "services/dsh/backend"
  try { go test ./... } finally {
    Pop-Location
    $env:GOCACHE = $previousGoCache
  }
}) }
$results += [pscustomobject]@{ step = "runtime-smoke"; ok = (Run-Step "runtime-smoke" {
  if ($env:GITHUB_ACTIONS -eq "true") {
    Write-Host "Running in GitHub Actions CI: skipping docker runtime-smoke in journey:gate (run by dedicated job instead)." -ForegroundColor Yellow
    $true
  } else {
    pnpm run runtime:smoke
  }
}) }
$results += [pscustomobject]@{ step = "no-financial-mutation-outside-wlt"; ok = (Run-Step "no-financial-mutation-outside-wlt" { pnpm run guard:no-financial-mutation-outside-wlt }) }
$results += [pscustomobject]@{ step = "dsh-shared-ownership"; ok = (Run-Step "dsh-shared-ownership" { pnpm run guard:dsh-frontend-shared-ownership }) }
$results += [pscustomobject]@{ step = "wlt-dsh-shared-ownership"; ok = (Run-Step "wlt-dsh-shared-ownership" { pnpm run guard:wlt-dsh-frontend-shared-ownership }) }
$results += [pscustomobject]@{ step = "dsh-001-cross-surface"; ok = (Run-Step "dsh-001-cross-surface" { pnpm run guard:dsh-platform-geo-provider-governance }) }

foreach ($guard in $journeyGuards) {
  $guardEntry = $manifest.guards | Where-Object { $_.id -eq $guard } | Select-Object -First 1
  if (-not $guardEntry) {
    throw "Unknown journey guard: $guard"
  }
  $guardPath = $guardEntry.path
  $stepName = "guard-$guard"
  $isWarning = $guardEntry.severity -eq "warning"

  $stepOk = Run-Step $stepName { node $guardPath }
  if (-not $stepOk -and $isWarning) {
    Write-Host "WARNING: Guard $guard failed, but is warning-only." -ForegroundColor Yellow
    $stepOk = $true
  }
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
