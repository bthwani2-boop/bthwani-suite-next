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

function Normalize-AllowedReferrers {
    param([Parameter(Mandatory)][string[]] $Referrers)

    $normalized = [System.Collections.Generic.List[string]]::new()
    $seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)

    foreach ($entry in $Referrers) {
        if ([string]::IsNullOrWhiteSpace($entry)) {
            throw 'Allowed referrers cannot contain an empty value.'
        }

        # pwsh -File receives comma-separated array syntax as one native argument.
        # Accept that representation as well as a real PowerShell string array.
        foreach ($candidate in ([string]$entry -split ',')) {
            $value = $candidate.Trim()
            while ($value.Length -ge 2 -and (
                ($value.StartsWith('"') -and $value.EndsWith('"')) -or
                ($value.StartsWith("'") -and $value.EndsWith("'"))
            )) {
                $value = $value.Substring(1, $value.Length - 2).Trim()
            }

            if ([string]::IsNullOrWhiteSpace($value)) {
                throw 'Allowed referrers cannot contain an empty value.'
            }
            if ($value -notmatch '^https?://[^\s]+$') {
                throw "Allowed referrer must start with http:// or https:// and contain no whitespace: $value"
            }
            if ($seen.Add($value)) {
                [void] $normalized.Add($value)
            }
        }
    }

    if ($normalized.Count -eq 0) {
        throw 'At least one allowed referrer is required.'
    }
    return [string[]] $normalized.ToArray()
}

function Get-BalancedJsonDocument {
    param(
        [Parameter(Mandatory)][string] $Text,
        [Parameter(Mandatory)][int] $Start
    )

    if ($Start -lt 0 -or $Start -ge $Text.Length) { return $null }
    $first = $Text[$Start]
    if ($first -ne '{' -and $first -ne '[') { return $null }

    $stack = [System.Collections.Generic.Stack[char]]::new()
    $inString = $false
    $escaped = $false

    for ($index = $Start; $index -lt $Text.Length; $index++) {
        $char = $Text[$index]

        if ($inString) {
            if ($escaped) {
                $escaped = $false
            } elseif ($char -eq '\') {
                $escaped = $true
            } elseif ($char -eq '"') {
                $inString = $false
            }
            continue
        }

        if ($char -eq '"') {
            $inString = $true
            continue
        }

        if ($char -eq '{' -or $char -eq '[') {
            $stack.Push($char)
            continue
        }

        if ($char -eq '}' -or $char -eq ']') {
            if ($stack.Count -eq 0) { return $null }
            $opening = $stack.Peek()
            $expected = if ($opening -eq '{') { '}' } else { ']' }
            if ($char -ne $expected) { return $null }
            [void] $stack.Pop()
            if ($stack.Count -eq 0) {
                return $Text.Substring($Start, $index - $Start + 1)
            }
        }
    }

    return $null
}

function ConvertFrom-JsonSafe {
    param([Parameter(Mandatory)][string] $Text)

    $lastError = $null
    for ($index = 0; $index -lt $Text.Length; $index++) {
        $char = $Text[$index]
        if ($char -ne '{' -and $char -ne '[') { continue }

        $candidate = Get-BalancedJsonDocument -Text $Text -Start $index
        if ([string]::IsNullOrWhiteSpace($candidate)) { continue }

        try {
            return $candidate | ConvertFrom-Json -Depth 100
        } catch {
            $lastError = $_.Exception.Message
        }
    }

    $previewLength = [Math]::Min(1000, $Text.Length)
    $preview = if ($previewLength -gt 0) { $Text.Substring(0, $previewLength) } else { '<empty>' }
    throw "Expected parseable JSON in gcloud output. Last parse error: $lastError`nOutput preview:`n$preview"
}

function Get-KeyNamesByDisplayName {
    param(
        [Parameter(Mandatory)][string] $Name,
        [Parameter(Mandatory)][string] $Project
    )

    $text = Invoke-CommandChecked -Command 'gcloud' -Arguments @(
        'services', 'api-keys', 'list',
        '--project', $Project,
        '--filter', "displayName='$Name'",
        '--format=value(name)'
    ) -CaptureOnly

    if ([string]::IsNullOrWhiteSpace($text)) { return @() }
    return @(
        $text -split '\r?\n' |
            ForEach-Object { $_.Trim() } |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
}

function Get-KeyNameByDisplayName {
    param(
        [Parameter(Mandatory)][string] $Name,
        [Parameter(Mandatory)][string] $Project
    )

    $matches = @(Get-KeyNamesByDisplayName -Name $Name -Project $Project)
    if ($matches.Count -gt 1) {
        throw "Multiple API keys use display name '$Name'. Refusing an ambiguous update; keep exactly one governed browser Maps key."
    }
    if ($matches.Count -eq 0) { return $null }
    return [string] $matches[0]
}

function Get-KeyString {
    param([Parameter(Mandatory)][string] $KeyName)

    $text = Invoke-CommandChecked -Command 'gcloud' -Arguments @(
        'services', 'api-keys', 'get-key-string', $KeyName,
        '--format=value(keyString)'
    ) -CaptureOnly
    $value = ([string]$text).Trim()

    if ([string]::IsNullOrWhiteSpace($value)) {
        $json = Invoke-CommandChecked -Command 'gcloud' -Arguments @(
            'services', 'api-keys', 'get-key-string', $KeyName,
            '--format=json'
        ) -CaptureOnly
        $parsed = ConvertFrom-JsonSafe -Text $json
        if ($parsed.keyString) { $value = [string]$parsed.keyString }
        elseif ($parsed.response.keyString) { $value = [string]$parsed.response.keyString }
    }

    $value = ([string]$value).Trim()
    if ($value -notmatch '^AIza[0-9A-Za-z_-]{20,}$') {
        throw 'Unable to read a usable Google API key string from gcloud output.'
    }
    return $value
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

$AllowedReferrers = Normalize-AllowedReferrers -Referrers $AllowedReferrers

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
        try {
            $payload = ConvertFrom-JsonSafe -Text $createOutput
            $keyName = Get-CreatedKeyName -Payload $payload
            $keyString = Get-CreatedKeyString -Payload $payload
        } catch {
            if ($ForceNewKey) { throw }
            # Some gcloud versions emit operation progress around the result.
            # Re-listing by the unique governed display name is deterministic.
            $keyName = Get-KeyNameByDisplayName -Name $DisplayName -Project $ProjectId
            if ([string]::IsNullOrWhiteSpace($keyName)) { throw }
        }

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
    $writtenPath = Set-EnvironmentFileValue -Path $WriteEnvironmentFile -Name $EnvironmentVariableName -Value $keyString
    Write-Host "Local ignored environment file updated: $writtenPath" -ForegroundColor Green
}

Write-Host "`nPASS: browser key is restricted to Maps JavaScript API and the approved referrers." -ForegroundColor Green
