# Validate and upload Firebase google-services.json files to all four EAS projects.
# Dry-run is the default. This script never supports a single-app mode.

[CmdletBinding()]
param(
    [string] $EasCliVersion = '18.6.0',
    [switch] $Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir '..\..\..')).Path
$ManifestPath = Join-Path $RepoRoot 'tools\mobile\mobile-apps.manifest.json'
$ValidationScript = Join-Path $RepoRoot 'tools\scripts\setup-mobile-firebase-development.ps1'
$LocalSecretsMapPath = Join-Path $RepoRoot 'secrets.local.mobile.json'

function Invoke-CapturedCommand {
    param(
        [Parameter(Mandatory)][string] $Command,
        [Parameter(Mandatory)][AllowEmptyCollection()][string[]] $Arguments,
        [string] $WorkingDirectory = $RepoRoot
    )

    Push-Location -LiteralPath $WorkingDirectory
    try {
        $output = & $Command @Arguments 2>&1
        $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
        $text = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
        return [pscustomobject]@{
            ExitCode = $exitCode
            Output = $text
        }
    } finally {
        Pop-Location
    }
}

function Assert-File {
    param([Parameter(Mandatory)][string] $Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required file is missing: $Path"
    }
}

function Read-JsonFile {
    param([Parameter(Mandatory)][string] $Path)
    Assert-File -Path $Path
    try {
        return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -Depth 100
    } catch {
        throw "Invalid JSON file '$Path': $($_.Exception.Message)"
    }
}

function Get-LocalFirebasePath {
    param(
        [Parameter(Mandatory)] $SecretsMap,
        [Parameter(Mandatory)][string] $AppKey
    )

    $property = $SecretsMap.PSObject.Properties[$AppKey]
    if ($null -eq $property -or [string]::IsNullOrWhiteSpace([string]$property.Value)) {
        throw "Local Firebase path map does not contain '$AppKey': $LocalSecretsMapPath"
    }

    $path = [string]$property.Value
    Assert-File -Path $path
    return (Resolve-Path -LiteralPath $path).Path
}

function Assert-EasProjectLink {
    param(
        [Parameter(Mandatory)][string] $AppKey,
        [Parameter(Mandatory)][string] $AppDirectory,
        [Parameter(Mandatory)][string] $ExpectedProjectId
    )

    $result = Invoke-CapturedCommand `
        -Command 'pnpm' `
        -Arguments @(
            'dlx', "eas-cli@$EasCliVersion",
            'config',
            '--platform', 'android',
            '--profile', 'development',
            '--json',
            '--non-interactive'
        ) `
        -WorkingDirectory $AppDirectory

    if ($result.ExitCode -ne 0) {
        throw "${AppKey}: EAS project configuration check failed with exit code $($result.ExitCode).`n$($result.Output)"
    }

    if ($result.Output -notmatch [regex]::Escape($ExpectedProjectId)) {
        throw "${AppKey}: EAS config did not prove expected project ID '$ExpectedProjectId'. No EAS variable was changed.`n$($result.Output)"
    }

    Write-Host "PASS: $AppKey is linked to EAS project $ExpectedProjectId" -ForegroundColor Green
}

function Set-EasDevelopmentFileVariable {
    param(
        [Parameter(Mandatory)][string] $AppKey,
        [Parameter(Mandatory)][string] $AppDirectory,
        [Parameter(Mandatory)][string] $FirebasePath
    )

    $name = 'GOOGLE_SERVICES_JSON'
    Write-Host "Uploading $name for $AppKey..." -ForegroundColor Cyan

    $createResult = Invoke-CapturedCommand `
        -Command 'pnpm' `
        -Arguments @(
            'dlx', "eas-cli@$EasCliVersion",
            'env:create', 'development',
            '--name', $name,
            '--value', $FirebasePath,
            '--type', 'file',
            '--visibility', 'sensitive',
            '--scope', 'project',
            '--force',
            '--non-interactive'
        ) `
        -WorkingDirectory $AppDirectory

    if ($createResult.ExitCode -ne 0) {
        throw "${AppKey}: EAS env:create failed with exit code $($createResult.ExitCode).`n$($createResult.Output)"
    }

    $verifyResult = Invoke-CapturedCommand `
        -Command 'pnpm' `
        -Arguments @(
            'dlx', "eas-cli@$EasCliVersion",
            'env:get', 'development',
            '--variable-name', $name,
            '--scope', 'project',
            '--format', 'short',
            '--non-interactive'
        ) `
        -WorkingDirectory $AppDirectory

    if ($verifyResult.ExitCode -ne 0 -or $verifyResult.Output -notmatch "(?m)\b$([regex]::Escape($name))\b") {
        throw "${AppKey}: $name upload returned success but post-upload verification failed.`n$($verifyResult.Output)"
    }

    Write-Host "PASS: $name uploaded and verified for $AppKey" -ForegroundColor Green
}

foreach ($requiredPath in @($ManifestPath, $ValidationScript, $LocalSecretsMapPath)) {
    Assert-File -Path $requiredPath
}

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' BTHWANI FIREBASE → EAS — ALL FOUR APPS' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "Mode:    $(if ($Apply) { 'APPLY' } else { 'DRY RUN' })"
Write-Host "EAS CLI: $EasCliVersion"
Write-Host 'Apps:    app-client, app-partner, app-captain, app-field'

Write-Host "`nPHASE 1: Revalidate all four Firebase files" -ForegroundColor Yellow
$validationResult = Invoke-CapturedCommand `
    -Command 'pwsh' `
    -Arguments @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $ValidationScript)
if ($validationResult.Output) {
    Write-Host $validationResult.Output
}
if ($validationResult.ExitCode -ne 0) {
    throw "Firebase validation failed with exit code $($validationResult.ExitCode). No EAS variable was changed."
}

$manifest = Read-JsonFile -Path $ManifestPath
$secretsMap = Read-JsonFile -Path $LocalSecretsMapPath
$appKeys = @($manifest.apps.PSObject.Properties.Name)
if ($appKeys.Count -ne 4) {
    throw "Expected exactly four governed mobile apps; found $($appKeys.Count)."
}

$plan = @(
    foreach ($appKey in $appKeys) {
        $app = $manifest.apps.$appKey
        [pscustomobject]@{
            AppKey = $appKey
            AppDirectory = Join-Path $RepoRoot "apps\$appKey\runtime"
            ProjectId = [string]$app.projectId
            Package = [string]$app.androidPackage
            FirebasePath = Get-LocalFirebasePath -SecretsMap $secretsMap -AppKey $appKey
        }
    }
)

Write-Host "`nPHASE 2: Verify EAS authentication" -ForegroundColor Yellow
$whoami = Invoke-CapturedCommand -Command 'pnpm' -Arguments @('dlx', "eas-cli@$EasCliVersion", 'whoami')
if ($whoami.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($whoami.Output)) {
    throw "EAS authentication is required. Run 'pnpm dlx eas-cli@$EasCliVersion login'. No EAS variable was changed.`n$($whoami.Output)"
}
Write-Host "EAS account: $($whoami.Output)" -ForegroundColor Green

Write-Host "`nPHASE 3: Verify all four EAS project links before mutation" -ForegroundColor Yellow
foreach ($entry in $plan) {
    if (-not (Test-Path -LiteralPath $entry.AppDirectory -PathType Container)) {
        throw "$($entry.AppKey): runtime directory is missing: $($entry.AppDirectory)"
    }
    Assert-EasProjectLink `
        -AppKey $entry.AppKey `
        -AppDirectory $entry.AppDirectory `
        -ExpectedProjectId $entry.ProjectId
}

$plan | Select-Object AppKey, Package, ProjectId, FirebasePath | Format-Table -AutoSize

if (-not $Apply) {
    Write-Host "`nPASS: all four Firebase files and EAS project links are ready." -ForegroundColor Green
    Write-Host 'Dry-run mode made no EAS changes. Re-run with -Apply after review.' -ForegroundColor Yellow
    return
}

Write-Host "`nPHASE 4: Upload and verify GOOGLE_SERVICES_JSON for all four apps" -ForegroundColor Yellow
foreach ($entry in $plan) {
    Set-EasDevelopmentFileVariable `
        -AppKey $entry.AppKey `
        -AppDirectory $entry.AppDirectory `
        -FirebasePath $entry.FirebasePath
}

Write-Host "`nPASS: GOOGLE_SERVICES_JSON is uploaded and verified in the development environment for all four EAS projects." -ForegroundColor Green
Write-Host 'No Google Maps key, FCM V1 credential, build, submit, or workflow was changed.' -ForegroundColor Green
