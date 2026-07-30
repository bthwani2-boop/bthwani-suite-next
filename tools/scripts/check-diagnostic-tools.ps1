<#
.SYNOPSIS
  Runs all non-destructive diagnostic tool checks for bthwani-suite-next.

.PARAMETER Strict
  If set, fail if Jaeger is not running (default: warn only).
#>

param(
  [switch]$Strict
)

$ErrorActionPreference = "Continue"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../")).Path
$OverallFail = $false

function Section([string]$Title) {
  Write-Host ""
  Write-Host "=== $Title ==="
}

# --- CodeQL ---
Section "CodeQL local"
pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/scripts/check-codeql-local.ps1")
if ($LASTEXITCODE -ne 0) { $OverallFail = $true }

# --- SonarQube config ---
Section "SonarQube config"
pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/scripts/check-sonarqube-config.ps1")
if ($LASTEXITCODE -ne 0) { $OverallFail = $true }

# --- Go AST extractor ---
Section "Go AST extractor"
pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/scripts/check-go-ast-extractor.ps1")
if ($LASTEXITCODE -ne 0) { $OverallFail = $true }

# --- Docker availability ---
Section "Docker"
try {
  docker version --format "Docker Engine: {{.Server.Version}}" 2>&1 | Write-Host
  Write-Host "  DOCKER: PASS"
} catch {
  Write-Host "  DOCKER: FAIL — docker not available: $_"
  $OverallFail = $true
}

try {
  docker compose version 2>&1 | Write-Host
  Write-Host "  DOCKER_COMPOSE: PASS"
} catch {
  Write-Host "  DOCKER_COMPOSE: FAIL — docker compose not available: $_"
  $OverallFail = $true
}

# --- Jaeger ---
Section "Jaeger"
$jaegerUp = $false
try {
  $resp = Invoke-WebRequest "http://localhost:16686" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
  if ($resp.StatusCode -eq 200) {
    Write-Host "  JAEGER: PASS"
    $jaegerUp = $true
  } else {
    Write-Host "  JAEGER: NOT_RUNNING (HTTP $($resp.StatusCode))"
  }
} catch {
  Write-Host "  JAEGER: NOT_RUNNING"
  Write-Host "  To start: pnpm run runtime:observability:up"
}

if (-not $jaegerUp -and $Strict) {
  $OverallFail = $true
}

# --- Summary ---
Write-Host ""
Write-Host "==============================="
if ($OverallFail) {
  Write-Host "DIAGNOSTIC_TOOLS: FAIL — see above for details"
  exit 1
} else {
  Write-Host "DIAGNOSTIC_TOOLS: PASS"
  exit 0
}
