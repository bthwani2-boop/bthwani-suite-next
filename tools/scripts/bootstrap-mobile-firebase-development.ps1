# tools/scripts/bootstrap-mobile-firebase-development.ps1
# Idempotently register the four Android apps in an existing Firebase project and
# download complete google-services.json files. Dry-run is the default.
# This script never uploads files or credentials to EAS.

[CmdletBinding()]
param(
    [string] $ProjectId = "bthwani",
    [string] $SecretsRoot = "C:\bthwani-secrets\firebase",
    [string] $FirebaseToolsVersion = "15.24.0",
    [switch] $Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$ManifestPath = Join-Path $RepoRoot "tools\mobile\mobile-apps.manifest.json"
$ValidatorPath = Join-Path $RepoRoot "tools\mobile\google-services-config.mjs"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportRoot = Join-Path $RepoRoot ".tmp\firebase-bootstrap\$Timestamp"
$DownloadRoot = Join-Path $ReportRoot "downloads"
$ReportPath = Join-Path $ReportRoot "result.json"
$LocalSecretsMapPath = Join-Path $RepoRoot "secrets.local.mobile.json"

New-Item -ItemType Directory -Force -Path $ReportRoot, $DownloadRoot | Out-Null
Set-Location $RepoRoot

function Get-BalancedJsonObjectText {
    param(
        [Parameter(Mandatory)][string] $Text,
        [Parameter(Mandatory)][int] $StartIndex
    )

    $depth = 0
    $inString = $false
    $escaped = $false

    for ($index = $StartIndex; $index -lt $Text.Length; $index++) {
        $char = $Text[$index]

        if ($inString) {
            if ($escaped) {
                $escaped = $false
                continue
            }

            if ($char -eq '\') {
                $escaped = $true
                continue
            }

            if ($char -eq '"') {
                $inString = $false
                continue
            }

            continue
        }

        if ($char -eq '"') {
            $inString = $true
            continue
        }

        if ($char -eq '{') {
            $depth++
            continue
        }

        if ($char -eq '}') {
            $depth--
            if ($depth -eq 0) {
                return $Text.Substring($StartIndex, ($index - $StartIndex + 1))
            }
        }
    }

    return $null
}

function Convert-EmbeddedJson {
    param([Parameter(Mandatory)][string] $Text)

    $searchStart = 0
    while ($searchStart -lt $Text.Length) {
        $start = $Text.IndexOf("{", $searchStart)
        if ($start -lt 0) {
            break
        }

        $jsonText = Get-BalancedJsonObjectText -Text $Text -StartIndex $start
        if ($null -ne $jsonText) {
            try {
                return $jsonText | ConvertFrom-Json -Depth 100
            } catch {
                # Keep scanning; Firebase CLI can print non-JSON brace blocks before the real JSON.
            }
        }

        $searchStart = $start + 1
    }

    throw "No valid JSON object was found in command output: $Text"
}

function Test-EmbeddedJsonSuccess {
    param([Parameter(Mandatory)][string] $Text)

    try {
        $json = Convert-EmbeddedJson -Text $Text
        $statusProperty = $json.PSObject.Properties["status"]
        return ($null -ne $statusProperty -and [string]$statusProperty.Value -eq "success")
    } catch {
        return $false
    }
}

function Invoke-FirebaseCli {
    param(
        [Parameter(Mandatory)][string[]] $Arguments,
        [switch] $AllowFailure
    )

    $output = & pnpm dlx "firebase-tools@$FirebaseToolsVersion" @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    $text = ($output | Out-String).Trim()

    if (-not $AllowFailure -and $exitCode -ne 0) {
        if (($Arguments -contains "--json") -and (Test-EmbeddedJsonSuccess -Text $text)) {
            Write-Host "WARN: Firebase CLI returned exit code $exitCode after emitting successful JSON; continuing with parsed JSON output." -ForegroundColor DarkYellow
        } else {
            throw "Firebase CLI failed ($exitCode): firebase $($Arguments -join ' ')`n$text"
        }
    }

    return [pscustomobject]@{
        ExitCode = $exitCode
        Output = $text
    }
}

function Get-ObjectPropertyValue {
    param(
        [AllowNull()] $Object,
        [Parameter(Mandatory)][string[]] $Names
    )

    if ($null -eq $Object) {
        return $null
    }

    foreach ($name in $Names) {
        $property = $Object.PSObject.Properties[$name]
        if ($null -ne $property -and $null -ne $property.Value) {
            return $property.Value
        }
    }

    return $null
}

function Get-FirebaseAppRecords {
    param([AllowNull()] $Root)

    $records = [System.Collections.Generic.List[object]]::new()

    function Visit-FirebaseNode {
        param([AllowNull()] $Node)

        if ($null -eq $Node -or $Node -is [string] -or $Node -is [ValueType]) {
            return
        }

        if ($Node -is [System.Collections.IEnumerable] -and
            $Node -isnot [pscustomobject] -and
            $Node -isnot [System.Collections.IDictionary]) {
            foreach ($item in $Node) {
                Visit-FirebaseNode -Node $item
            }
            return
        }

        if ($Node -isnot [pscustomobject] -and $Node -isnot [System.Collections.IDictionary]) {
            return
        }

        $appId = Get-ObjectPropertyValue -Object $Node -Names @("appId", "app_id")
        $platform = Get-ObjectPropertyValue -Object $Node -Names @("platform")
        if (-not [string]::IsNullOrWhiteSpace([string]$appId) -and
            -not [string]::IsNullOrWhiteSpace([string]$platform)) {
            $records.Add($Node)
        }

        foreach ($property in $Node.PSObject.Properties) {
            Visit-FirebaseNode -Node $property.Value
        }
    }

    Visit-FirebaseNode -Node $Root
    return @($records)
}

function Get-FirebaseAppPackage {
    param([Parameter(Mandatory)] $App)

    $value = Get-ObjectPropertyValue `
        -Object $App `
        -Names @("namespace", "packageName", "package_name", "androidPackage")
    return [string]$value
}

function Get-FirebaseApps {
    $listResult = Invoke-FirebaseCli -Arguments @(
        "apps:list",
        "ANDROID",
        "--project", $ProjectId,
        "--json",
        "--non-interactive"
    )
    $json = Convert-EmbeddedJson -Text $listResult.Output
    return @(Get-FirebaseAppRecords -Root $json)
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
    $result = Convert-EmbeddedJson -Text $text

    if ($exitCode -ne 0 -or $result.ok -ne $true) {
        throw "Firebase file validation failed for '$ExpectedPackage': $($result.error)"
    }

    return $result
}

function Find-AppByPackage {
    param(
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]] $Apps,
        [Parameter(Mandatory)][string] $Package
    )

    $matches = @(
        $Apps | Where-Object {
            (Get-FirebaseAppPackage -App $_) -eq $Package
        }
    )

    if ($matches.Count -gt 1) {
        throw "Firebase project '$ProjectId' contains duplicate Android apps for package '$Package'."
    }

    if ($matches.Count -eq 1) {
        return $matches[0]
    }

    return $null
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " BTHWANI FIREBASE DEVELOPMENT BOOTSTRAP" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Project: $ProjectId"
Write-Host "Firebase CLI: $FirebaseToolsVersion"
Write-Host "Mode: $(if ($Apply) { 'APPLY' } else { 'DRY RUN' })"
Write-Host "Secrets root: $SecretsRoot"
Write-Host "Report: $ReportPath`n"

foreach ($requiredPath in @($ManifestPath, $ValidatorPath)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Required repository file is missing: $requiredPath"
    }
}

$loginResult = Invoke-FirebaseCli -Arguments @("login:list")
if ($loginResult.Output -notmatch "Logged in as") {
    throw "Firebase CLI login was not proven. Run 'pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/login-mobile-firebase-development.ps1'."
}
Write-Host $loginResult.Output -ForegroundColor Green

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -Depth 100
$expectedApps = @(
    foreach ($appKey in $manifest.apps.PSObject.Properties.Name) {
        $app = $manifest.apps.$appKey
        [pscustomobject]@{
            AppKey = $appKey
            Package = [string]$app.androidPackage
            DisplayName = "BThwani $appKey Android Development"
            DestinationDirectory = Join-Path $SecretsRoot $appKey
            DestinationPath = Join-Path (Join-Path $SecretsRoot $appKey) "google-services.json"
        }
    }
)

Write-Host "PHASE 1: Inspect Firebase project and calculate an idempotent plan" -ForegroundColor Yellow
$firebaseApps = @(Get-FirebaseApps)
$plan = [System.Collections.Generic.List[object]]::new()

foreach ($expected in $expectedApps) {
    $existing = Find-AppByPackage -Apps $firebaseApps -Package $expected.Package
    $appId = if ($null -ne $existing) {
        [string](Get-ObjectPropertyValue -Object $existing -Names @("appId", "app_id"))
    } else {
        $null
    }

    $plan.Add([pscustomobject]@{
        AppKey = $expected.AppKey
        Package = $expected.Package
        DisplayName = $expected.DisplayName
        FirebaseState = if ($null -eq $existing) { "Create" } else { "Exists" }
        AppId = $appId
        DestinationDirectory = $expected.DestinationDirectory
        DestinationPath = $expected.DestinationPath
        DownloadPath = Join-Path (Join-Path $DownloadRoot $expected.AppKey) "google-services.json"
        Validation = "Pending"
        ProjectId = $null
        MobileSdkAppId = $null
    })
}

$plan | Select-Object AppKey, Package, FirebaseState, AppId | Format-Table -AutoSize

if (-not $Apply) {
    $plan |
        Select-Object AppKey, Package, FirebaseState, AppId, DestinationPath |
        ConvertTo-Json -Depth 10 |
        Set-Content -LiteralPath $ReportPath -Encoding UTF8

    Write-Host "`nDRY RUN COMPLETE: Firebase was not changed and no files were downloaded." -ForegroundColor Green
    Write-Host "Review the plan, then run the same script with -Apply." -ForegroundColor Yellow
    return
}

Write-Host "`nPHASE 2: Create only missing Android apps" -ForegroundColor Yellow
foreach ($entry in $plan | Where-Object FirebaseState -eq "Create") {
    Write-Host "Creating $($entry.AppKey): $($entry.Package)" -ForegroundColor Cyan
    [void](Invoke-FirebaseCli -Arguments @(
        "apps:create",
        "ANDROID",
        $entry.DisplayName,
        "--package-name", $entry.Package,
        "--project", $ProjectId,
        "--json",
        "--non-interactive"
    ))
}

$allAppsResolved = $false
for ($attempt = 1; $attempt -le 10; $attempt++) {
    $firebaseApps = @(Get-FirebaseApps)
    $unresolved = [System.Collections.Generic.List[string]]::new()

    foreach ($entry in $plan) {
        $resolvedApp = Find-AppByPackage -Apps $firebaseApps -Package $entry.Package
        if ($null -eq $resolvedApp) {
            $unresolved.Add($entry.Package)
            continue
        }

        $entry.AppId = [string](Get-ObjectPropertyValue -Object $resolvedApp -Names @("appId", "app_id"))
        $entry.FirebaseState = "Ready"
    }

    if ($unresolved.Count -eq 0) {
        $allAppsResolved = $true
        break
    }

    if ($attempt -lt 10) {
        Write-Host "Waiting for Firebase app registration visibility (attempt $attempt/10)..." -ForegroundColor DarkYellow
        Start-Sleep -Seconds 2
    }
}

if (-not $allAppsResolved) {
    $missingPackages = @(
        $plan | Where-Object { [string]::IsNullOrWhiteSpace([string]$_.AppId) } | ForEach-Object Package
    )
    throw "Firebase apps were not visible after retries: $($missingPackages -join ', ')"
}

Write-Host "`nPHASE 3: Download all SDK configs into an isolated staging directory" -ForegroundColor Yellow
foreach ($entry in $plan) {
    $downloadDirectory = Split-Path -Parent $entry.DownloadPath
    New-Item -ItemType Directory -Force -Path $downloadDirectory | Out-Null

    $sdkResult = Invoke-FirebaseCli -Arguments @(
        "apps:sdkconfig",
        "ANDROID",
        $entry.AppId,
        "--project", $ProjectId,
        "--non-interactive"
    )

    $sdkJson = Convert-EmbeddedJson -Text $sdkResult.Output
    $sdkJson |
        ConvertTo-Json -Depth 100 |
        Set-Content -LiteralPath $entry.DownloadPath -Encoding UTF8
}

Write-Host "`nPHASE 4: Validate every staged file before touching secure destinations" -ForegroundColor Yellow
$projectIds = [System.Collections.Generic.List[string]]::new()
foreach ($entry in $plan) {
    $validation = Invoke-GoogleServicesValidation `
        -Path $entry.DownloadPath `
        -ExpectedPackage $entry.Package

    $entry.Validation = "Valid"
    $entry.ProjectId = [string]$validation.projectId
    $entry.MobileSdkAppId = [string]$validation.mobileSdkAppId
    $projectIds.Add($entry.ProjectId)

    if ($entry.MobileSdkAppId -ne $entry.AppId) {
        throw "$($entry.AppKey): downloaded mobilesdk_app_id '$($entry.MobileSdkAppId)' does not match Firebase App ID '$($entry.AppId)'."
    }
}

$uniqueProjectIds = @($projectIds | Sort-Object -Unique)
if ($uniqueProjectIds.Count -ne 1 -or $uniqueProjectIds[0] -ne $ProjectId) {
    throw "Downloaded files do not all belong to Firebase project '$ProjectId'. Found: $($uniqueProjectIds -join ', ')"
}

Write-Host "`nPHASE 5: Install validated files under the secure local root" -ForegroundColor Yellow
$backupRoot = Join-Path $ReportRoot "backups"
$localSecretsMap = [ordered]@{}

foreach ($entry in $plan) {
    New-Item -ItemType Directory -Force -Path $entry.DestinationDirectory | Out-Null

    if (Test-Path -LiteralPath $entry.DestinationPath -PathType Leaf) {
        $backupDirectory = Join-Path $backupRoot $entry.AppKey
        New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
        Copy-Item `
            -LiteralPath $entry.DestinationPath `
            -Destination (Join-Path $backupDirectory "google-services.json") `
            -Force
    }

    Copy-Item `
        -LiteralPath $entry.DownloadPath `
        -Destination $entry.DestinationPath `
        -Force

    $localSecretsMap[$entry.AppKey] = $entry.DestinationPath
}

$localSecretsMap |
    ConvertTo-Json -Depth 5 |
    Set-Content -LiteralPath $LocalSecretsMapPath -Encoding UTF8

$report = [pscustomobject]@{
    Timestamp = (Get-Date).ToString("o")
    Mode = "Apply"
    FirebaseProjectId = $ProjectId
    FirebaseToolsVersion = $FirebaseToolsVersion
    EASChanged = $false
    Apps = @(
        $plan | Select-Object AppKey, Package, FirebaseState, AppId, Validation, ProjectId, MobileSdkAppId, DestinationPath
    )
}
$report |
    ConvertTo-Json -Depth 20 |
    Set-Content -LiteralPath $ReportPath -Encoding UTF8

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " FIREBASE BOOTSTRAP RESULT" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
$plan |
    Select-Object AppKey, Package, FirebaseState, Validation, ProjectId, AppId, DestinationPath |
    Format-Table -AutoSize

Write-Host "PASS: four complete Firebase Android configs are installed locally." -ForegroundColor Green
Write-Host "No EAS project, variable, credential, build, or workflow was changed." -ForegroundColor Green
Write-Host "Report: $ReportPath" -ForegroundColor Cyan
