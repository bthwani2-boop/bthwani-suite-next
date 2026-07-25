# tools/scripts/setup-mobile-firebase-development.ps1
# Validate all four Android Firebase configs before any EAS mutation.
# Default mode is validation-only. Pass -Apply to upload project-scoped EAS variables.

[CmdletBinding()]
param(
    [switch] $Apply,
    [switch] $AllowEnvironmentFirebaseOverride
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$MobileEnvPath = Join-Path $RepoRoot "infra\local\mobile.env"
$ManifestPath = Join-Path $RepoRoot "tools\mobile\mobile-apps.manifest.json"
$ValidatorPath = Join-Path $RepoRoot "tools\mobile\google-services-config.mjs"
$SecretsDir = "C:\bthwani-secrets\firebase"
$LocalSecretsJsonPath = Join-Path $RepoRoot "secrets.local.mobile.json"
Set-Location $RepoRoot

function Import-BthwaniEnvironmentFile {
    param([Parameter(Mandatory)][string] $Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return
    }

    foreach ($rawLine in Get-Content -LiteralPath $Path) {
        $line = $rawLine.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
            continue
        }

        $parts = $line.Split("=", 2)
        $name = $parts[0].Trim()
        $value = $parts[1].Trim()
        if (-not $name) {
            continue
        }
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if (-not [Environment]::GetEnvironmentVariable($name, "Process")) {
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

function Resolve-AppScopedValue {
    param(
        [Parameter(Mandatory)][string] $BaseName,
        [Parameter(Mandatory)][string] $AppKey
    )

    $suffix = $AppKey.Replace("-", "_").ToUpperInvariant()
    $scopedValue = [Environment]::GetEnvironmentVariable("${BaseName}_${suffix}", "Process")
    if (-not [string]::IsNullOrWhiteSpace($scopedValue)) {
        return $scopedValue.Trim()
    }

    $commonValue = [Environment]::GetEnvironmentVariable($BaseName, "Process")
    if (-not [string]::IsNullOrWhiteSpace($commonValue)) {
        return $commonValue.Trim()
    }
    return $null
}

function Read-LocalSecretsMap {
    param([Parameter(Mandatory)][string] $Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return $null
    }

    try {
        return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -Depth 20
    } catch {
        throw "Local Firebase path map is invalid: $Path. $($_.Exception.Message)"
    }
}

function Get-LocalSecretsMapValue {
    param(
        [AllowNull()] $Map,
        [Parameter(Mandatory)][string] $AppKey
    )

    if ($null -eq $Map) {
        return $null
    }

    $property = $Map.PSObject.Properties[$AppKey]
    if ($null -eq $property) {
        return $null
    }

    $value = [string]$property.Value
    if ([string]::IsNullOrWhiteSpace($value)) {
        return $null
    }

    return $value.Trim()
}

function Resolve-FirebaseInputPath {
    param(
        [Parameter(Mandatory)][string] $AppKey,
        [Parameter(Mandatory)][string] $DefaultFirebasePath,
        [AllowNull()] $LocalSecretsMap
    )

    $mappedFirebasePath = Get-LocalSecretsMapValue -Map $LocalSecretsMap -AppKey $AppKey
    $configuredFirebasePath = Resolve-AppScopedValue -BaseName "GOOGLE_SERVICES_JSON" -AppKey $AppKey

    if (-not $AllowEnvironmentFirebaseOverride) {
        if (-not [string]::IsNullOrWhiteSpace($mappedFirebasePath)) {
            return [pscustomobject]@{
                Path = $mappedFirebasePath
                Source = "secrets.local.mobile.json"
            }
        }

        return [pscustomobject]@{
            Path = $DefaultFirebasePath
            Source = "secure-default"
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($configuredFirebasePath)) {
        return [pscustomobject]@{
            Path = $configuredFirebasePath
            Source = "environment-override"
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($mappedFirebasePath)) {
        return [pscustomobject]@{
            Path = $mappedFirebasePath
            Source = "secrets.local.mobile.json"
        }
    }

    return [pscustomobject]@{
        Path = $DefaultFirebasePath
        Source = "secure-default"
    }
}

function Invoke-GoogleServicesValidation {
    param(
        [Parameter(Mandatory)][string] $Path,
        [Parameter(Mandatory)][string] $ExpectedPackage
    )

    $output = & node $ValidatorPath `
        --file $Path `
        --package $ExpectedPackage `
        --json 2>&1
    $exitCode = $LASTEXITCODE
    $text = ($output | Out-String).Trim()
    $jsonStart = $text.IndexOf("{")

    if ($jsonStart -lt 0) {
        throw "Firebase validator returned no JSON for '$Path': $text"
    }

    try {
        $result = $text.Substring($jsonStart) | ConvertFrom-Json -Depth 20
    } catch {
        throw "Firebase validator returned invalid JSON for '$Path': $text"
    }

    if ($exitCode -ne 0 -or $result.ok -ne $true) {
        $message = if (-not [string]::IsNullOrWhiteSpace([string]$result.error)) {
            [string]$result.error
        } else {
            "unknown validation failure"
        }
        throw $message
    }

    return $result
}

function Format-EasCommandForLog {
    param(
        [Parameter(Mandatory)][string[]] $Arguments
    )

    $sensitiveFlags = @("--value", "--password", "--secret")
    $masked = [System.Collections.Generic.List[string]]::new()
    for ($index = 0; $index -lt $Arguments.Count; $index++) {
        $argument = [string]$Arguments[$index]
        $masked.Add($argument)
        if ($sensitiveFlags -contains $argument -and ($index + 1) -lt $Arguments.Count) {
            $index++
            $masked.Add("<redacted>")
        }
    }
    return "pnpm $($masked -join ' ')"
}

function Invoke-EasCliCommand {
    param(
        [Parameter(Mandatory)][string] $AppDirectory,
        [Parameter(Mandatory)][string[]] $Arguments,
        [string[]] $SecretValues = @()
    )

    Push-Location -LiteralPath $AppDirectory
    try {
        $global:LASTEXITCODE = 0
        $output = & pnpm @Arguments 2>&1
        $exitCode = if ($null -eq $global:LASTEXITCODE) { 0 } else { [int]$global:LASTEXITCODE }
        $text = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
        foreach ($secretValue in $SecretValues) {
            if (-not [string]::IsNullOrWhiteSpace($secretValue)) {
                $text = $text.Replace($secretValue, "<redacted>")
            }
        }
        return [pscustomobject]@{
            ExitCode = $exitCode
            Text = $text
            Rendered = Format-EasCommandForLog -Arguments $Arguments
        }
    } finally {
        Pop-Location
    }
}

function Set-EasDevelopmentVariable {
    param(
        [Parameter(Mandatory)][string] $AppDirectory,
        [Parameter(Mandatory)][string] $Name,
        [Parameter(Mandatory)][string] $Value,
        [Parameter(Mandatory)][ValidateSet("file", "string")][string] $Type
    )

    # google-services.json and Google Maps keys are embedded into client APKs.
    # Use sensitive rather than secret so EAS CLI can resolve dynamic app config
    # consistently while still avoiding plain log output.
    $visibility = "sensitive"
    $createArguments = @(
        "dlx", "eas-cli@latest", "env:create",
        "--name", $Name,
        "--value", $Value,
        "--type", $Type,
        "--visibility", $visibility,
        "--scope", "project",
        "--environment", "development",
        "--force",
        "--non-interactive"
    )

    Write-Host "> $(Format-EasCommandForLog -Arguments $createArguments)" -ForegroundColor DarkGray
    $create = Invoke-EasCliCommand -AppDirectory $AppDirectory -Arguments $createArguments -SecretValues @($Value)
    if ($create.ExitCode -eq 0) {
        return
    }

    $alreadyExists = $create.Text -match "already exists|duplicate|exists"
    if ($alreadyExists) {
        $updateArguments = @(
            "dlx", "eas-cli@latest", "env:update",
            "development",
            "--variable-name", $Name,
            "--variable-environment", "development",
            "--name", $Name,
            "--value", $Value,
            "--type", $Type,
            "--visibility", $visibility,
            "--scope", "project",
            "--environment", "development",
            "--non-interactive"
        )
        Write-Host "> $(Format-EasCommandForLog -Arguments $updateArguments)" -ForegroundColor DarkGray
        $update = Invoke-EasCliCommand -AppDirectory $AppDirectory -Arguments $updateArguments -SecretValues @($Value)
        if ($update.ExitCode -eq 0) {
            return
        }
        throw "EAS env:update failed for $Name with exit code $($update.ExitCode). Command: $($update.Rendered)`n$($update.Text)"
    }

    throw "EAS env:create failed for $Name with exit code $($create.ExitCode). Command: $($create.Rendered)`n$($create.Text)"
}

Write-Host "BThwani Mobile Firebase Development Setup" -ForegroundColor Cyan
Write-Host "Repo Root: $RepoRoot"
Write-Host "Mode: $(if ($Apply) { 'APPLY TO EAS' } else { 'VALIDATION ONLY' })"
Write-Host "Firebase path priority: $(if ($AllowEnvironmentFirebaseOverride) { 'environment override enabled' } else { 'bootstrapped local secrets first' })`n"

foreach ($requiredPath in @($ManifestPath, $ValidatorPath)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Required file is missing: $requiredPath"
    }
}

Import-BthwaniEnvironmentFile -Path $MobileEnvPath
$bootstrapSecretsMap = Read-LocalSecretsMap -Path $LocalSecretsJsonPath

$nodeVersion = (& node -v).Trim()
$pnpmVersion = (& pnpm -v).Trim()
Write-Host "Node: $nodeVersion | pnpm: $pnpmVersion" -ForegroundColor Green

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -Depth 100
New-Item -ItemType Directory -Path $SecretsDir -Force | Out-Null

$validationPlan = [System.Collections.Generic.List[object]]::new()
$localSecretsMap = [ordered]@{}
$validationErrors = [System.Collections.Generic.List[string]]::new()

Write-Host "`nPHASE 1: Validate every local Firebase input before EAS mutation" -ForegroundColor Yellow

foreach ($appKey in $manifest.apps.PSObject.Properties.Name) {
    $app = $manifest.apps.$appKey
    $expectedPackage = [string]$app.androidPackage
    $features = @($app.features)
    $requiresMaps = $features -contains "maps"
    $appDirectory = Join-Path $RepoRoot "apps\$appKey\runtime"
    $appSecretsDirectory = Join-Path $SecretsDir $appKey
    New-Item -ItemType Directory -Path $appSecretsDirectory -Force | Out-Null

    $defaultFirebasePath = Join-Path $appSecretsDirectory "google-services.json"
    $firebaseInput = Resolve-FirebaseInputPath `
        -AppKey $appKey `
        -DefaultFirebasePath $defaultFirebasePath `
        -LocalSecretsMap $bootstrapSecretsMap
    $firebasePath = [string]$firebaseInput.Path
    $firebaseSource = [string]$firebaseInput.Source

    $firebaseState = "Missing"
    $projectId = "-"
    $mobileSdkAppId = "-"
    $resolvedFirebasePath = $firebasePath

    try {
        if (-not (Test-Path -LiteralPath $firebasePath -PathType Leaf)) {
            throw "missing google-services.json at $firebasePath"
        }

        $resolvedFirebasePath = (Resolve-Path -LiteralPath $firebasePath).Path
        $validation = Invoke-GoogleServicesValidation `
            -Path $resolvedFirebasePath `
            -ExpectedPackage $expectedPackage

        $firebaseState = "Valid"
        $projectId = [string]$validation.projectId
        $mobileSdkAppId = [string]$validation.mobileSdkAppId
        $localSecretsMap[$appKey] = $resolvedFirebasePath
    } catch {
        $firebaseState = "Invalid"
        $validationErrors.Add("${appKey}: $($_.Exception.Message)")
    }

    $androidMapsKey = $null
    $iosMapsKey = $null
    $mapsState = "Not required"
    if ($requiresMaps) {
        $androidMapsKey = Resolve-AppScopedValue -BaseName "GOOGLE_MAPS_ANDROID_API_KEY" -AppKey $appKey
        $iosMapsKey = Resolve-AppScopedValue -BaseName "GOOGLE_MAPS_IOS_API_KEY" -AppKey $appKey
        $mapsState = if ([string]::IsNullOrWhiteSpace($androidMapsKey)) {
            "Optional in development"
        } else {
            "Ready for optional upload"
        }
    }

    $validationPlan.Add([pscustomobject]@{
        App = $appKey
        Package = $expectedPackage
        AppDirectory = $appDirectory
        FirebasePath = $resolvedFirebasePath
        FirebaseSource = $firebaseSource
        Firebase = $firebaseState
        ProjectId = $projectId
        MobileSdkAppId = $mobileSdkAppId
        AndroidMapsKey = $androidMapsKey
        IosMapsKey = $iosMapsKey
        Maps = $mapsState
        EasFcm = if ($Apply) { "Pending" } else { "Not changed" }
    })
}

$validationPlan |
    Select-Object App, Package, Firebase, FirebaseSource, ProjectId, Maps, EasFcm |
    Format-Table -AutoSize

if ($validationErrors.Count -gt 0) {
    Write-Host "`nFirebase validation failed. No EAS variables were changed." -ForegroundColor Red
    foreach ($validationError in $validationErrors) {
        Write-Host " - $validationError" -ForegroundColor Red
    }
    throw "All four complete Firebase files must pass validation before any EAS upload."
}

$localSecretsMap |
    ConvertTo-Json -Depth 5 |
    Set-Content -LiteralPath $LocalSecretsJsonPath -Encoding UTF8
Write-Host "`nLocal path map updated: $LocalSecretsJsonPath" -ForegroundColor Green

if (-not $Apply) {
    Write-Host "`nPASS: all four Firebase files are complete and package-isolated." -ForegroundColor Green
    Write-Host "Validation-only mode made no EAS changes. Re-run with -Apply after review." -ForegroundColor Yellow
    return
}

Write-Host "`nPHASE 2: Verify EAS authentication" -ForegroundColor Yellow
$easUser = (& pnpm dlx eas-cli@latest whoami 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($easUser)) {
    throw "EAS CLI authentication is required. Run 'pnpm dlx eas-cli@latest login' first. No EAS variables were changed."
}
Write-Host "EAS account: $easUser" -ForegroundColor Green

Write-Host "`nPHASE 3: Upload validated project-scoped EAS variables" -ForegroundColor Yellow
foreach ($entry in $validationPlan) {
    Set-EasDevelopmentVariable `
        -AppDirectory $entry.AppDirectory `
        -Name "GOOGLE_SERVICES_JSON" `
        -Value $entry.FirebasePath `
        -Type "file"
    $entry.EasFcm = "Uploaded"

    if (-not [string]::IsNullOrWhiteSpace([string]$entry.AndroidMapsKey)) {
        Set-EasDevelopmentVariable `
            -AppDirectory $entry.AppDirectory `
            -Name "GOOGLE_MAPS_ANDROID_API_KEY" `
            -Value $entry.AndroidMapsKey `
            -Type "string"
        $entry.Maps = "Android uploaded"
    }

    if (-not [string]::IsNullOrWhiteSpace([string]$entry.IosMapsKey)) {
        Set-EasDevelopmentVariable `
            -AppDirectory $entry.AppDirectory `
            -Name "GOOGLE_MAPS_IOS_API_KEY" `
            -Value $entry.IosMapsKey `
            -Type "string"
        $entry.Maps = if ($entry.Maps -eq "Android uploaded") {
            "Android + iOS uploaded"
        } else {
            "iOS uploaded"
        }
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " BThwani Development Firebase / EAS Status" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
$validationPlan |
    Select-Object App, Package, Firebase, FirebaseSource, ProjectId, Maps, EasFcm |
    Format-Table -AutoSize

Write-Host "PASS: all Firebase files were validated before EAS mutation and uploaded only to their matching projects." -ForegroundColor Green
Write-Host "Google Maps remained optional for development and was uploaded only when an app-scoped key existed." -ForegroundColor Green
