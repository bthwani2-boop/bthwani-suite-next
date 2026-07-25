# tools/scripts/google-cloud/create-browser-maps-api-key.ps1
# Create or update a Maps JavaScript API browser key restricted to approved HTTP referrers.

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z][a-z0-9-]{4,28}[a-z0-9]$')]
    [string] $ProjectId,

    [string] $DisplayName = 'bthwani-control-panel-browser-maps-development',

    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string[]] $AllowedReferrers,

    [string] $EnvironmentVariableName = 'NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY',

    [string] $WriteEnvironmentFile,

    [switch] $ForceNewKey,
    [switch] $DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$MapsJavaScriptService = 'maps-backend.googleapis.com'

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

function Assert-CommandExists {
    param([Parameter(Mandatory)][string] $Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command is not installed or not on PATH: $Name"
    }
}

function ConvertFrom-JsonSafe {
    param([Parameter(Mandatory)][string] $Text)
    $arrayStart = $Text.IndexOf('[')
    $objectStart = $Text.IndexOf('{')
    $start = if ($arrayStart -ge 0 -and ($objectStart -lt 0 -or $arrayStart -lt $objectStart)) {
        $arrayStart
    } else {
        $objectStart
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

function Assert-AllowedReferrers {
    param([Parameter(Mandatory)][string[]] $Referrers)

    foreach ($referrer in $Referrers) {
        if ([string]::IsNullOrWhiteSpace($referrer)) {
            throw 'Allowed referrers cannot contain an empty value.'
        }
        if ($referrer -notmatch '^https?://') {
            throw "Allowed referrer must start with http:// or https://: $referrer"
        }
    }
}

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' BTHWANI CONTROL-PANEL GOOGLE MAPS BROWSER KEY' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "Project:        $ProjectId"
Write-Host "Display name:   $DisplayName"
Write-Host "Referrers:      $($AllowedReferrers -join ', ')"
Write-Host "Environment:    $EnvironmentVariableName"
Write-Host "Write env file: $WriteEnvironmentFile"
Write-Host "Dry run:        $DryRun"

Assert-CommandExists -Name 'gcloud'
Assert-AllowedReferrers -Referrers $AllowedReferrers

Write-Step 'Select project and enable required services'
Invoke-CommandChecked -Command 'gcloud' -Arguments @('config', 'set', 'project', $ProjectId) | Out-Null
Invoke-CommandChecked -Command 'gcloud' -Arguments @(
    'services', 'enable',
    'apikeys.googleapis.com',
    $MapsJavaScriptService,
    '--project', $ProjectId
) | Out-Null

$keyName = $null
$keyString = $null
if (-not $ForceNewKey) {
    Write-Step 'Search for an existing browser key with the same display name'
    $keyName = Get-KeyNameByDisplayName -Name $DisplayName -Project $ProjectId
}

$referrerArgument = $AllowedReferrers -join ','
if ($keyName) {
    Write-Step 'Update browser key restrictions'
    Invoke-CommandChecked -Command 'gcloud' -Arguments @(
        'services', 'api-keys', 'update', $keyName,
        '--api-target', "service=$MapsJavaScriptService",
        '--allowed-referrers', $referrerArgument,
        '--project', $ProjectId,
        '--format=json'
    ) | Out-Null
    if (-not $DryRun) { $keyString = Get-KeyString -KeyName $keyName }
} else {
    Write-Step 'Create a restricted browser Maps key'
    $createOutput = Invoke-CommandChecked -Command 'gcloud' -Arguments @(
        'services', 'api-keys', 'create',
        '--display-name', $DisplayName,
        '--api-target', "service=$MapsJavaScriptService",
        '--allowed-referrers', $referrerArgument,
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
    Write-Host "`nDRY-RUN complete. No browser API key was created or updated." -ForegroundColor Yellow
    return
}

if ([string]::IsNullOrWhiteSpace($keyName) -or [string]::IsNullOrWhiteSpace($keyString)) {
    throw 'Browser API key creation/update did not produce a usable key.'
}

Write-Step 'Restricted browser key is ready'
Write-Host "Key resource: $keyName"
Write-Host 'Key string: intentionally not printed.'
Write-Host "PowerShell process assignment: `$env:${EnvironmentVariableName} = '<key-string>'" -ForegroundColor Yellow

if (-not [string]::IsNullOrWhiteSpace($WriteEnvironmentFile)) {
    $resolvedPath = [System.IO.Path]::GetFullPath($WriteEnvironmentFile)
    $parent = Split-Path -Parent $resolvedPath
    if (-not [string]::IsNullOrWhiteSpace($parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    "$EnvironmentVariableName=$keyString" | Set-Content -LiteralPath $resolvedPath -Encoding UTF8
    Write-Host "Local ignored environment file written: $resolvedPath" -ForegroundColor Green
}

Write-Host "`nPASS: browser key is restricted to Maps JavaScript API and the approved referrers." -ForegroundColor Green
