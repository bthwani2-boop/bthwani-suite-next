# Verify graphify tool availability and remind about graph.json usage.
$ErrorActionPreference = "SilentlyContinue"

# 1. Search for graphify in PATH
$graphifyCmd = Get-Command "graphify" -ErrorAction SilentlyContinue

if (-not $graphifyCmd) {
    Write-Warning "graphify command was not found in your PATH."
    Write-Host "Please ensure graphify is installed if relationship analysis is needed."
}

# 2. Check for graph.json
$graphJsonPath = Join-Path (Get-Location) "graphify-out/graph.json"
if (Test-Path $graphJsonPath) {
    Write-Host "INFO: graphify-out/graph.json exists."
    Write-Host "MANDATORY: Use Graphify before broad text search/grep to reduce token waste."
    Write-Host "Run: graphify query `"<question>`" to query relationships."
}
