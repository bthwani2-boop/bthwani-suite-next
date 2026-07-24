# tools/scripts/setup-mobile-firebase-development.ps1
# Configure the minimum native provider baseline for BThwani development builds:
# Firebase Cloud Messaging for all four Android apps and Google Maps for captain only.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $true
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
$MobileEnvPath = Join-Path $RepoRoot "infra\local\mobile.env"
$ManifestPath = Join-Path $RepoRoot "tools\mobile\mobile-apps.manifest.json"
$SecretsDir = "C:\bthwani-secrets\firebase"
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

function Set-EasDevelopmentVariable {
    param(
        [Parameter(Mandatory)][string] $AppDirectory,
        [Parameter(Mandatory)][string] $Name,
        [Parameter(Mandatory)][string] $Value,
        [Parameter(Mandatory)][ValidateSet("file", "string")][string] $Type
    )

    Push-Location -LiteralPath $AppDirectory
    try {
        & pnpm dlx eas-cli@latest env:create development `
            --name $Name `
            --value $Value `
            --type $Type `
            --visibility secret `
            --scope project `
            --force `
            --non-interactive | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "EAS env:create failed for $Name with exit code $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }
}

function Get-GoogleServicesPackages {
    param([Parameter(Mandatory)][string] $Path)

    try {
        $jsonContent = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    } catch {
        throw "File is not valid JSON: $Path"
    }

    $packages = @()
    foreach ($client in @($jsonContent.client)) {
        $packageName = $client.client_info.android_client_info.package_name
        if (-not [string]::IsNullOrWhiteSpace($packageName)) {
            $packages += [string] $packageName
        }
    }
    return $packages
}

Write-Host "BThwani Mobile Native Development Provider Setup" -ForegroundColor Cyan
Write-Host "Repo Root: $RepoRoot`n"

Import-BthwaniEnvironmentFile -Path $MobileEnvPath

Write-Host "--> Checking Node.js, pnpm, and EAS authentication..." -ForegroundColor Yellow
$nodeVersion = (& node -v).Trim()
$pnpmVersion = (& pnpm -v).Trim()
$easUser = (& pnpm dlx eas-cli@latest whoami 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($easUser)) {
    throw "EAS CLI authentication is required. Run 'pnpm dlx eas-cli@latest login' first."
}
Write-Host "Node: $nodeVersion | pnpm: $pnpmVersion | EAS: $easUser" -ForegroundColor Green

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Path $SecretsDir -Force | Out-Null

$summaryTable = @()
$localSecretsMap = @{}
$hasErrors = $false

foreach ($appKey in $manifest.apps.PSObject.Properties.Name) {
    $app = $manifest.apps.$appKey
    $expectedPackage = [string] $app.androidPackage
    $features = @($app.features)
    $requiresMaps = $features -contains "maps"
    $appDirectory = Join-Path $RepoRoot "apps\$appKey\runtime"
    $appSecretsDirectory = Join-Path $SecretsDir $appKey
    New-Item -ItemType Directory -Path $appSecretsDirectory -Force | Out-Null

    $configuredFirebasePath = Resolve-AppScopedValue -BaseName "GOOGLE_SERVICES_JSON" -AppKey $appKey
    $defaultFirebasePath = Join-Path $appSecretsDirectory "google-services.json"
    $firebasePath = if (-not [string]::IsNullOrWhiteSpace($configuredFirebasePath)) {
        $configuredFirebasePath
    } else {
        $defaultFirebasePath
    }

    $firebaseState = "Missing"
    $firebaseUploadState = "Not uploaded"
    if (Test-Path -LiteralPath $firebasePath -PathType Leaf) {
        try {
            $packages = Get-GoogleServicesPackages -Path $firebasePath
            if ($packages -notcontains $expectedPackage) {
                throw "expected package '$expectedPackage'; found '$($packages -join ', ')'"
            }
            $firebaseState = "Valid"
            $localSecretsMap[$appKey] = (Resolve-Path -LiteralPath $firebasePath).Path
            Set-EasDevelopmentVariable -AppDirectory $appDirectory -Name "GOOGLE_SERVICES_JSON" -Value $firebasePath -Type "file"
            $firebaseUploadState = "Uploaded"
        } catch {
            $firebaseState = "Invalid"
            $firebaseUploadState = "Failed"
            $hasErrors = $true
            Write-Warning "${appKey}: Firebase configuration failed: $_"
        }
    } else {
        $hasErrors = $true
        Write-Warning "${appKey}: missing google-services.json at $firebasePath"
    }

    $mapsState = "Not required"
    if ($requiresMaps) {
        $androidMapsKey = Resolve-AppScopedValue -BaseName "GOOGLE_MAPS_ANDROID_API_KEY" -AppKey $appKey
        if ([string]::IsNullOrWhiteSpace($androidMapsKey)) {
            $mapsState = "Missing"
            $hasErrors = $true
            Write-Warning "${appKey}: GOOGLE_MAPS_ANDROID_API_KEY is required because the manifest enables maps."
        } else {
            try {
                Set-EasDevelopmentVariable -AppDirectory $appDirectory -Name "GOOGLE_MAPS_ANDROID_API_KEY" -Value $androidMapsKey -Type "string"
                $mapsState = "Uploaded"
            } catch {
                $mapsState = "Failed"
                $hasErrors = $true
                Write-Warning "${appKey}: Google Maps configuration failed: $_"
            }
        }

        $iosMapsKey = Resolve-AppScopedValue -BaseName "GOOGLE_MAPS_IOS_API_KEY" -AppKey $appKey
        if (-not [string]::IsNullOrWhiteSpace($iosMapsKey)) {
            try {
                Set-EasDevelopmentVariable -AppDirectory $appDirectory -Name "GOOGLE_MAPS_IOS_API_KEY" -Value $iosMapsKey -Type "string"
            } catch {
                $hasErrors = $true
                Write-Warning "${appKey}: optional iOS Google Maps configuration failed: $_"
            }
        }
    }

    $summaryTable += [PSCustomObject]@{
        App = $appKey
        Package = $expectedPackage
        Firebase = $firebaseState
        "EAS FCM" = $firebaseUploadState
        Maps = $mapsState
    }
}

$localSecretsJsonPath = Join-Path $RepoRoot "secrets.local.mobile.json"
if ($localSecretsMap.Count -gt 0) {
    $localSecretsMap | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $localSecretsJsonPath -Encoding UTF8
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " BThwani Development Native Provider Status" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
$summaryTable | Format-Table -AutoSize

if ($hasErrors) {
    throw "Development provider setup is incomplete. Resolve the reported Firebase or captain maps inputs, then rerun this command."
}

Write-Host "PASS: Firebase is isolated across all four apps and Google Maps is configured only for app-captain." -ForegroundColor Green
