# tools/scripts/google-cloud/create-android-maps-api-key.ps1
# Create or update a restricted Android Google Maps API key, optionally upload it
# to EAS, and optionally persist its app-scoped value to an ignored local env file.

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z][a-z0-9-]{4,28}[a-z0-9]$')]
    [string] $ProjectId,

    [ValidateSet('app-client', 'app-partner', 'app-captain', 'app-field')]
    [string] $AppKey = 'app-field',

    [string] $PackageName = 'com.bthwani.field.next',

    [Parameter(Mandatory)]
    [ValidatePattern('^([A-Fa-f0-9]{2}:){19}[A-Fa-f0-9]{2}$')]
    [string] $Sha1Fingerprint,

    [string] $DisplayName = 'bthwani-app-field-android-maps-dev',

    [string] $WriteEnvironmentFile,

    [switch] $ForceNewKey,
    [switch] $UploadToEas,
    [switch] $DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir '..\..\..')).Path
$EasMapsRepairScript = Join-Path $RepoRoot 'tools\scripts\repair-mobile-eas-maps-variable.ps1'
$MapsService = 'maps-android-backend.googleapis.com'

function Write-Step {
    param([Parameter(Mandatory)][string] $Message)
    Write-Host "`n== $Message ==" -ForegroundColor Cyan
}

function Invoke-CommandChecked {
    param(
        [Parameter(Mandatory)][string] $Command,
        [Parameter(Mandatory)][string[]] $Arguments,
        [switch] $AllowFailure,
        [switch] $CaptureOnly
    )

    $rendered = "$Command $($Arguments -join ' ')"
    if ($DryRun) {
        Write-Host "DRY-RUN: $rendered" -ForegroundColor DarkYellow
        return ''
    }

    if (-not $CaptureOnly) {
        Write-Host "> $rendered" -ForegroundColor DarkGray
    }
    $output = & $Command @Arguments 2>&1
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    $text = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
    if ($text -and -not $CaptureOnly) { Write-Host $text }
    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "Command failed with exit code ${exitCode}: $rendered`n$text"
    }
    return $text
}

function Test-GcloudInstalled {
    $cmd = Get-Command gcloud -ErrorAction SilentlyContinue
    if (-not $cmd) {
        throw @'
gcloud CLI is not installed or not on PATH.
Install Google Cloud CLI, restart PowerShell, then rerun this script:
https://cloud.google.com/sdk/docs/install
'@
    }
}

function ConvertFrom-JsonSafe {
    param([Parameter(Mandatory)][string] $Text)
    $start = $Text.IndexOf('[')
    $objectStart = $Text.IndexOf('{')
    if ($start -lt 0 -or ($objectStart -ge 0 -and $objectStart -lt $start)) {
        $start = $objectStart
    }
    if ($start -lt 0) { throw 'Expected JSON output but no JSON start was found.' }
    return $Text.Substring($start) | ConvertFrom-Json -Depth 100
}

function Get-KeyNameByDisplayName {
    param(
        [Parameter(Mandatory)][string] $Name,
        [Parameter(Mandatory)][string] $Project
    )

    $json = Invoke-CommandChecked -Command 'gcloud' -Arguments @(
        'services', 'api-keys', 'list',
        '--project', $Project,
        '--format=json'
    ) -CaptureOnly
    if ([string]::IsNullOrWhiteSpace($json)) { return $null }
    $items = @(ConvertFrom-JsonSafe -Text $json)
    $match = $items | Where-Object { $_.displayName -eq $Name } | Select-Object -First 1
    if ($null -eq $match) { return $null }
    return [string]$match.name
}

function Get-KeyString {
    param([Parameter(Mandatory)][string] $KeyName)

    $json = Invoke-CommandChecked -Command 'gcloud' -Arguments @(
        'services', 'api-keys', 'get-key-string', $KeyName,
        '--format=json'
    ) -CaptureOnly
    $parsed = ConvertFrom-JsonSafe -Text $json
    if ($parsed.keyString) { return [string]$parsed.keyString }
    if ($parsed.response.keyString) { return [string]$parsed.response.keyString }
    throw 'Unable to read the API key string from gcloud output.'
}

function Get-CreatedKeyName {
    param([Parameter(Mandatory)][object] $Payload)
    if ($Payload.name) { return [string]$Payload.name }
    if ($Payload.response.name) { return [string]$Payload.response.name }
    if ($Payload.result.name) { return [string]$Payload.result.name }
    throw 'Unable to read the API key resource name from gcloud output.'
}

function Get-CreatedKeyString {
    param([Parameter(Mandatory)][object] $Payload)
    if ($Payload.keyString) { return [string]$Payload.keyString }
    if ($Payload.response.keyString) { return [string]$Payload.response.keyString }
    if ($Payload.result.keyString) { return [string]$Payload.result.keyString }
    return $null
}

function Assert-PackageForApp {
    param(
        [Parameter(Mandatory)][string] $Key,
        [Parameter(Mandatory)][string] $Package
    )

    $expected = @{
        'app-client'  = 'com.bthwani.client.next'
        'app-partner' = 'com.bthwani.partner.next'
        'app-captain' = 'com.bthwani.captain.next'
        'app-field'   = 'com.bthwani.field.next'
    }[$Key]

    if ($Package -ne $expected) {
        throw "$Key expects package '$expected', but received '$Package'."
    }
}

function Set-EnvironmentFileValue {
    param(
        [Parameter(Mandatory)][string] $Path,
        [Parameter(Mandatory)][string] $Name,
        [Parameter(Mandatory)][string] $Value
    )

    $resolvedPath = [System.IO.Path]::GetFullPath($Path)
    $parent = Split-Path -Parent $resolvedPath
    if (-not [string]::IsNullOrWhiteSpace($parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }

    $lines = if (Test-Path -LiteralPath $resolvedPath -PathType Leaf) {
        @(Get-Content -LiteralPath $resolvedPath)
    } else {
        @()
    }
    $prefix = "$Name="
    $updated = $false
    $next = foreach ($line in $lines) {
        if ($line.TrimStart().StartsWith($prefix, [System.StringComparison]::Ordinal)) {
            $updated = $true
            "$Name=$Value"
        } else {
            $line
        }
    }
    if (-not $updated) {
        $next = @($next) + "$Name=$Value"
    }
    $next | Set-Content -LiteralPath $resolvedPath -Encoding UTF8
    return $resolvedPath
}

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' BTHWANI ANDROID GOOGLE MAPS API KEY AUTOMATION' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "Project:      $ProjectId"
Write-Host "App:          $AppKey"
Write-Host "Package:      $PackageName"
Write-Host "SHA-1:        $Sha1Fingerprint"
Write-Host "Display name: $DisplayName"
Write-Host "Upload EAS:   $UploadToEas"
Write-Host "Local env:    $WriteEnvironmentFile"
Write-Host "Dry run:      $DryRun"

Assert-PackageForApp -Key $AppKey -Package $PackageName
Test-GcloudInstalled

Write-Step 'Select project and enable required services'
Invoke-CommandChecked -Command 'gcloud' -Arguments @('config', 'set', 'project', $ProjectId) | Out-Null
Invoke-CommandChecked -Command 'gcloud' -Arguments @(
    'services', 'enable',
    'apikeys.googleapis.com',
    $MapsService,
    '--project', $ProjectId
) | Out-Null

$keyName = $null
$keyString = $null

if (-not $ForceNewKey) {
    Write-Step 'Search for an existing API key with the same display name'
    $keyName = Get-KeyNameByDisplayName -Name $DisplayName -Project $ProjectId
}

if ($keyName) {
    Write-Step 'Update existing key restrictions'
    Invoke-CommandChecked -Command 'gcloud' -Arguments @(
        'services', 'api-keys', 'update', $keyName,
        '--api-target', "service=$MapsService",
        '--allowed-application', "sha1_fingerprint=$Sha1Fingerprint,package_name=$PackageName",
        '--project', $ProjectId,
        '--format=json'
    ) | Out-Null
    if (-not $DryRun) { $keyString = Get-KeyString -KeyName $keyName }
} else {
    Write-Step 'Create a new restricted Android Maps API key'
    $createOutput = Invoke-CommandChecked -Command 'gcloud' -Arguments @(
        'services', 'api-keys', 'create',
        '--display-name', $DisplayName,
        '--api-target', "service=$MapsService",
        '--allowed-application', "sha1_fingerprint=$Sha1Fingerprint,package_name=$PackageName",
        '--project', $ProjectId,
        '--format=json'
    ) -CaptureOnly
    if (-not $DryRun) {
        $payload = ConvertFrom-JsonSafe -Text $createOutput
        $keyName = Get-CreatedKeyName -Payload $payload
        $keyString = Get-CreatedKeyString -Payload $payload
        if ([string]::IsNullOrWhiteSpace($keyString)) {
            $keyString = Get-KeyString -KeyName $keyName
        }
    }
}

if ($DryRun) {
    Write-Host "`nDRY-RUN complete. No API key was created or updated." -ForegroundColor Yellow
    return
}

if ([string]::IsNullOrWhiteSpace($keyName) -or [string]::IsNullOrWhiteSpace($keyString)) {
    throw 'API key creation/update did not produce a usable key resource and key string.'
}

Write-Step 'Restricted API key created or updated'
Write-Host "Key resource: $keyName"
Write-Host 'Key string: intentionally not printed.'

$scopedVariableName = "GOOGLE_MAPS_ANDROID_API_KEY_$($AppKey.Replace('-', '_').ToUpperInvariant())"
[Environment]::SetEnvironmentVariable($scopedVariableName, $keyString, 'Process')

if (-not [string]::IsNullOrWhiteSpace($WriteEnvironmentFile)) {
    $writtenPath = Set-EnvironmentFileValue -Path $WriteEnvironmentFile -Name $scopedVariableName -Value $keyString
    Write-Host "Ignored local environment updated: $writtenPath" -ForegroundColor Green
}

if ($UploadToEas) {
    if (-not (Test-Path -LiteralPath $EasMapsRepairScript -PathType Leaf)) {
        throw "EAS maps repair script was not found: $EasMapsRepairScript"
    }

    Write-Step 'Upload key to EAS development environment'
    & pwsh -NoProfile -ExecutionPolicy Bypass -File $EasMapsRepairScript -AppKey $AppKey -ApiKey $keyString
    if ($LASTEXITCODE -ne 0) {
        throw "EAS upload script failed with exit code $LASTEXITCODE."
    }
}

Write-Host "`nPASS: Android Maps API key is restricted to $PackageName / $Sha1Fingerprint / $MapsService." -ForegroundColor Green
