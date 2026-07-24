# tools/scripts/diagnose-mobile-firebase-push.ps1
# Deep, read-only probe for Android Firebase push setup across local secrets,
# dynamic Expo config, clean native prebuild output, optional EAS visibility, and optional installed APK.

[CmdletBinding()]
param(
    [ValidateSet("app-client", "app-partner", "app-captain", "app-field")]
    [string] $AppKey = "app-field",

    [string] $AdbPath,

    [switch] $SkipPrebuild,
    [switch] $SkipEas,
    [switch] $SkipAdb,
    [switch] $KeepNativeOutput
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
$SentryEnvPath = Join-Path $RepoRoot "tools\mobile\sentry-env.js"
$LocalSecretsJsonPath = Join-Path $RepoRoot "secrets.local.mobile.json"
$ReportRoot = Join-Path $RepoRoot ".tmp\mobile-firebase-diagnostics"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportDir = Join-Path $ReportRoot "$Timestamp-$AppKey"
$ReportJsonPath = Join-Path $ReportDir "result.json"
$ReportTextPath = Join-Path $ReportDir "result.txt"
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
Set-Location $RepoRoot

$results = [System.Collections.Generic.List[object]]::new()
$failures = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

function Add-Result {
    param(
        [Parameter(Mandatory)][string] $Area,
        [Parameter(Mandatory)][string] $Check,
        [Parameter(Mandatory)][ValidateSet("PASS", "WARN", "FAIL", "INFO", "SKIP")][string] $Status,
        [AllowNull()] $Data,
        [string] $Message = ""
    )

    $row = [ordered]@{
        area = $Area
        check = $Check
        status = $Status
        message = $Message
        data = $Data
    }
    $results.Add([pscustomobject]$row)
    if ($Status -eq "FAIL") { $failures.Add("${Area}/${Check}: $Message") }
    if ($Status -eq "WARN") { $warnings.Add("${Area}/${Check}: $Message") }
}

function Invoke-Captured {
    param(
        [Parameter(Mandatory)][string] $FilePath,
        [Parameter(Mandatory)][string[]] $Arguments,
        [string] $WorkingDirectory = $RepoRoot,
        [hashtable] $Environment = @{}
    )

    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = $FilePath
    foreach ($arg in $Arguments) { [void]$psi.ArgumentList.Add($arg) }
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    foreach ($entry in $Environment.GetEnumerator()) {
        $psi.Environment[$entry.Key] = [string]$entry.Value
    }

    $process = [System.Diagnostics.Process]::Start($psi)
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    return [pscustomobject]@{
        command = "$FilePath $($Arguments -join ' ')"
        cwd = $WorkingDirectory
        exitCode = $process.ExitCode
        stdout = $stdout
        stderr = $stderr
        text = (($stdout, $stderr) -join "`n").Trim()
    }
}

function Get-JsonFromText {
    param([Parameter(Mandatory)][string] $Text)
    $start = $Text.IndexOf("{")
    if ($start -lt 0) { throw "No JSON object was found in command output." }
    return $Text.Substring($start) | ConvertFrom-Json -Depth 100
}

function Get-HashPrefix {
    param([AllowNull()][string] $Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
        $hash = $sha.ComputeHash($bytes)
        return (($hash | ForEach-Object { $_.ToString("x2") }) -join "").Substring(0, 16)
    } finally {
        $sha.Dispose()
    }
}

function Read-JsonFile {
    param([Parameter(Mandatory)][string] $Path)
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -Depth 100
}

function Get-GoogleServicesSummary {
    param(
        [Parameter(Mandatory)][string] $Path,
        [Parameter(Mandatory)][string] $ExpectedPackage
    )

    $json = Read-JsonFile -Path $Path
    $clients = @($json.client)
    $matching = @($clients | Where-Object {
        $_.client_info.android_client_info.package_name -eq $ExpectedPackage
    })
    $apiKeys = @()
    foreach ($client in $matching) {
        foreach ($key in @($client.api_key)) {
            if (-not [string]::IsNullOrWhiteSpace([string]$key.current_key)) {
                $apiKeys += [string]$key.current_key
            }
        }
    }

    return [pscustomobject]@{
        path = $Path
        exists = Test-Path -LiteralPath $Path -PathType Leaf
        projectId = [string]$json.project_info.project_id
        projectNumber = [string]$json.project_info.project_number
        storageBucket = [string]$json.project_info.storage_bucket
        clientCount = $clients.Count
        matchingClientCount = $matching.Count
        expectedPackage = $ExpectedPackage
        packageNames = @($clients | ForEach-Object { [string]$_.client_info.android_client_info.package_name })
        apiKeyPresent = $apiKeys.Count -gt 0
        apiKeyCount = $apiKeys.Count
        apiKeyHash16 = if ($apiKeys.Count -gt 0) { Get-HashPrefix -Value $apiKeys[0] } else { $null }
        mobileSdkAppId = if ($matching.Count -gt 0) { [string]$matching[0].client_info.mobilesdk_app_id } else { $null }
    }
}

function Find-Executable {
    param([Parameter(Mandatory)][string[]] $Candidates)
    foreach ($candidate in $Candidates) {
        if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
        $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd.Source }
    }
    return $null
}

function Resolve-GoogleServicesFromNode {
    param([Parameter(Mandatory)][string] $AppKey)
    $script = @"
const { resolveGoogleServicesFile } = require('./tools/mobile/sentry-env.js');
const value = resolveGoogleServicesFile('$AppKey', process.env);
if (value) console.log(value);
"@
    $node = Invoke-Captured -FilePath "node" -Arguments @("-e", $script) -WorkingDirectory $RepoRoot
    if ($node.exitCode -ne 0) {
        throw $node.text
    }
    return $node.stdout.Trim()
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " BTHWANI MOBILE FIREBASE PUSH DIAGNOSTIC" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "App:     $AppKey"
Write-Host "Repo:    $RepoRoot"
Write-Host "Report:  $ReportDir`n"

try {
    if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) { throw "Missing manifest: $ManifestPath" }
    if (-not (Test-Path -LiteralPath $ValidatorPath -PathType Leaf)) { throw "Missing Firebase validator: $ValidatorPath" }
    if (-not (Test-Path -LiteralPath $SentryEnvPath -PathType Leaf)) { throw "Missing sentry-env resolver: $SentryEnvPath" }

    $manifest = Read-JsonFile -Path $ManifestPath
    $app = $manifest.apps.$AppKey
    if ($null -eq $app) { throw "Unknown app key: $AppKey" }
    $expectedPackage = [string]$app.androidPackage
    $appDir = Join-Path $RepoRoot "apps\$AppKey\runtime"

    Add-Result -Area "repo" -Check "manifest" -Status "PASS" -Message "mobile manifest resolved" -Data ([pscustomobject]@{
        appKey = $AppKey
        package = $expectedPackage
        slug = [string]$app.slug
        projectId = [string]$app.projectId
        features = @($app.features)
    })

    foreach ($tool in @(
        @{ name = "node"; args = @("-v") },
        @{ name = "pnpm"; args = @("-v") },
        @{ name = "firebase"; args = @("--version") }
    )) {
        try {
            $run = Invoke-Captured -FilePath $tool.name -Arguments $tool.args
            $status = if ($run.exitCode -eq 0) { "PASS" } else { "WARN" }
            Add-Result -Area "tools" -Check $tool.name -Status $status -Message ($run.text.Split("`n") | Select-Object -First 1) -Data ([pscustomobject]@{ exitCode = $run.exitCode })
        } catch {
            Add-Result -Area "tools" -Check $tool.name -Status "WARN" -Message $_.Exception.Message -Data $null
        }
    }

    try {
        $branch = (Invoke-Captured -FilePath "git" -Arguments @("branch", "--show-current")).stdout.Trim()
        $head = (Invoke-Captured -FilePath "git" -Arguments @("rev-parse", "HEAD")).stdout.Trim()
        $status = (Invoke-Captured -FilePath "git" -Arguments @("status", "--short")).stdout.Trim()
        Add-Result -Area "repo" -Check "git-state" -Status (if ($status) { "WARN" } else { "PASS" }) -Message (if ($status) { "working tree has changes" } else { "working tree is clean" }) -Data ([pscustomobject]@{
            branch = $branch
            head = $head
            status = $status
        })
    } catch {
        Add-Result -Area "repo" -Check "git-state" -Status "WARN" -Message $_.Exception.Message -Data $null
    }

    $localSecretsMap = $null
    if (Test-Path -LiteralPath $LocalSecretsJsonPath -PathType Leaf) {
        $localSecretsMap = Read-JsonFile -Path $LocalSecretsJsonPath
        $mapped = [string]$localSecretsMap.$AppKey
        Add-Result -Area "local-secrets" -Check "secrets.local.mobile.json" -Status (if ($mapped) { "PASS" } else { "WARN" }) -Message (if ($mapped) { "app key is mapped" } else { "app key is not mapped" }) -Data ([pscustomobject]@{
            path = $LocalSecretsJsonPath
            mappedPath = $mapped
            mappedPathExists = if ($mapped) { Test-Path -LiteralPath $mapped -PathType Leaf } else { $false }
        })
    } else {
        Add-Result -Area "local-secrets" -Check "secrets.local.mobile.json" -Status "WARN" -Message "local secrets map does not exist" -Data ([pscustomobject]@{ path = $LocalSecretsJsonPath })
    }

    $resolvedGoogleServices = Resolve-GoogleServicesFromNode -AppKey $AppKey
    if ([string]::IsNullOrWhiteSpace($resolvedGoogleServices)) {
        Add-Result -Area "resolver" -Check "resolveGoogleServicesFile" -Status "FAIL" -Message "resolver returned no google-services.json path" -Data $null
    } elseif (-not (Test-Path -LiteralPath $resolvedGoogleServices -PathType Leaf)) {
        Add-Result -Area "resolver" -Check "resolveGoogleServicesFile" -Status "FAIL" -Message "resolver returned a missing path" -Data ([pscustomobject]@{ path = $resolvedGoogleServices })
    } else {
        Add-Result -Area "resolver" -Check "resolveGoogleServicesFile" -Status "PASS" -Message "resolver returned an existing file" -Data ([pscustomobject]@{ path = $resolvedGoogleServices })
    }

    if ($resolvedGoogleServices -and (Test-Path -LiteralPath $resolvedGoogleServices -PathType Leaf)) {
        $validator = Invoke-Captured -FilePath "node" -Arguments @($ValidatorPath, "--file", $resolvedGoogleServices, "--package", $expectedPackage, "--json")
        if ($validator.exitCode -ne 0) {
            Add-Result -Area "firebase-file" -Check "validator" -Status "FAIL" -Message $validator.text -Data ([pscustomobject]@{ path = $resolvedGoogleServices })
        } else {
            $summary = Get-GoogleServicesSummary -Path $resolvedGoogleServices -ExpectedPackage $expectedPackage
            $status = if ($summary.matchingClientCount -gt 0 -and $summary.apiKeyPresent) { "PASS" } else { "FAIL" }
            Add-Result -Area "firebase-file" -Check "google-services.json" -Status $status -Message (if ($status -eq "PASS") { "package and API key are present" } else { "package or API key is missing" }) -Data $summary
        }
    }

    $expoConfig = Invoke-Captured -FilePath "pnpm" -Arguments @("exec", "expo", "config", "--json") -WorkingDirectory $appDir
    if ($expoConfig.exitCode -ne 0) {
        Add-Result -Area "expo-config" -Check "expo config --json" -Status "FAIL" -Message $expoConfig.text -Data ([pscustomobject]@{ cwd = $appDir })
    } else {
        try {
            $config = Get-JsonFromText -Text $expoConfig.text
            $googleServicesFile = [string]$config.android.googleServicesFile
            $configured = [bool]$config.extra.notifications.androidNativeConfigured
            $configFileExists = if ($googleServicesFile) {
                $configPath = if ([System.IO.Path]::IsPathRooted($googleServicesFile)) { $googleServicesFile } else { Join-Path $appDir $googleServicesFile }
                Test-Path -LiteralPath $configPath -PathType Leaf
            } else { $false }
            Add-Result -Area "expo-config" -Check "android.googleServicesFile" -Status (if ($configured -and $googleServicesFile -and $configFileExists) { "PASS" } else { "FAIL" }) -Message (if ($configured -and $googleServicesFile -and $configFileExists) { "Expo config points to an existing Firebase file" } else { "Expo config is not pointing to a usable Firebase file" }) -Data ([pscustomobject]@{
                androidNativeConfigured = $configured
                googleServicesFile = $googleServicesFile
                googleServicesFileExists = $configFileExists
                package = [string]$config.android.package
                projectId = [string]$config.extra.eas.projectId
            })
        } catch {
            Add-Result -Area "expo-config" -Check "parse" -Status "FAIL" -Message $_.Exception.Message -Data ([pscustomobject]@{ raw = $expoConfig.text })
        }
    }

    if ($SkipEas) {
        Add-Result -Area "eas" -Check "env-list" -Status "SKIP" -Message "EAS checks skipped" -Data $null
    } else {
        $easUser = Invoke-Captured -FilePath "pnpm" -Arguments @("dlx", "eas-cli@latest", "whoami") -WorkingDirectory $appDir
        Add-Result -Area "eas" -Check "whoami" -Status (if ($easUser.exitCode -eq 0) { "PASS" } else { "WARN" }) -Message $easUser.text -Data ([pscustomobject]@{ exitCode = $easUser.exitCode })

        $envListAttempts = @(
            @("dlx", "eas-cli@latest", "env:list", "development", "--json", "--non-interactive"),
            @("dlx", "eas-cli@latest", "env:list", "--environment", "development", "--json", "--non-interactive")
        )
        $envListed = $false
        foreach ($args in $envListAttempts) {
            if ($envListed) { continue }
            $envList = Invoke-Captured -FilePath "pnpm" -Arguments $args -WorkingDirectory $appDir
            if ($envList.exitCode -eq 0) {
                $envListed = $true
                $names = @()
                try {
                    $parsedEnv = Get-JsonFromText -Text $envList.text
                    foreach ($item in @($parsedEnv)) {
                        if ($item.name) { $names += [string]$item.name }
                    }
                } catch {
                    # Some EAS versions do not return stable JSON here; raw text is still kept in the report.
                }
                Add-Result -Area "eas" -Check "env-list" -Status "PASS" -Message "EAS environment list command succeeded" -Data ([pscustomobject]@{
                    attemptedCommand = "pnpm $($args -join ' ')"
                    hasGoogleServicesJson = $names -contains "GOOGLE_SERVICES_JSON"
                    hasGoogleMapsAndroidApiKey = $names -contains "GOOGLE_MAPS_ANDROID_API_KEY"
                    variableNames = $names
                    raw = $envList.text
                })
            }
        }
        if (-not $envListed) {
            Add-Result -Area "eas" -Check "env-list" -Status "WARN" -Message "EAS env:list failed or is unsupported by this CLI/account state" -Data $null
        }
    }

    if ($SkipPrebuild) {
        Add-Result -Area "prebuild" -Check "android-native-output" -Status "SKIP" -Message "prebuild check skipped" -Data $null
    } else {
        $androidDir = Join-Path $appDir "android"
        if (Test-Path -LiteralPath $androidDir) {
            Add-Result -Area "prebuild" -Check "clean-state" -Status "FAIL" -Message "android/ already exists; remove it or rerun after cleaning because CNG verification requires a clean app" -Data ([pscustomobject]@{ path = $androidDir })
        } else {
            $prebuild = Invoke-Captured -FilePath "pnpm" -Arguments @("exec", "expo", "prebuild", "--clean", "--no-install", "--platform", "android") -WorkingDirectory $appDir
            if ($prebuild.exitCode -ne 0) {
                Add-Result -Area "prebuild" -Check "expo-prebuild" -Status "FAIL" -Message $prebuild.text -Data ([pscustomobject]@{ cwd = $appDir })
            } else {
                $generatedFiles = @(Get-ChildItem -LiteralPath $androidDir -Recurse -Filter "google-services.json" -ErrorAction SilentlyContinue)
                if ($generatedFiles.Count -eq 0) {
                    Add-Result -Area "prebuild" -Check "google-services-copy" -Status "FAIL" -Message "prebuild did not copy google-services.json into android output" -Data ([pscustomobject]@{ androidDir = $androidDir })
                } else {
                    $summaries = @()
                    foreach ($file in $generatedFiles) {
                        $summaries += Get-GoogleServicesSummary -Path $file.FullName -ExpectedPackage $expectedPackage
                    }
                    $ok = @($summaries | Where-Object { $_.matchingClientCount -gt 0 -and $_.apiKeyPresent }).Count -gt 0
                    Add-Result -Area "prebuild" -Check "google-services-copy" -Status (if ($ok) { "PASS" } else { "FAIL" }) -Message (if ($ok) { "native prebuild contains google-services.json with matching package and API key" } else { "native prebuild google-services.json is missing package or API key" }) -Data $summaries
                }
            }

            if (-not $KeepNativeOutput) {
                Remove-Item -LiteralPath $androidDir -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    }

    if ($SkipAdb) {
        Add-Result -Area "installed-apk" -Check "adb" -Status "SKIP" -Message "ADB checks skipped" -Data $null
    } else {
        $resolvedAdb = if ($AdbPath) { $AdbPath } else { Find-Executable -Candidates @("adb", "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe") }
        if (-not $resolvedAdb) {
            Add-Result -Area "installed-apk" -Check "adb" -Status "WARN" -Message "adb was not found" -Data $null
        } else {
            $device = Invoke-Captured -FilePath $resolvedAdb -Arguments @("devices")
            $packagePath = Invoke-Captured -FilePath $resolvedAdb -Arguments @("shell", "pm", "path", $expectedPackage)
            if ($packagePath.exitCode -ne 0 -or [string]::IsNullOrWhiteSpace($packagePath.stdout)) {
                Add-Result -Area "installed-apk" -Check "package-installed" -Status "WARN" -Message "package is not installed on the connected device or adb cannot read it" -Data ([pscustomobject]@{
                    adb = $resolvedAdb
                    devices = $device.stdout.Trim()
                    package = $expectedPackage
                    output = $packagePath.text
                })
            } else {
                Add-Result -Area "installed-apk" -Check "package-installed" -Status "PASS" -Message "package exists on connected Android device" -Data ([pscustomobject]@{
                    adb = $resolvedAdb
                    devices = $device.stdout.Trim()
                    package = $expectedPackage
                    apkPaths = @($packagePath.stdout.Trim().Split("`n") | ForEach-Object { $_.Trim() })
                })
            }
        }
    }
} catch {
    Add-Result -Area "fatal" -Check "exception" -Status "FAIL" -Message $_.Exception.Message -Data ([pscustomobject]@{ script = $MyInvocation.MyCommand.Path })
} finally {
    $report = [ordered]@{
        generatedAt = (Get-Date).ToString("o")
        appKey = $AppKey
        repoRoot = $RepoRoot
        failures = @($failures)
        warnings = @($warnings)
        results = @($results)
    }
    $report | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $ReportJsonPath -Encoding UTF8

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("BTHWANI MOBILE FIREBASE PUSH DIAGNOSTIC")
    $lines.Add("App: $AppKey")
    $lines.Add("Repo: $RepoRoot")
    $lines.Add("Generated: $($report.generatedAt)")
    $lines.Add("")
    foreach ($row in $results) {
        $lines.Add("[$($row.status)] $($row.area)/$($row.check) - $($row.message)")
    }
    $lines.Add("")
    $lines.Add("Failures: $($failures.Count)")
    foreach ($failure in $failures) { $lines.Add(" - $failure") }
    $lines.Add("Warnings: $($warnings.Count)")
    foreach ($warning in $warnings) { $lines.Add(" - $warning") }
    $lines | Set-Content -LiteralPath $ReportTextPath -Encoding UTF8

    Write-Host "`n============================================================" -ForegroundColor Cyan
    Write-Host " DIAGNOSTIC RESULT" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    $results | Select-Object area, check, status, message | Format-Table -AutoSize
    Write-Host "Text report: $ReportTextPath"
    Write-Host "JSON report: $ReportJsonPath"

    if ($failures.Count -gt 0) {
        Write-Host "`nFAIL: Firebase push configuration chain has blocking failures." -ForegroundColor Red
        foreach ($failure in $failures) { Write-Host " - $failure" -ForegroundColor Red }
        exit 1
    }

    if ($warnings.Count -gt 0) {
        Write-Host "`nWARN: No local blocking failure was found, but warnings need review." -ForegroundColor Yellow
        foreach ($warning in $warnings) { Write-Host " - $warning" -ForegroundColor Yellow }
        exit 2
    }

    Write-Host "`nPASS: local Firebase push configuration chain is consistent for $AppKey." -ForegroundColor Green
}
