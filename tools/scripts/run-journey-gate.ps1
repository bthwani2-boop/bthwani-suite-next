param(
  [switch]$Full,
  [switch]$Runtime,
  [Parameter(Mandatory)][string]$Journey
)

Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = "Stop"

$profilesPath = "tools\verification\journey-profiles.json"
if (-not (Test-Path -LiteralPath $profilesPath)) {
  throw "Journey verification profiles are missing: $profilesPath"
}

$profiles = (Get-Content -LiteralPath $profilesPath -Raw | ConvertFrom-Json).journeyProfiles
$journeys = @($Journey -split ',' | ForEach-Object { [string]$_.Trim().ToUpperInvariant() } | Where-Object { $_ } | Select-Object -Unique)
$guards = [System.Collections.Generic.List[string]]::new()

foreach ($journeyId in $journeys) {
  $property = $profiles.psobject.Properties[$journeyId]
  if ($null -eq $property) {
    throw "Unknown journey profile '$journeyId'. Available: $(@($profiles.psobject.Properties.Name) -join ', ')"
  }
  foreach ($guardName in @($property.Value)) {
    if (-not $guards.Contains([string]$guardName)) { $guards.Add([string]$guardName) }
  }
}

function Invoke-Step {
  param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][scriptblock]$Block)
  Write-Host "[ RUN ] $Name"
  $global:LASTEXITCODE = 0
  & $Block
  if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "$Name failed with exit $LASTEXITCODE" }
  Write-Host "[ OK  ] $Name"
}

if ($Full) { Invoke-Step "workspace-verification" { pnpm run workspace:verify } }
foreach ($guardName in @($guards)) {
  Invoke-Step "guard:$guardName" { pnpm run "guard:$guardName" }
}

if ($Runtime) {
  Invoke-Step "runtime-full-bootstrap" { pnpm run runtime:full:bootstrap-dev }
  try {
    Invoke-Step "runtime-full-smoke" { pnpm run runtime:full:smoke }
    Invoke-Step "wiremock-financial-smoke" { pnpm run runtime:wiremock:financial:smoke }
  } finally {
    Invoke-Step "runtime-full-down" { pnpm run runtime:full:down }
  }
}

Write-Output "RESULT: PASS journeys=$($journeys -join ',') runtime=$Runtime full=$Full"
