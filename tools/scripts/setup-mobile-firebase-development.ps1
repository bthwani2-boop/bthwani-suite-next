# tools/scripts/setup-mobile-firebase-development.ps1
# Set up Firebase Development configuration for BThwani mobile applications.

$ErrorActionPreference = "Stop"

# 1. Ensure working directory is repo root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
Set-Location $RepoRoot

Write-Host "BThwani Mobile Firebase Development Setup" -ForegroundColor Cyan
Write-Host "Repo Root: $RepoRoot`n"

# 2. Check Node and pnpm
Write-Host "--> Checking Node.js and pnpm..." -ForegroundColor Yellow
$nodeVer = node -v
$pnpmVer = pnpm -v
Write-Host "Node: $nodeVer | pnpm: $pnpmVer" -ForegroundColor Green

# 3. Check EAS CLI authentication
Write-Host "`n--> Checking EAS CLI authentication..." -ForegroundColor Yellow
try {
    $whoami = pnpm dlx eas-cli@latest whoami 2>&1
    Write-Host "EAS Logged-in User: $whoami" -ForegroundColor Green
} catch {
    Write-Warning "EAS CLI login required. Run 'pnpm dlx eas-cli@latest login' first."
}

# Load manifest
$manifestPath = Join-Path $RepoRoot "tools\mobile\mobile-apps.manifest.json"
$manifest = Get-Content $manifestPath | ConvertFrom-Json

$secretsDir = "C:\bthwani-secrets\firebase"
if (-not (Test-Path $secretsDir)) {
    New-Item -ItemType Directory -Path $secretsDir -Force | Out-Null
}

$summaryTable = @()
$localSecretsMap = @{}

foreach ($appKey in $manifest.apps.PSObject.Properties.Name) {
    $appObj = $manifest.apps.$appKey
    $expectedPackage = $appObj.androidPackage
    $appDir = Join-Path $RepoRoot "apps\$appKey\runtime"
    $appSecretsDir = Join-Path $secretsDir $appKey

    if (-not (Test-Path $appSecretsDir)) {
        New-Item -ItemType Directory -Path $appSecretsDir -Force | Out-Null
    }

    $localJsonPath = Join-Path $appSecretsDir "google-services.json"
    $fileFound = Test-Path $localJsonPath
    $packageMatched = $false
    $easVarSet = "Not attempted"

    if ($fileFound) {
        try {
            $jsonContent = Get-Content $localJsonPath -Raw | ConvertFrom-Json
            $packages = @()
            if ($jsonContent.client) {
                foreach ($client in $jsonContent.client) {
                    if ($client.client_info -and $client.client_info.android_client_info) {
                        $packages += $client.client_info.android_client_info.package_name
                    }
                }
            }
            if ($packages -contains $expectedPackage) {
                $packageMatched = $true
                $localSecretsMap[$appKey] = $localJsonPath
            } else {
                Write-Warning "File at $localJsonPath does NOT contain expected package '$expectedPackage' (found: $($packages -join ', '))"
            }
        } catch {
            Write-Warning "File at $localJsonPath is not valid JSON."
        }
    }

    if ($packageMatched) {
        Write-Host "`n--> Configuring EAS environment for $appKey ($appDir)..." -ForegroundColor Yellow
        Push-Location $appDir
        try {
            # Upload file variable to EAS development environment
            pnpm dlx eas-cli@latest env:create development `
                --name GOOGLE_SERVICES_JSON `
                --value $localJsonPath `
                --type file `
                --visibility secret `
                --scope project `
                --force `
                --non-interactive 2>&1 | Out-Null

            $easVarSet = "Uploaded (development)"
            Write-Host "EAS GOOGLE_SERVICES_JSON updated for $appKey" -ForegroundColor Green
        } catch {
            $easVarSet = "Upload Failed: $_"
            Write-Warning "Failed to set EAS env for ${appKey}: $_"
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "`nSkipping EAS upload for $appKey (valid local google-services.json not found)." -ForegroundColor DarkGray
    }

    $summaryTable += [PSCustomObject]@{
        "App"             = $appKey
        "Package"         = $expectedPackage
        "Local File"      = if ($fileFound) { $localJsonPath } else { "Missing" }
        "Package Match"   = if ($packageMatched) { "YES" } else { "NO" }
        "EAS File Var"    = $easVarSet
    }
}

# 10. Create secrets.local.mobile.json in root if files matched
$localSecretsJsonPath = Join-Path $RepoRoot "secrets.local.mobile.json"
if ($localSecretsMap.Count -gt 0) {
    $localSecretsMap | ConvertTo-Json -Depth 5 | Set-Content $localSecretsJsonPath -Encoding UTF8
    Write-Host "`nCreated $localSecretsJsonPath with $($localSecretsMap.Count) entries." -ForegroundColor Green
}

# 11. Verify .gitignore rule
$gitIgnored = git check-ignore secrets.local.mobile.json 2>&1
Write-Host "Gitignore check for secrets.local.mobile.json: $gitIgnored" -ForegroundColor Gray

# 12. Safe Summary Table
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "       BThwani Mobile Firebase Setup Status Table        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
$summaryTable | Format-Table -AutoSize
