Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = "Stop"

$GuardArgIndex = [Array]::IndexOf($args, "-Guard")
$RequestedGuard = if ($GuardArgIndex -ge 0 -and ($GuardArgIndex + 1) -lt $args.Count) { $args[$GuardArgIndex + 1] } else { $null }

$SliceArgIndex = [Array]::IndexOf($args, "-Slice")
$Slice = if ($SliceArgIndex -ge 0 -and ($SliceArgIndex + 1) -lt $args.Count) { $args[$SliceArgIndex + 1] } else { "UNSPECIFIED_SLICE" }

. (Join-Path $PSScriptRoot "gate-run-step.ps1")

$manifest = Get-Content -LiteralPath "tools\guards\guard-manifest.json" -Raw | ConvertFrom-Json

$sliceGuards = @($manifest.guardSets.slice)
if ($RequestedGuard) {
  $sliceGuards = @($RequestedGuard)
}

$results = @()

function Run-Step {
  param([string]$Name, [scriptblock]$Block)
  Write-Host "[ RUN ] $Name" -ForegroundColor Cyan
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

$results += [pscustomobject]@{ step = "git-diff-check"; ok = (Run-Step "git-diff-check" { git --no-pager diff --check }) }
$results += [pscustomobject]@{ step = "nx-projects"; ok = (Run-Step "nx-projects" { pnpm nx show projects }) }
$results += [pscustomobject]@{ step = "graphify-code"; ok = (Run-Step "graphify-code" { pnpm run graphify:code }) }
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
$results += [pscustomobject]@{ step = "runtime-smoke"; ok = (Run-Step "runtime-smoke" { pnpm run runtime:smoke }) }
$results += [pscustomobject]@{ step = "no-financial-mutation-outside-wlt"; ok = (Run-Step "no-financial-mutation-outside-wlt" { pnpm run guard:no-financial-mutation-outside-wlt }) }
$results += [pscustomobject]@{ step = "dsh-shared-ownership"; ok = (Run-Step "dsh-shared-ownership" { pnpm run guard:dsh-frontend-shared-ownership }) }
$results += [pscustomobject]@{ step = "wlt-dsh-shared-ownership"; ok = (Run-Step "wlt-dsh-shared-ownership" { pnpm run guard:wlt-dsh-frontend-shared-ownership }) }
$results += [pscustomobject]@{ step = "dsh-001-cross-surface"; ok = (Run-Step "dsh-001-cross-surface" { pnpm run guard:dsh-001-cross-surface-dependency-map }) }

foreach ($guard in $sliceGuards) {
  $guardEntry = $manifest.guards | Where-Object { $_.id -eq $guard } | Select-Object -First 1
  if (-not $guardEntry) {
    throw "Unknown slice guard: $guard"
  }
  $guardPath = $guardEntry.path
  $stepName = "guard-$guard"
  $results += [pscustomobject]@{ step = $stepName; ok = (Run-Step $stepName { node $guardPath }) }
}

$failed = @($results | Where-Object { -not $_.ok })
$status = if ($failed.Count -eq 0) { "LOCAL_VERIFIED_AWAITING_REMOTE_EVIDENCE" } else { "FAIL" }

Write-Host ""
Write-Host "================================" -ForegroundColor White
Write-Host "RESULT: $status  slice=$Slice" -ForegroundColor $(if ($failed.Count -eq 0) { "Green" } else { "Red" })
if ($failed.Count -gt 0) {
  Write-Host "Failed steps: $($failed.step -join ', ')" -ForegroundColor Red
}
Write-Host "================================" -ForegroundColor White

if ($failed.Count -gt 0) {
  exit 1
}
