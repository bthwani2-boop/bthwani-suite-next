<#
.SYNOPSIS
  Verifies the repository-side SonarQube Cloud CI configuration.

.DESCRIPTION
  Checks only committed configuration references. It does not read or validate
  GitHub secret/variable values and does not contact SonarQube Cloud.
#>

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../")).Path
$Fail = $false

function Check-File([string]$RelPath, [string]$Label) {
  $full = Join-Path $RepoRoot $RelPath
  if (Test-Path -LiteralPath $full) {
    Write-Host "  [OK] $Label exists: $RelPath"
    return $true
  }

  Write-Host "  [FAIL] $Label missing: $RelPath"
  return $false
}

function Check-Contains([string]$RelPath, [string]$Pattern, [string]$Label) {
  $full = Join-Path $RepoRoot $RelPath
  if (-not (Test-Path -LiteralPath $full)) { return $false }

  $content = Get-Content -LiteralPath $full -Raw
  if ($content -match [regex]::Escape($Pattern)) {
    Write-Host "  [OK] $Label"
    return $true
  }

  Write-Host "  [FAIL] $Label - pattern not found: $Pattern"
  return $false
}

function Check-NotContains([string]$RelPath, [string]$Pattern, [string]$Label) {
  $full = Join-Path $RepoRoot $RelPath
  if (-not (Test-Path -LiteralPath $full)) { return $false }

  $content = Get-Content -LiteralPath $full -Raw
  if ($content -notmatch [regex]::Escape($Pattern)) {
    Write-Host "  [OK] $Label"
    return $true
  }

  Write-Host "  [FAIL] $Label - forbidden pattern found: $Pattern"
  return $false
}

Write-Host "=== SONARQUBE_CLOUD_CONFIG check ==="

if (-not (Check-File "sonar-project.properties" "sonar-project.properties")) { $Fail = $true }
if (-not (Check-File ".github/workflows/sonarqube.yml" "SonarQube Cloud workflow")) { $Fail = $true }

if (-not (Check-Contains ".github/workflows/sonarqube.yml" "SonarSource/sonarqube-scan-action@713881670b6b3676cda39549040e2d88c70d582e" "workflow pins sonarqube-scan-action v8.2.0 by immutable commit")) { $Fail = $true }
if (-not (Check-Contains ".github/workflows/sonarqube.yml" "secrets.SONAR_TOKEN" "workflow references secrets.SONAR_TOKEN")) { $Fail = $true }
if (-not (Check-Contains ".github/workflows/sonarqube.yml" "vars.SONAR_ORGANIZATION" "workflow references vars.SONAR_ORGANIZATION")) { $Fail = $true }
if (-not (Check-Contains ".github/workflows/sonarqube.yml" "vars.SONAR_PROJECT_KEY" "workflow references vars.SONAR_PROJECT_KEY")) { $Fail = $true }
if (-not (Check-Contains ".github/workflows/sonarqube.yml" "-Dsonar.organization=" "workflow supplies SonarQube Cloud organization to scanner")) { $Fail = $true }
if (-not (Check-Contains ".github/workflows/sonarqube.yml" "-Dsonar.projectKey=" "workflow supplies SonarQube Cloud project key to scanner")) { $Fail = $true }

if (-not (Check-NotContains ".github/workflows/sonarqube.yml" "SONAR_HOST_URL" "workflow has no self-hosted SonarQube server URL dependency")) { $Fail = $true }
if (-not (Check-NotContains ".github/workflows/sonarqube.yml" "localhost:9000" "workflow has no local SonarQube endpoint")) { $Fail = $true }

Write-Host ""
if ($Fail) {
  Write-Host "SONARQUBE_CLOUD_CONFIG: FAIL"
  Write-Host ""
  Write-Host "Required cloud setup:"
  Write-Host "  1. Import/bind the public GitHub repository in SonarQube Cloud."
  Write-Host "  2. Use CI-based analysis and disable Automatic Analysis for this project."
  Write-Host "  3. GitHub -> Settings -> Secrets and variables -> Actions:"
  Write-Host "     Secret:   SONAR_TOKEN=<SonarQube Cloud analysis token>"
  Write-Host "     Variable: SONAR_ORGANIZATION=<SonarQube Cloud organization key>"
  Write-Host "     Variable: SONAR_PROJECT_KEY=<SonarQube Cloud project key>"
  exit 1
}

Write-Host "SONARQUBE_CLOUD_CONFIG: PASS"
Write-Host ""
Write-Host "Repository configuration is Cloud-ready."
Write-Host "SONAR_TOKEN, SONAR_ORGANIZATION, and SONAR_PROJECT_KEY values are managed in GitHub and are not validated locally."
exit 0
