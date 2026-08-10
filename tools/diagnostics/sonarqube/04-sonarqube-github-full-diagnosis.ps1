#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Repository = "bthwani2-boop/bthwani-suite-next",
    [string]$Branch = "master",
    [switch]$RunCoverage
)

$ErrorActionPreference = "Stop"

$RepoRoot = (& git rev-parse --show-toplevel 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or -not $RepoRoot) { throw "Run this script from inside the bthwani-suite-next Git repository." }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutputRoot = Join-Path $RepoRoot ".diagnostics\sonarqube-github-deep-$stamp"
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null

$SelfDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$scripts = @(
    "01-sonarqube-repository-diagnosis.ps1",
    "02-sonarqube-coverage-cpd-diagnosis.ps1",
    "03-github-master-protection-diagnosis.ps1"
)
foreach ($name in $scripts) {
    $path = Join-Path $SelfDir $name
    if (-not (Test-Path $path)) { throw "Missing diagnostic script: $path" }
}

Write-Host "Deep SonarQube/GitHub diagnosis"
Write-Host "Repository: $Repository"
Write-Host "Branch:     $Branch"
Write-Host "Output:     $OutputRoot"

& (Join-Path $SelfDir "01-sonarqube-repository-diagnosis.ps1") `
    -Repository $Repository -Branch $Branch -OutputRoot (Join-Path $OutputRoot "01-repository")
if ($LASTEXITCODE -ne 0) { throw "Repository/Sonar diagnosis failed." }

if ($RunCoverage) {
    & (Join-Path $SelfDir "02-sonarqube-coverage-cpd-diagnosis.ps1") `
        -Repository $Repository -Branch $Branch -OutputRoot (Join-Path $OutputRoot "02-coverage-cpd") -RunCoverage
} else {
    & (Join-Path $SelfDir "02-sonarqube-coverage-cpd-diagnosis.ps1") `
        -Repository $Repository -Branch $Branch -OutputRoot (Join-Path $OutputRoot "02-coverage-cpd")
}
if ($LASTEXITCODE -ne 0) { throw "Coverage/CPD diagnosis failed." }

& (Join-Path $SelfDir "03-github-master-protection-diagnosis.ps1") `
    -Repository $Repository -Branch $Branch -OutputRoot (Join-Path $OutputRoot "03-master-protection")
if ($LASTEXITCODE -ne 0) { throw "GitHub protection diagnosis failed." }

$summaryPath = Join-Path $OutputRoot "FINAL-SUMMARY.txt"
@(
    "SONARQUBE / GITHUB DEEP DIAGNOSIS"
    "Repository: $Repository"
    "Branch: $Branch"
    "Generated: $(Get-Date -Format o)"
    ""
) | Set-Content -LiteralPath $summaryPath -Encoding utf8

foreach ($sub in @("01-repository","02-coverage-cpd","03-master-protection")) {
    $file = Join-Path $OutputRoot "$sub\summary.txt"
    if (Test-Path $file) {
        Add-Content -LiteralPath $summaryPath -Value "===== $sub ====="
        Get-Content $file | Add-Content -LiteralPath $summaryPath
        Add-Content -LiteralPath $summaryPath -Value ""
    }
}

Write-Host ""
Write-Host "FINAL SUMMARY"
Write-Host ("=" * 78)
Get-Content $summaryPath
Write-Host ""
Write-Host "All evidence saved under:"
Write-Host $OutputRoot
