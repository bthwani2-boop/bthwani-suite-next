param(
  [string]$ToolName = "",
  [string]$InputText = ""
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$graph = Join-Path $root "graphify-out/graph.json"

if ($ToolName -match "read|search|grep|list") {
  if (Test-Path -LiteralPath $graph -PathType Leaf) {
    Write-Output "Repository policy: inspect the smallest directly relevant files first. Graphify is optional for unresolved cross-file ownership, dependency paths, or architecture."
  } else {
    Write-Output "Repository policy: inspect the smallest directly relevant files first. Graphify output is absent; rebuild only if relationship analysis is justified."
  }
}
