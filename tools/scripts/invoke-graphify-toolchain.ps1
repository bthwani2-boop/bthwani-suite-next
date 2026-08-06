[CmdletBinding()]
param(
  [ValidateSet("Verify", "Repair", "Full")]
  [string]$Mode = "Verify"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$StampPath = "graphify-out/.bthwani-source.json"

Push-Location $Root

try {
  $Graphify = Get-Command graphify -ErrorAction Stop
  $Head = (& git rev-parse HEAD).Trim()

  & git check-ignore -q "graphify-out/graph.json"

  if ($LASTEXITCODE -ne 0) {
    throw "graphify-out must be ignored by Git."
  }

  if ($Mode -in @("Repair", "Full")) {
    & $Graphify.Source extract . --code-only --force

    if ($LASTEXITCODE -ne 0) {
      throw "Graphify extraction failed."
    }

    New-Item -ItemType Directory -Path "graphify-out" -Force | Out-Null

    [ordered]@{
      schemaVersion   = 1
      sourceSha       = $Head
      generatedAt     = (Get-Date).ToUniversalTime().ToString("o")
      coverage        = "APPLICATION_CODE_GRAPH"
      graphifyVersion = (& $Graphify.Source --version 2>&1 | Out-String).Trim()
    } |
      ConvertTo-Json -Depth 20 |
      Set-Content -LiteralPath $StampPath -Encoding utf8NoBOM
  }

  if (-not (Test-Path "graphify-out/graph.json" -PathType Leaf)) {
    throw "Graphify output is missing. Run Repair mode when Graphify is needed."
  }

  if (-not (Test-Path $StampPath -PathType Leaf)) {
    throw "Graphify source stamp is missing."
  }

  $Stamp = Get-Content $StampPath -Raw | ConvertFrom-Json

  if ([string]$Stamp.sourceSha -ne $Head) {
    throw "Graphify graph is stale. graph=$($Stamp.sourceSha) head=$Head"
  }

  Write-Output "graph_source_sha=$Head"
  Write-Output "decision=PASS"
}
finally {
  Pop-Location
}
