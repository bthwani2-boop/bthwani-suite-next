<#
.SYNOPSIS
  Verifies that SonarQube configuration files are present and correctly referencing
  the required secret/variable names. Does NOT validate secret values locally.
#>

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../")).Path
$Fail = $false

function Check-File([string]$RelPath, [string]$Label) {
  $full = Join-Path $RepoRoot $RelPath
  if (Test-Path -LiteralPath $full) {
    Write-Host "  [OK] $Label exists: $RelPath"
    return $true
  } else {
    Write-Host "  [FAIL] $Label missing: $RelPath"
    return $false
  }
}

function Check-Contains([string]$RelPath, [string]$Pattern, [string]$Label) {
  $full = Join-Path $RepoRoot $RelPath
  if (-not (Test-Path -LiteralPath $full)) { return $false }
  $content = Get-Content -LiteralPath $full -Raw
  if ($content -match [regex]::Escape($Pattern)) {
    Write-Host "  [OK] $Label"
    return $true
  } else {
    Write-Host "  [FAIL] $Label — pattern not found: $Pattern"
    return $false
  }
}

Write-Host "=== SONARQUBE_CONFIG check ==="

if (-not (Check-File "sonar-project.properties" "sonar-project.properties")) { $Fail = $true }
if (-not (Check-File ".github/workflows/sonarqube.yml" "sonarqube.yml workflow")) { $Fail = $true }
if (-not (Check-Contains ".github/workflows/sonarqube.yml" "SonarSource/sonarqube-scan-action" "workflow uses sonarqube-scan-action")) { $Fail = $true }
if (-not (Check-Contains ".github/workflows/sonarqube.yml" "secrets.SONAR_TOKEN" "workflow references secrets.SONAR_TOKEN")) { $Fail = $true }
if (-not (Check-Contains ".github/workflows/sonarqube.yml" "vars.SONAR_HOST_URL" "workflow references vars.SONAR_HOST_URL")) { $Fail = $true }

Write-Host ""
if ($Fail) {
  Write-Host "SONARQUBE_CONFIG: FAIL"
  Write-Host ""
  Write-Host "Next steps:"
  Write-Host "  1. Ensure sonar-project.properties and .github/workflows/sonarqube.yml are committed."
  Write-Host "  2. In GitHub repo settings -> Secrets and variables -> Actions:"
  Write-Host "     Secrets: SONAR_TOKEN=<your token>"
  Write-Host "     Variables: SONAR_HOST_URL=<your SonarQube server URL or https://sonarcloud.io>"
  exit 1
} else {
  Write-Host "SONARQUBE_CONFIG: PASS"
  Write-Host ""
  Write-Host "Note: SONAR_TOKEN and SONAR_HOST_URL are GitHub-level secrets/variables."
  Write-Host "      They are NOT validated locally. Configure them in:"
  Write-Host "      GitHub -> Settings -> Secrets and variables -> Actions"
  exit 0
}
