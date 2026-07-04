Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = "Stop"

$Full          = $args -contains "-Full"
$Soft          = $args -contains "-Soft"
$GuardArgIndex = [Array]::IndexOf($args, "-Guard")
$RequestedGuard = if ($GuardArgIndex -ge 0 -and ($GuardArgIndex + 1) -lt $args.Count) { $args[$GuardArgIndex + 1] } else { $null }

. (Join-Path $PSScriptRoot "gate-run-step.ps1")

$manifest       = Get-Content -LiteralPath "tools\guards\guard-manifest.json" -Raw | ConvertFrom-Json
$foundationGuards = @($manifest.guardSets.foundation)
if ($RequestedGuard) {
  $foundationGuards = @($RequestedGuard)
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

# 1. Git diff whitespace check (always)
$results += [pscustomobject]@{ step = "git-diff-check"; ok = (Run-Step "git-diff-check" { git --no-pager diff --check }) }

# 2. Full verification (typecheck only when -Full is passed explicitly)
if ($Full) {
  $results += [pscustomobject]@{ step = "typecheck"; ok = (Run-Step "typecheck" { pnpm run typecheck }) }
}

# 3. Foundation guards from manifest
foreach ($guard in $foundationGuards) {
  $guardPath = if ($guard -eq "no-broken-imports") { "tools/guards/no-broken-imports.mjs" } else { "tools/guards/$guard-gate.mjs" }
  $stepName  = "guard-$guard"
  $stepOk    = Run-Step $stepName { node $guardPath }
  $results  += [pscustomobject]@{ step = $stepName; ok = $stepOk }
}

$failed = @($results | Where-Object { -not $_.ok })
$status = if ($failed.Count -eq 0) { "PASS" } else { "FAIL" }

Write-Host ""
Write-Host "RESULT: $status" -ForegroundColor $(if ($failed.Count -eq 0) { "Green" } else { "Red" })
if ($failed.Count -gt 0) {
  Write-Host "Failed steps: $($failed.step -join ', ')" -ForegroundColor Red
  if ($Soft) {
    Write-Host "WARNING: Foundation gate failed, but exiting with code 0 due to -Soft flag."
    exit 0
  } else {
    exit 1
  }
}
