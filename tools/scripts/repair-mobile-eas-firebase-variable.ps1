# tools/scripts/repair-mobile-eas-firebase-variable.ps1
# Validate and repair one mobile app's GOOGLE_SERVICES_JSON variable on EAS.
# Uses the current `eas env:set` command, retries transient GraphQL failures,
# and verifies variable metadata before allowing a new build.

[CmdletBinding()]
param(
    [ValidateSet("app-client", "app-partner", "app-captain", "app-field")]
    [string] $AppKey = "app-field",

    [ValidateRange(1, 5)]
    [int] $MaxAttempts = 3,

    [switch] $VerifyOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$ManifestPath = Join-Path $RepoRoot "tools\mobile\mobile-apps.manifest.json"
$SecretsMapPath = Join-Path $RepoRoot "secrets.local.mobile.json"
$ValidatorPath = Join-Path $RepoRoot "tools\mobile\google-services-config.mjs"
$ReportRoot = Join-Path $RepoRoot ".tmp\mobile-eas-firebase-repair"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportDir = Join-Path $ReportRoot "$Timestamp-$AppKey"
$ReportPath = Join-Path $ReportDir "result.txt"
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

function Invoke-EasCommand {
    param(
        [Parameter(Mandatory)][string[]] $Arguments,
        [Parameter(Mandatory)][string] $WorkingDirectory
    )

    Push-Location -LiteralPath $WorkingDirectory
    try {
        $previousErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            $global:LASTEXITCODE = 0
            $output = & pnpm dlx eas-cli@latest @Arguments 2>&1
            $exitCode = [int]$global:LASTEXITCODE
        } catch {
            $output = @($_.Exception.Message)
            $exitCode = 1
        } finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }

        return [pscustomobject]@{
            ExitCode = $exitCode
            Text = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
            Command = "pnpm dlx eas-cli@latest $($Arguments -join ' ')"
        }
    } finally {
        Pop-Location
    }
}

function Invoke-WithRetry {
    param(
        [Parameter(Mandatory)][scriptblock] $Operation,
        [Parameter(Mandatory)][string] $Label
    )

    $last = $null
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        Write-Host "$Label attempt $attempt/$MaxAttempts" -ForegroundColor Yellow
        $last = & $Operation
        if ($last.ExitCode -eq 0) {
            return $last
        }

        Write-Host $last.Text -ForegroundColor DarkYellow
        if ($attempt -lt $MaxAttempts) {
            Start-Sleep -Seconds (3 * $attempt)
        }
    }

    return $last
}

foreach ($requiredPath in @($ManifestPath, $SecretsMapPath, $ValidatorPath)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Required file is missing: $requiredPath"
    }
}

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -Depth 100
$app = $manifest.apps.$AppKey
if ($null -eq $app) {
    throw "Unknown app key: $AppKey"
}

$appDirectory = Join-Path $RepoRoot "apps\$AppKey\runtime"
$expectedPackage = [string]$app.androidPackage
$easProjectId = [string]$app.projectId
$slug = [string]$app.slug

$secretsMap = Get-Content -LiteralPath $SecretsMapPath -Raw | ConvertFrom-Json -Depth 20
$mappedProperty = $secretsMap.PSObject.Properties[$AppKey]
if ($null -eq $mappedProperty -or [string]::IsNullOrWhiteSpace([string]$mappedProperty.Value)) {
    throw "$AppKey is not mapped in $SecretsMapPath"
}

$googleServicesPath = [string]$mappedProperty.Value
if (-not (Test-Path -LiteralPath $googleServicesPath -PathType Leaf)) {
    throw "Mapped google-services.json does not exist: $googleServicesPath"
}
$googleServicesPath = (Resolve-Path -LiteralPath $googleServicesPath).Path

$validationOutput = & node $ValidatorPath `
    --file $googleServicesPath `
    --package $expectedPackage `
    --json 2>&1
$validationExitCode = $LASTEXITCODE
$validationText = ($validationOutput | Out-String).Trim()
$jsonStart = $validationText.IndexOf("{")
if ($validationExitCode -ne 0 -or $jsonStart -lt 0) {
    throw "Local google-services.json validation failed: $validationText"
}
$validation = $validationText.Substring($jsonStart) | ConvertFrom-Json -Depth 20
if ($validation.ok -ne $true) {
    throw "Local google-services.json is invalid for $expectedPackage"
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " BTHWANI EAS FIREBASE VARIABLE REPAIR" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "App:        $AppKey"
Write-Host "Slug:       $slug"
Write-Host "Project ID: $easProjectId"
Write-Host "Package:    $expectedPackage"
Write-Host "Mode:       $(if ($VerifyOnly) { 'VERIFY ONLY' } else { 'VERIFY + REPAIR' })"
Write-Host "Local file: valid and package-matched`n" -ForegroundColor Green

$whoami = Invoke-WithRetry -Label "EAS authentication" -Operation {
    Invoke-EasCommand -WorkingDirectory $appDirectory -Arguments @("whoami")
}
if ($whoami.ExitCode -ne 0) {
    throw "EAS authentication/API query failed after $MaxAttempts attempts: $($whoami.Text)"
}
Write-Host "EAS account: $($whoami.Text)" -ForegroundColor Green

function Get-RemoteVariable {
    Invoke-EasCommand -WorkingDirectory $appDirectory -Arguments @(
        "env:get",
        "development",
        "--variable-name", "GOOGLE_SERVICES_JSON",
        "--scope", "project",
        "--format", "long",
        "--non-interactive"
    )
}

$before = Invoke-WithRetry -Label "EAS GOOGLE_SERVICES_JSON metadata query" -Operation { Get-RemoteVariable }
$beforeExists = $before.ExitCode -eq 0 -and $before.Text -match "GOOGLE_SERVICES_JSON"

if ($VerifyOnly) {
    if (-not $beforeExists) {
        throw "GOOGLE_SERVICES_JSON could not be proven in the development environment. Last EAS response: $($before.Text)"
    }

    Write-Host "PASS: GOOGLE_SERVICES_JSON exists in the app-field EAS development environment." -ForegroundColor Green
    "PASS: remote variable exists`n$($before.Text)" | Set-Content -LiteralPath $ReportPath -Encoding UTF8
    Write-Host "Report: $ReportPath"
    return
}

$setResult = Invoke-WithRetry -Label "EAS GOOGLE_SERVICES_JSON secret-file upload" -Operation {
    Invoke-EasCommand -WorkingDirectory $appDirectory -Arguments @(
        "env:set",
        "development",
        "--name", "GOOGLE_SERVICES_JSON",
        "--value", $googleServicesPath,
        "--type", "file",
        "--visibility", "secret",
        "--scope", "project",
        "--json",
        "--non-interactive"
    )
}
if ($setResult.ExitCode -ne 0) {
    throw "EAS env:set failed after $MaxAttempts attempts: $($setResult.Text)"
}

$after = Invoke-WithRetry -Label "Post-upload EAS metadata verification" -Operation { Get-RemoteVariable }
$afterExists = $after.ExitCode -eq 0 -and $after.Text -match "GOOGLE_SERVICES_JSON"
if (-not $afterExists) {
    throw "Upload command returned success, but GOOGLE_SERVICES_JSON metadata could not be verified. Last response: $($after.Text)"
}

@(
    "PASS: GOOGLE_SERVICES_JSON repaired and verified",
    "App: $AppKey",
    "Slug: $slug",
    "Project ID: $easProjectId",
    "Package: $expectedPackage",
    "Visibility: secret",
    "Type: file",
    "Environment: development",
    "Remote metadata:",
    $after.Text
) | Set-Content -LiteralPath $ReportPath -Encoding UTF8

Write-Host "`nPASS: GOOGLE_SERVICES_JSON was set as a secret file and verified for $AppKey." -ForegroundColor Green
Write-Host "Report: $ReportPath"
