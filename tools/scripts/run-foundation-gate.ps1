param(
  [switch]$Full,
  [string]$Guard,
  [switch]$Affected,
  [string[]]$ChangedPath
)

Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = "Stop"

$manifestPath = "governance\guards\guard-sets.json"
if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw "Guard set contract is missing: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$registeredFoundationGuards = @($manifest.guardSets.foundation)
$registeredFoundationSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($guardName in $registeredFoundationGuards) { [void]$registeredFoundationSet.Add([string]$guardName) }

function Normalize-Paths {
  param([string[]]$Paths)
  return @($Paths | ForEach-Object { ([string]$_).Trim().Replace('\', '/') } | Where-Object { $_ } | Select-Object -Unique)
}

function Resolve-AffectedFoundationGuards {
  param([string[]]$Paths)
  $normalized = Normalize-Paths $Paths
  if ($normalized.Count -eq 0) { throw "Affected foundation routing requires at least one changed path." }

  $rootChanged = $normalized | Where-Object {
    $_ -eq "package.json" -or $_ -eq "pnpm-lock.yaml" -or $_ -eq "pnpm-workspace.yaml" -or $_ -eq "nx.json" -or
    $_ -eq "AGENTS.md" -or $_ -like ".github/*" -or $_ -like "governance/*" -or $_ -like "tools/guards/*" -or
    $_ -like "tools/scripts/run-foundation-gate.ps1"
  }
  if ($rootChanged) { return @($registeredFoundationGuards) }

  $contractChanged = $normalized | Where-Object {
    $_ -like "contracts/*" -or $_ -like "*/contracts/*" -or $_ -like "*/clients/generated/*" -or $_ -like "*.openapi.yaml" -or
    $_ -like "services/*/backend/*" -or $_ -like "core/*/backend/*"
  }
  if ($contractChanged) {
    return @("required-command-integrity", "no-broken-imports", "runtime-config", "api-binding", "backend-api-binding")
  }

  $frontendChanged = $normalized | Where-Object { $_ -like "apps/*" -or $_ -like "shared/*" -or $_ -like "*/frontend/*" }
  if ($frontendChanged) {
    return @("required-command-integrity", "no-broken-imports", "runtime-config", "ui-kit-boundary")
  }

  return @("required-command-integrity", "no-broken-imports")
}

if (-not $Full -and -not $Affected -and [string]::IsNullOrWhiteSpace($Guard)) { $Affected = $true }

if (-not [string]::IsNullOrWhiteSpace($Guard)) {
  $requestedGuards = @($Guard -split ',' | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ } | Select-Object -Unique)
  foreach ($guardName in $requestedGuards) {
    if (-not $registeredFoundationSet.Contains($guardName)) {
      throw "Requested guard is not registered in the foundation set: $guardName"
    }
  }
  $foundationGuards = $requestedGuards
} elseif ($Full) {
  $foundationGuards = @($registeredFoundationGuards)
} elseif ($Affected) {
  $paths = Normalize-Paths $ChangedPath
  if ($paths.Count -eq 0) {
    $paths = Normalize-Paths @(git diff --name-only HEAD --)
  }
  if ($paths.Count -eq 0) {
    $paths = Normalize-Paths @(git diff --name-only HEAD^ HEAD --)
  }
  $foundationGuards = Resolve-AffectedFoundationGuards $paths
}

function Invoke-Step {
  param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][scriptblock]$Block)
  Write-Host "[ RUN ] $Name" -ForegroundColor Cyan
  $global:LASTEXITCODE = 0
  try {
    & $Block
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "exit $LASTEXITCODE" }
    Write-Host "[ OK  ] $Name" -ForegroundColor Green
  }
  catch {
    Write-Host "[ FAIL] $Name — $_" -ForegroundColor Red
    throw
  }
}

Invoke-Step "source-integrity-tests" { node --test tools/guards/source-integrity-gate.test.mjs }
Invoke-Step "source-integrity" { node tools/guards/source-integrity-gate.mjs }
Invoke-Step "git-diff-check" { git --no-pager diff --check }

if ($Full) {
  Invoke-Step "typecheck" { pnpm run typecheck }
}

foreach ($guardName in $foundationGuards) {
  $scriptName = "guard:$guardName"
  Invoke-Step $scriptName { pnpm run $scriptName }
}

$mode = if ($Full) { "full-explicit" } elseif ($Guard) { "guard-selector" } else { "affected" }
Write-Host ""
Write-Host 'RESULT: PASS scope=static mode=' $mode -ForegroundColor Green
Write-Host 'PASS is scoped evidence only and does not imply CLOSED_WITH_EVIDENCE.' -ForegroundColor Yellow
