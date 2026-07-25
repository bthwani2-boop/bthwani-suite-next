# tools/scripts/google-cloud/configure-eas-fcm-v1-all-apps.ps1
# Opens the supported EAS credentials workflow for every BThwani Android app.
# EAS CLI currently manages FCM V1 upload interactively; this script guarantees
# that all four apps are visited and that the same central project key is staged
# securely for automatic detection. No single-app mode exists.

[CmdletBinding()]
param(
    [string] $KeyPath = 'C:\bthwani-secrets\firebase\bthwani-platform-fcm-v1-service-account.json',
    [string] $ExpectedProjectId = 'bthwani-platform',
    [string] $EasCliVersion = 'latest'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir '..\..\..')).Path
$ManifestPath = Join-Path $RepoRoot 'tools\mobile\mobile-apps.manifest.json'
$AppKeys = @('app-client', 'app-partner', 'app-captain', 'app-field')

function Assert-File {
    param([Parameter(Mandatory)][string] $Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required file is missing: $Path"
    }
}

function Read-KeyMetadata {
    param([Parameter(Mandatory)][string] $Path)
    try {
        $json = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -Depth 20
    } catch {
        throw "FCM V1 service-account file is invalid JSON: $Path"
    }
    if ([string]$json.project_id -ne $ExpectedProjectId) {
        throw "FCM V1 service-account project mismatch. Expected '$ExpectedProjectId', found '$($json.project_id)'."
    }
    if ([string]::IsNullOrWhiteSpace([string]$json.client_email) -or
        [string]::IsNullOrWhiteSpace([string]$json.private_key)) {
        throw 'FCM V1 service-account file is incomplete.'
    }
    return $json
}

Assert-File -Path $ManifestPath
Assert-File -Path $KeyPath
$key = Read-KeyMetadata -Path $KeyPath
$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -Depth 100

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' BTHWANI EAS FCM V1 — ALL FOUR ANDROID APPS' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "Firebase project: $ExpectedProjectId"
Write-Host "Service account:  $($key.client_email)"
Write-Host "Apps:             $($AppKeys -join ', ')"
Write-Host 'Private key:      validated, intentionally not printed.'
Write-Host ''
Write-Host 'For each app select:' -ForegroundColor Yellow
Write-Host 'Android > production > Google Service Account' -ForegroundColor Yellow
Write-Host 'Manage your Google Service Account Key for Push Notifications (FCM V1)' -ForegroundColor Yellow
Write-Host 'Set up ... > Upload a new service account key' -ForegroundColor Yellow
Write-Host 'Confirm the staged service-account-fcm-v1.local.json file.' -ForegroundColor Yellow

foreach ($appKey in $AppKeys) {
    $app = $manifest.apps.$appKey
    if ($null -eq $app) { throw "Mobile manifest does not define $appKey." }
    $appDirectory = Join-Path $RepoRoot "apps\$appKey\runtime"
    $stagedKeyPath = Join-Path $appDirectory 'service-account-fcm-v1.local.json'
    if (-not (Test-Path -LiteralPath $appDirectory -PathType Container)) {
        throw "App directory is missing: $appDirectory"
    }

    Write-Host "`n============================================================" -ForegroundColor Cyan
    Write-Host " $appKey · $($app.androidPackage)" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan

    Copy-Item -LiteralPath $KeyPath -Destination $stagedKeyPath -Force
    try {
        Push-Location -LiteralPath $appDirectory
        & pnpm dlx "eas-cli@$EasCliVersion" credentials -p android
        if ($LASTEXITCODE -ne 0) {
            throw "EAS credentials workflow failed for $appKey with exit code $LASTEXITCODE."
        }
    } finally {
        Pop-Location
        Remove-Item -LiteralPath $stagedKeyPath -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`nPASS: the supported EAS credentials workflow completed for all four Android apps." -ForegroundColor Green
Write-Host 'Run the all-surface preflight next; it will fail closed if any required mobile input is missing.' -ForegroundColor Cyan
