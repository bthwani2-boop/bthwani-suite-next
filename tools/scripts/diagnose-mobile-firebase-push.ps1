# tools/scripts/diagnose-mobile-firebase-push.ps1
# Read-only Android Firebase push diagnostic for local config, Expo config,
# clean native prebuild, EAS environment metadata, and the installed APK.

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
$LocalSecretsJsonPath = Join-Path $RepoRoot "secrets.local.mobile.json"
$ReportRoot = Join-Path $RepoRoot ".tmp\mobile-firebase-diagnostics"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportDir = Join-Path $ReportRoot "$Timestamp-$AppKey"
$ReportJsonPath = Join-Path $ReportDir "result.json"
$ReportTextPath = Join-Path $ReportDir "result.txt"
$PulledApkPath = Join-Path $ReportDir "$AppKey-base.apk"
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
        [string] $WorkingDirectory = $RepoRoot
    )

    Push-Location -LiteralPath $WorkingDirectory
    try {
        $captured = [System.Collections.Generic.List[string]]::new()
        $exitCode = 0
        $previousErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            $global:LASTEXITCODE = 0
            $raw = & $FilePath @Arguments 2>&1
            foreach ($item in @($raw)) {
                if ($null -ne $item) { $captured.Add([string]$item) }
            }
            $exitCode = [int]$global:LASTEXITCODE
        } catch {
            $captured.Add($_.Exception.Message)
            $exitCode = 1
        } finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }

        $text = ($captured -join "`n").Trim()
        return [pscustomobject]@{
            command = "$FilePath $($Arguments -join ' ')"
            cwd = $WorkingDirectory
            exitCode = $exitCode
            stdout = $text
            stderr = ""
            text = $text
        }
    } finally {
        Pop-Location
    }
}

function Convert-CommandJson {
    param([Parameter(Mandatory)][string] $Text)

    $trimmed = $Text.Trim()
    if (-not $trimmed) { throw "Command returned no JSON." }

    try {
        return $trimmed | ConvertFrom-Json -Depth 100
    } catch {
        $objectStart = $trimmed.IndexOf("{")
        $arrayStart = $trimmed.IndexOf("[")
        $starts = @($objectStart, $arrayStart | Where-Object { $_ -ge 0 } | Sort-Object)
        foreach ($start in $starts) {
            if ($start -lt 0) { continue }
            try {
                return $trimmed.Substring($start) | ConvertFrom-Json -Depth 100
            } catch {
                continue
            }
        }
    }

    throw "No valid JSON object or array was found in command output."
}

function Read-JsonFile {
    param([Parameter(Mandatory)][string] $Path)
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -Depth 100
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
            $currentKey = [string]$key.current_key
            if (-not [string]::IsNullOrWhiteSpace($currentKey)) { $apiKeys += $currentKey }
        }
    }

    $apiKeyHash = $null
    if ($apiKeys.Count -gt 0) { $apiKeyHash = Get-HashPrefix -Value $apiKeys[0] }

    $mobileSdkAppId = $null
    if ($matching.Count -gt 0) { $mobileSdkAppId = [string]$matching[0].client_info.mobilesdk_app_id }

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
        apiKeyHash16 = $apiKeyHash
        mobileSdkAppId = $mobileSdkAppId
    }
}

function Find-Executable {
    param([Parameter(Mandatory)][string[]] $Candidates)
    foreach ($candidate in $Candidates) {
        if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
        $command = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($command) { return $command.Source }
    }
    return $null
}

function Find-Aapt2 {
    $sdkRoot = Join-Path $env:LOCALAPPDATA "Android\Sdk\build-tools"
    if (-not (Test-Path -LiteralPath $sdkRoot -PathType Container)) { return $null }
    $candidates = @(Get-ChildItem -LiteralPath $sdkRoot -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        ForEach-Object { Join-Path $_.FullName "aapt2.exe" } |
        Where-Object { Test-Path -LiteralPath $_ -PathType Leaf })
    if ($candidates.Count -gt 0) { return $candidates[0] }
    return $null
}

function Resolve-GoogleServicesFromNode {
    param([Parameter(Mandatory)][string] $TargetAppKey)

    $nodeScript = @"
const { resolveGoogleServicesFile } = require('./tools/mobile/sentry-env.js');
const value = resolveGoogleServicesFile('$TargetAppKey', process.env);
if (value) console.log(value);
"@
    $node = Invoke-Captured -FilePath "node" -Arguments @("-e", $nodeScript) -WorkingDirectory $RepoRoot
    if ($node.exitCode -ne 0) { throw $node.text }
    return $node.stdout.Trim()
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " BTHWANI MOBILE FIREBASE PUSH DIAGNOSTIC" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "App:     $AppKey"
Write-Host "Repo:    $RepoRoot"
Write-Host "Report:  $ReportDir`n"

try {
    foreach ($requiredPath in @($ManifestPath, $ValidatorPath)) {
        if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
            throw "Missing required file: $requiredPath"
        }
    }

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
        $run = Invoke-Captured -FilePath $tool.name -Arguments $tool.args
        $toolStatus = "WARN"
        if ($run.exitCode -eq 0) { $toolStatus = "PASS" }
        $firstLine = ($run.text.Split("`n") | Select-Object -First 1)
        Add-Result -Area "tools" -Check $tool.name -Status $toolStatus -Message $firstLine -Data ([pscustomobject]@{ exitCode = $run.exitCode })
    }

    $branchRun = Invoke-Captured -FilePath "git" -Arguments @("branch", "--show-current")
    $headRun = Invoke-Captured -FilePath "git" -Arguments @("rev-parse", "HEAD")
    $statusRun = Invoke-Captured -FilePath "git" -Arguments @("status", "--short")
    $workingTreeStatus = $statusRun.stdout.Trim()
    $gitCheckStatus = "PASS"
    $gitMessage = "working tree is clean"
    if ($workingTreeStatus) {
        $gitCheckStatus = "WARN"
        $gitMessage = "working tree has changes"
    }
    Add-Result -Area "repo" -Check "git-state" -Status $gitCheckStatus -Message $gitMessage -Data ([pscustomobject]@{
        branch = $branchRun.stdout.Trim()
        head = $headRun.stdout.Trim()
        status = $workingTreeStatus
    })

    $mappedPath = $null
    $mappedPathExists = $false
    if (Test-Path -LiteralPath $LocalSecretsJsonPath -PathType Leaf) {
        $localSecretsMap = Read-JsonFile -Path $LocalSecretsJsonPath
        $property = $localSecretsMap.PSObject.Properties[$AppKey]
        if ($null -ne $property) { $mappedPath = [string]$property.Value }
        if ($mappedPath) { $mappedPathExists = Test-Path -LiteralPath $mappedPath -PathType Leaf }

        $mapStatus = "WARN"
        $mapMessage = "app key is not mapped to an existing file"
        if ($mappedPath -and $mappedPathExists) {
            $mapStatus = "PASS"
            $mapMessage = "app key is mapped to an existing file"
        }
        Add-Result -Area "local-secrets" -Check "secrets.local.mobile.json" -Status $mapStatus -Message $mapMessage -Data ([pscustomobject]@{
            path = $LocalSecretsJsonPath
            mappedPath = $mappedPath
            mappedPathExists = $mappedPathExists
        })
    } else {
        Add-Result -Area "local-secrets" -Check "secrets.local.mobile.json" -Status "WARN" -Message "local secrets map does not exist" -Data ([pscustomobject]@{ path = $LocalSecretsJsonPath })
    }

    $resolvedGoogleServices = Resolve-GoogleServicesFromNode -TargetAppKey $AppKey
    if ([string]::IsNullOrWhiteSpace($resolvedGoogleServices)) {
        Add-Result -Area "resolver" -Check "resolveGoogleServicesFile" -Status "FAIL" -Message "resolver returned no google-services.json path" -Data $null
    } elseif (-not (Test-Path -LiteralPath $resolvedGoogleServices -PathType Leaf)) {
        Add-Result -Area "resolver" -Check "resolveGoogleServicesFile" -Status "FAIL" -Message "resolver returned a missing path" -Data ([pscustomobject]@{ path = $resolvedGoogleServices })
    } else {
        Add-Result -Area "resolver" -Check "resolveGoogleServicesFile" -Status "PASS" -Message "resolver returned an existing file" -Data ([pscustomobject]@{ path = $resolvedGoogleServices })

        $validator = Invoke-Captured -FilePath "node" -Arguments @($ValidatorPath, "--file", $resolvedGoogleServices, "--package", $expectedPackage, "--json")
        if ($validator.exitCode -ne 0) {
            Add-Result -Area "firebase-file" -Check "validator" -Status "FAIL" -Message $validator.text -Data ([pscustomobject]@{ path = $resolvedGoogleServices })
        } else {
            $summary = Get-GoogleServicesSummary -Path $resolvedGoogleServices -ExpectedPackage $expectedPackage
            $firebaseStatus = "FAIL"
            $firebaseMessage = "package or API key is missing"
            if ($summary.matchingClientCount -gt 0 -and $summary.apiKeyPresent) {
                $firebaseStatus = "PASS"
                $firebaseMessage = "package and API key are present"
            }
            Add-Result -Area "firebase-file" -Check "google-services.json" -Status $firebaseStatus -Message $firebaseMessage -Data $summary
        }
    }

    $expoConfigRun = Invoke-Captured -FilePath "pnpm" -Arguments @("exec", "expo", "config", "--json") -WorkingDirectory $appDir
    if ($expoConfigRun.exitCode -ne 0) {
        Add-Result -Area "expo-config" -Check "expo config --json" -Status "FAIL" -Message $expoConfigRun.text -Data ([pscustomobject]@{ cwd = $appDir })
    } else {
        try {
            $config = Convert-CommandJson -Text $expoConfigRun.text
            $googleServicesFile = [string]$config.android.googleServicesFile
            $configured = [bool]$config.extra.notifications.androidNativeConfigured
            $configPath = $null
            $configFileExists = $false
            if ($googleServicesFile) {
                if ([System.IO.Path]::IsPathRooted($googleServicesFile)) {
                    $configPath = $googleServicesFile
                } else {
                    $configPath = Join-Path $appDir $googleServicesFile
                }
                $configFileExists = Test-Path -LiteralPath $configPath -PathType Leaf
            }

            $expoStatus = "FAIL"
            $expoMessage = "Expo config is not pointing to a usable Firebase file"
            if ($configured -and $googleServicesFile -and $configFileExists) {
                $expoStatus = "PASS"
                $expoMessage = "Expo config points to an existing Firebase file"
            }
            Add-Result -Area "expo-config" -Check "android.googleServicesFile" -Status $expoStatus -Message $expoMessage -Data ([pscustomobject]@{
                androidNativeConfigured = $configured
                googleServicesFile = $googleServicesFile
                resolvedPath = $configPath
                googleServicesFileExists = $configFileExists
                package = [string]$config.android.package
                projectId = [string]$config.extra.eas.projectId
            })
        } catch {
            Add-Result -Area "expo-config" -Check "parse" -Status "FAIL" -Message $_.Exception.Message -Data ([pscustomobject]@{ output = $expoConfigRun.text })
        }
    }

    if ($SkipEas) {
        Add-Result -Area "eas" -Check "environment" -Status "SKIP" -Message "EAS checks skipped" -Data $null
    } else {
        $easUser = Invoke-Captured -FilePath "pnpm" -Arguments @("dlx", "eas-cli@latest", "whoami") -WorkingDirectory $appDir
        $whoamiStatus = "WARN"
        if ($easUser.exitCode -eq 0) { $whoamiStatus = "PASS" }
        Add-Result -Area "eas" -Check "whoami" -Status $whoamiStatus -Message $easUser.text -Data ([pscustomobject]@{ exitCode = $easUser.exitCode })

        $envAttempts = @(
            @("dlx", "eas-cli@latest", "env:list", "development", "--json", "--non-interactive"),
            @("dlx", "eas-cli@latest", "env:list", "--environment", "development", "--json", "--non-interactive")
        )
        $envListSucceeded = $false
        $lastEnvError = ""
        foreach ($attempt in $envAttempts) {
            if ($envListSucceeded) { break }
            $envRun = Invoke-Captured -FilePath "pnpm" -Arguments $attempt -WorkingDirectory $appDir
            if ($envRun.exitCode -ne 0) {
                $lastEnvError = $envRun.text
                continue
            }

            try {
                $parsed = Convert-CommandJson -Text $envRun.text
                $items = @($parsed)
                $firebaseVariable = @($items | Where-Object { [string]$_.name -eq "GOOGLE_SERVICES_JSON" }) | Select-Object -First 1
                $mapsVariable = @($items | Where-Object { [string]$_.name -eq "GOOGLE_MAPS_ANDROID_API_KEY" }) | Select-Object -First 1
                $envListSucceeded = $true

                $envStatus = "FAIL"
                $envMessage = "GOOGLE_SERVICES_JSON is absent from the development environment"
                if ($null -ne $firebaseVariable) {
                    $envStatus = "PASS"
                    $envMessage = "GOOGLE_SERVICES_JSON exists in the development environment"
                }

                Add-Result -Area "eas" -Check "env-list" -Status $envStatus -Message $envMessage -Data ([pscustomobject]@{
                    command = "pnpm $($attempt -join ' ')"
                    googleServicesJson = if ($null -ne $firebaseVariable) { [pscustomobject]@{
                        name = [string]$firebaseVariable.name
                        type = [string]$firebaseVariable.type
                        visibility = [string]$firebaseVariable.visibility
                        environment = [string]$firebaseVariable.environment
                    } } else { $null }
                    googleMapsAndroidApiKeyPresent = $null -ne $mapsVariable
                })
            } catch {
                $lastEnvError = $_.Exception.Message
            }
        }

        if (-not $envListSucceeded) {
            Add-Result -Area "eas" -Check "env-list" -Status "WARN" -Message "EAS environment query failed; the remote GraphQL state remains unproven" -Data ([pscustomobject]@{ error = $lastEnvError })
        }
    }

    if ($SkipPrebuild) {
        Add-Result -Area "prebuild" -Check "android-native-output" -Status "SKIP" -Message "prebuild check skipped" -Data $null
    } else {
        $androidDir = Join-Path $appDir "android"
        if (Test-Path -LiteralPath $androidDir) {
            Add-Result -Area "prebuild" -Check "clean-state" -Status "FAIL" -Message "android/ already exists; clean CNG verification requires it to be absent" -Data ([pscustomobject]@{ path = $androidDir })
        } else {
            try {
                $prebuild = Invoke-Captured -FilePath "pnpm" -Arguments @("exec", "expo", "prebuild", "--clean", "--no-install", "--platform", "android") -WorkingDirectory $appDir
                if ($prebuild.exitCode -ne 0) {
                    Add-Result -Area "prebuild" -Check "expo-prebuild" -Status "FAIL" -Message $prebuild.text -Data ([pscustomobject]@{ cwd = $appDir })
                } else {
                    $generatedFiles = @(Get-ChildItem -LiteralPath $androidDir -Recurse -Filter "google-services.json" -ErrorAction SilentlyContinue)
                    if ($generatedFiles.Count -eq 0) {
                        Add-Result -Area "prebuild" -Check "google-services-copy" -Status "FAIL" -Message "prebuild did not copy google-services.json into Android output" -Data ([pscustomobject]@{ androidDir = $androidDir })
                    } else {
                        $summaries = @()
                        foreach ($file in $generatedFiles) {
                            $summaries += Get-GoogleServicesSummary -Path $file.FullName -ExpectedPackage $expectedPackage
                        }
                        $validNativeFiles = @($summaries | Where-Object { $_.matchingClientCount -gt 0 -and $_.apiKeyPresent })
                        $nativeStatus = "FAIL"
                        $nativeMessage = "native prebuild Firebase file is missing package or API key"
                        if ($validNativeFiles.Count -gt 0) {
                            $nativeStatus = "PASS"
                            $nativeMessage = "native prebuild contains matching package and API key"
                        }
                        Add-Result -Area "prebuild" -Check "google-services-copy" -Status $nativeStatus -Message $nativeMessage -Data $summaries
                    }
                }
            } finally {
                if (-not $KeepNativeOutput) {
                    Remove-Item -LiteralPath $androidDir -Recurse -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }

    if ($SkipAdb) {
        Add-Result -Area "installed-apk" -Check "adb" -Status "SKIP" -Message "ADB checks skipped" -Data $null
    } else {
        $adbCandidates = @()
        if ($AdbPath) { $adbCandidates += $AdbPath }
        $adbCandidates += "adb"
        $adbCandidates += (Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe")
        $resolvedAdb = Find-Executable -Candidates $adbCandidates

        if (-not $resolvedAdb) {
            Add-Result -Area "installed-apk" -Check "adb" -Status "WARN" -Message "adb was not found" -Data $null
        } else {
            $deviceRun = Invoke-Captured -FilePath $resolvedAdb -Arguments @("devices")
            $packageRun = Invoke-Captured -FilePath $resolvedAdb -Arguments @("shell", "pm", "path", $expectedPackage)
            $packageOutput = $packageRun.stdout.Trim()
            if ($packageRun.exitCode -ne 0 -or -not $packageOutput) {
                Add-Result -Area "installed-apk" -Check "package-installed" -Status "WARN" -Message "package is not installed on the connected device or ADB cannot read it" -Data ([pscustomobject]@{
                    adb = $resolvedAdb
                    devices = $deviceRun.stdout
                    package = $expectedPackage
                    output = $packageRun.text
                })
            } else {
                $remoteApk = ($packageOutput.Split("`n") | ForEach-Object { $_.Trim() } | Where-Object { $_ -like "package:*base.apk" } | Select-Object -First 1)
                if (-not $remoteApk) {
                    $remoteApk = ($packageOutput.Split("`n") | ForEach-Object { $_.Trim() } | Select-Object -First 1)
                }
                $remoteApk = $remoteApk -replace "^package:", ""

                $pullRun = Invoke-Captured -FilePath $resolvedAdb -Arguments @("pull", $remoteApk, $PulledApkPath)
                if ($pullRun.exitCode -ne 0 -or -not (Test-Path -LiteralPath $PulledApkPath -PathType Leaf)) {
                    Add-Result -Area "installed-apk" -Check "apk-pull" -Status "WARN" -Message "installed APK exists but could not be pulled for resource inspection" -Data ([pscustomobject]@{
                        package = $expectedPackage
                        remoteApk = $remoteApk
                        output = $pullRun.text
                    })
                } else {
                    Add-Result -Area "installed-apk" -Check "apk-pull" -Status "PASS" -Message "installed base APK was pulled" -Data ([pscustomobject]@{
                        package = $expectedPackage
                        remoteApk = $remoteApk
                        localApk = $PulledApkPath
                        sizeBytes = (Get-Item -LiteralPath $PulledApkPath).Length
                    })

                    $aapt2 = Find-Aapt2
                    if (-not $aapt2) {
                        Add-Result -Area "installed-apk" -Check "firebase-resources" -Status "WARN" -Message "aapt2 was not found; APK Firebase resources could not be proven" -Data $null
                    } else {
                        $resourceRun = Invoke-Captured -FilePath $aapt2 -Arguments @("dump", "resources", $PulledApkPath)
                        $hasGoogleAppId = $resourceRun.text -match "google_app_id"
                        $hasGoogleApiKey = $resourceRun.text -match "google_api_key"
                        $hasSenderId = $resourceRun.text -match "gcm_defaultSenderId"
                        $apkResourceStatus = "FAIL"
                        $apkResourceMessage = "installed APK is missing Firebase-generated Android resources"
                        if ($hasGoogleAppId -and $hasGoogleApiKey -and $hasSenderId) {
                            $apkResourceStatus = "PASS"
                            $apkResourceMessage = "installed APK contains Firebase app id, API key, and sender id resources"
                        }
                        Add-Result -Area "installed-apk" -Check "firebase-resources" -Status $apkResourceStatus -Message $apkResourceMessage -Data ([pscustomobject]@{
                            aapt2 = $aapt2
                            googleAppIdPresent = $hasGoogleAppId
                            googleApiKeyPresent = $hasGoogleApiKey
                            senderIdPresent = $hasSenderId
                        })
                    }
                }
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
        Write-Host "`nWARN: no local blocking failure was found, but warnings need review." -ForegroundColor Yellow
        foreach ($warning in $warnings) { Write-Host " - $warning" -ForegroundColor Yellow }
        exit 2
    }

    Write-Host "`nPASS: Firebase push configuration chain is consistent for $AppKey." -ForegroundColor Green
}
