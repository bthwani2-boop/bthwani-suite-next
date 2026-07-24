# tools/scripts/login-mobile-firebase-development.ps1
# Proves local Firebase CLI login and access to the BThwani Firebase project.
# This script does not create Firebase apps, download credentials, upload EAS variables, or submit builds.

[CmdletBinding()]
param(
    [string] $ProjectId = "bthwani",
    [string] $FirebaseToolsVersion = "15.24.0",
    [switch] $ForceLogin
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportRoot = Join-Path $RepoRoot ".tmp\firebase-login\$Timestamp"
$TextReportPath = Join-Path $ReportRoot "firebase-login-report.txt"
$JsonReportPath = Join-Path $ReportRoot "firebase-login-report.json"
New-Item -ItemType Directory -Force -Path $ReportRoot | Out-Null
Set-Location $RepoRoot

function Invoke-FirebaseCli {
    param(
        [Parameter(Mandatory)][string[]] $Arguments,
        [switch] $AllowFailure
    )

    $output = & pnpm dlx "firebase-tools@$FirebaseToolsVersion" @Arguments 2>&1
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    $text = ($output | Out-String).Trim()

    if (-not $AllowFailure -and $exitCode -ne 0) {
        throw "Firebase CLI failed ($exitCode): firebase $($Arguments -join ' ')`n$text"
    }

    return [pscustomobject]@{
        ExitCode = $exitCode
        Output = $text
    }
}

function Add-ReportSection {
    param(
        [Parameter(Mandatory)][string] $Title,
        [Parameter(Mandatory)][string] $Text
    )

    @(
        "============================================================"
        $Title
        "============================================================"
        $Text
        ""
    ) | Add-Content -LiteralPath $TextReportPath -Encoding UTF8
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " BTHWANI FIREBASE LOGIN / ACCESS PROBE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Project: $ProjectId"
Write-Host "Firebase CLI: $FirebaseToolsVersion"
Write-Host "Report: $TextReportPath`n"

"BThwani Firebase login/access report - $(Get-Date -Format o)`n" | Set-Content -LiteralPath $TextReportPath -Encoding UTF8

$versionResult = Invoke-FirebaseCli -Arguments @("--version")
Add-ReportSection -Title "firebase --version" -Text $versionResult.Output
Write-Host "Firebase CLI version: $($versionResult.Output)" -ForegroundColor Green

$loginBefore = Invoke-FirebaseCli -Arguments @("login:list") -AllowFailure
Add-ReportSection -Title "firebase login:list before" -Text $loginBefore.Output

if ($ForceLogin -or $loginBefore.Output -notmatch "Logged in as") {
    Write-Host "Firebase login is required. Browser authentication will open." -ForegroundColor Yellow
    $loginResult = Invoke-FirebaseCli -Arguments @("login")
    Add-ReportSection -Title "firebase login" -Text $loginResult.Output
}

$loginAfter = Invoke-FirebaseCli -Arguments @("login:list")
Add-ReportSection -Title "firebase login:list after" -Text $loginAfter.Output
if ($loginAfter.Output -notmatch "Logged in as") {
    throw "Firebase login was not proven after login attempt."
}
Write-Host $loginAfter.Output -ForegroundColor Green

$projectsResult = Invoke-FirebaseCli -Arguments @("projects:list")
Add-ReportSection -Title "firebase projects:list" -Text $projectsResult.Output
if ($projectsResult.Output -notmatch "\b$([regex]::Escape($ProjectId))\b") {
    throw "Firebase project '$ProjectId' was not visible to the logged-in account."
}
Write-Host "Firebase project '$ProjectId' is visible." -ForegroundColor Green

# Use the human-readable apps:list here on purpose. Some Windows Firebase CLI builds can emit valid JSON and then crash on --json.
$appsListResult = Invoke-FirebaseCli -Arguments @("apps:list", "--project", $ProjectId) -AllowFailure
Add-ReportSection -Title "firebase apps:list --project $ProjectId" -Text $appsListResult.Output
if ($appsListResult.ExitCode -ne 0) {
    throw "Firebase apps:list failed while proving project access:`n$($appsListResult.Output)"
}

$summary = [pscustomobject]@{
    Timestamp = (Get-Date).ToString("o")
    ProjectId = $ProjectId
    FirebaseToolsVersion = $FirebaseToolsVersion
    LoggedIn = $true
    ProjectVisible = $true
    AppsListExitCode = $appsListResult.ExitCode
    FirebaseChanged = $false
    EASChanged = $false
    TextReport = $TextReportPath
}
$summary | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $JsonReportPath -Encoding UTF8

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " FIREBASE LOGIN / ACCESS RESULT" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "PASS: Firebase CLI login and project access are proven." -ForegroundColor Green
Write-Host "No Firebase app, EAS variable, credential, workflow, or build was changed." -ForegroundColor Green
Write-Host "Text report: $TextReportPath" -ForegroundColor Cyan
Write-Host "JSON report: $JsonReportPath" -ForegroundColor Cyan
