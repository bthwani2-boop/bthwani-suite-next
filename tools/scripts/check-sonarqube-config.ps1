<#
.SYNOPSIS
  Verifies the repository-side SonarQube Cloud CI configuration.

.DESCRIPTION
  Checks committed configuration only. It does not read the SONAR_TOKEN value
  and does not contact SonarQube Cloud.
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

if (-not (Check-Contains "sonar-project.properties" "sonar.organization=bthwani2-boop" "organization key is pinned")) { $Fail = $true }
if (-not (Check-Contains "sonar-project.properties" "sonar.projectKey=bthwani2-boop_bthwani-suite-next" "project key is pinned")) { $Fail = $true }
if (-not (Check-Contains ".github/workflows/sonarqube.yml" "SonarSource/sonarqube-scan-action@713881670b6b3676cda39549040e2d88c70d582e" "workflow pins sonarqube-scan-action v8.2.0 by immutable commit")) { $Fail = $true }
if (-not (Check-Contains ".github/workflows/sonarqube.yml" "secrets.SONAR_TOKEN" "workflow references secrets.SONAR_TOKEN")) { $Fail = $true }

if (-not (Check-NotContains ".github/workflows/sonarqube.yml" "SONAR_HOST_URL" "workflow has no self-hosted SonarQube server URL dependency")) { $Fail = $true }
if (-not (Check-NotContains ".github/workflows/sonarqube.yml" "localhost:9000" "workflow has no local SonarQube endpoint")) { $Fail = $true }
if (-not (Check-NotContains ".github/workflows/sonarqube.yml" "vars.SONAR_ORGANIZATION" "workflow no longer requires SONAR_ORGANIZATION repository variable")) { $Fail = $true }
if (-not (Check-NotContains ".github/workflows/sonarqube.yml" "vars.SONAR_PROJECT_KEY" "workflow no longer requires SONAR_PROJECT_KEY repository variable")) { $Fail = $true }

Write-Host ""
if ($Fail) {
  Write-Host "SONARQUBE_CLOUD_CONFIG: FAIL"
  Write-Host ""
  Write-Host "Required cloud setup:"
  Write-Host "  1. Keep Automatic Analysis disabled for this project."
  Write-Host "  2. GitHub -> Settings -> Secrets and variables -> Actions."
  Write-Host "  3. Configure exactly one required secret: SONAR_TOKEN."
  exit 1
}

Write-Host "SONARQUBE_CLOUD_CONFIG: PASS"
Write-Host ""
Write-Host "Repository configuration is Cloud-ready."
Write-Host "Only the SONAR_TOKEN secret is required in GitHub Actions."
exit 0
