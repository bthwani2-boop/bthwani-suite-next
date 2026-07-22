param(
  [switch]$Full,
  [switch]$Runtime,
  [string]$Guard,
  [string]$Journey = "UNSPECIFIED_JOURNEY"
)

Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = "Stop"

$manifestPath = "tools\guards\guard-manifest.json"
$registryPath = "governance\guards\guard-registry.json"
foreach ($requiredPath in @($manifestPath, $registryPath)) {
  if (-not (Test-Path -LiteralPath $requiredPath)) {
    throw "Required guard configuration is missing: $requiredPath"
  }
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$registry = Get-Content -LiteralPath $registryPath -Raw | ConvertFrom-Json
$registeredJourneyGuards = @($manifest.guardSets.journey)
$journeyGuards = $registeredJourneyGuards
$guardEntries = @{}
foreach ($entry in @($registry.entries)) {
  if ($entry.id) { $guardEntries[[string]$entry.id] = $entry }
}

$journeySpecificGuardIds = @(
  $registry.entries |
    Where-Object { $_.id -match '^jrn-\d{3}-' -and $_.source_file -match '\.(mjs|cjs|js)$' } |
    ForEach-Object { [string]$_.id }
)
$unregisteredJourneyGuards = @($journeySpecificGuardIds | Where-Object { $registeredJourneyGuards -notcontains $_ })
if ($unregisteredJourneyGuards.Count -gt 0) {
  throw "Journey-specific guards are missing from the journey manifest: $($unregisteredJourneyGuards -join ', ')"
}

if ($Guard) {
  if ($registeredJourneyGuards -notcontains $Guard) {
    throw "Requested guard is not registered in the journey set: $Guard"
  }
  $journeyGuards = @($Guard)
}

$results = @()

function Run-Step {
  param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][scriptblock]$Block)
  Write-Host "[ RUN ] $Name" -ForegroundColor Cyan
  $global:LASTEXITCODE = 0
  try {
    & $Block
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "exit $LASTEXITCODE" }
    Write-Host "[ OK  ] $Name" -ForegroundColor Green
    return $true
  }
  catch {
    Write-Host "[ FAIL] $Name — $_" -ForegroundColor Red
    return $false
  }
}

function Test-JourneyGuardSelected {
  param([Parameter(Mandatory)][string]$GuardId)
  if ($Guard) { return $true }
  if ($GuardId -notmatch '^jrn-\d{3}-') { return $true }
  $normalizedJourney = $Journey.Trim().ToLowerInvariant().Replace('_', '-')
  if ($normalizedJourney -notmatch '^jrn-\d{3}$') { return $true }
  return $GuardId.StartsWith("$normalizedJourney-")
}

$results += [pscustomobject]@{ step = "git-diff-check"; ok = (Run-Step "git-diff-check" { git --no-pager diff --check }) }

if ($Full) {
  foreach ($step in @(
    @{ Name = "nx-projects"; Command = { pnpm run nx:projects } },
    @{ Name = "contracts-lint"; Command = { pnpm run contracts:lint } },
    @{ Name = "lint"; Command = { pnpm run lint } },
    @{ Name = "typecheck"; Command = { pnpm run typecheck } },
    @{ Name = "test"; Command = { pnpm run test } },
    @{ Name = "build"; Command = { pnpm run build } }
  )) {
    $results += [pscustomobject]@{ step = $step.Name; ok = (Run-Step $step.Name $step.Command) }
  }
}

foreach ($guardName in $journeyGuards) {
  if (-not (Test-JourneyGuardSelected -GuardId $guardName)) { continue }

  $entry = $guardEntries[$guardName]
  if (-not $entry) { throw "Journey guard is not present in the guard registry: $guardName" }

  $stepName = "guard:$guardName"
  if ($entry.script) {
    $scriptName = [string]$entry.script
    $results += [pscustomobject]@{
      step = $stepName
      ok = Run-Step $stepName { pnpm run $scriptName }
    }
    continue
  }

  $sourceFile = [string]$entry.source_file
  if (-not $sourceFile -or $sourceFile -notmatch '\.(mjs|cjs|js)$') {
    throw "Journey guard has no executable package script or Node source: $guardName"
  }
  $results += [pscustomobject]@{
    step = $stepName
    ok = Run-Step $stepName { node $sourceFile }
  }
}

if ($Runtime) {
  foreach ($step in @(
    @{ Name = "runtime-full-reset"; Command = { pnpm run runtime:full:reset } },
    @{ Name = "runtime-full-smoke"; Command = { pnpm run runtime:full:smoke } },
    @{ Name = "wiremock-financial-smoke"; Command = { pnpm run runtime:wiremock:financial:smoke } }
  )) {
    $results += [pscustomobject]@{ step = $step.Name; ok = (Run-Step $step.Name $step.Command) }
  }
}

$failed = @($results | Where-Object { -not $_.ok })
if ($failed.Count -gt 0) {
  Write-Host ""
  Write-Host "RESULT: FIX_REQUIRED journey=$Journey" -ForegroundColor Red
  Write-Host "Failed steps: $($failed.step -join ', ')" -ForegroundColor Red
  throw "Journey gate failed: $($failed.step -join ', ')"
}

$scope = if ($Runtime) { "runtime" } else { "static" }
$mode = if ($Full) { "full-explicit" } else { "targeted-default" }
Write-Host ""
Write-Host "RESULT: PASS scope=$scope mode=$mode journey=$Journey" -ForegroundColor Green
Write-Host "PASS is scoped evidence only and does not imply CLOSED_WITH_EVIDENCE." -ForegroundColor Yellow
