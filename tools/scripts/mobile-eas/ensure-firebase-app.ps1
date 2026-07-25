# Internal helper used only by tools/scripts/mobile-eas.ps1.
# Ensures one Android Firebase app and one validated google-services.json.

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('app-client', 'app-partner', 'app-captain', 'app-field')]
    [string] $App,

    [string] $ProjectId = 'bthwani-platform',
    [string] $FirebaseToolsVersion = '15.24.0',
    [string] $SecretsRoot = 'C:\bthwani-secrets\firebase'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir '..\..\..')).Path
$ManifestPath = Join-Path $RepoRoot 'tools\mobile\mobile-apps.manifest.json'
$ValidatorPath = Join-Path $RepoRoot 'tools\mobile\google-services-config.mjs'
$SecretsMapPath = Join-Path $RepoRoot 'secrets.local.mobile.json'
$DestinationDirectory = Join-Path $SecretsRoot $App
$DestinationPath = Join-Path $DestinationDirectory 'google-services.json'

function Assert-File {
    param([Parameter(Mandatory)][string] $Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required file is missing: $Path"
    }
}

function Invoke-Firebase {
    param(
        [Parameter(Mandatory)][string[]] $Arguments,
        [switch] $AllowFailure
    )

    $output = & pnpm dlx "firebase-tools@$FirebaseToolsVersion" @Arguments 2>&1
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    $text = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
    if (-not $AllowFailure -and $exitCode -ne 0) {
        throw "Firebase CLI failed ($exitCode): firebase $($Arguments -join ' ')`n$text"
    }
    return [pscustomobject]@{ ExitCode = $exitCode; Text = $text }
}

function Get-BalancedJson {
    param([Parameter(Mandatory)][string] $Text)

    for ($start = 0; $start -lt $Text.Length; $start++) {
        if ($Text[$start] -notin @('{', '[')) { continue }
        $open = $Text[$start]
        $close = if ($open -eq '{') { '}' } else { ']' }
        $depth = 0
        $inString = $false
        $escaped = $false

        for ($index = $start; $index -lt $Text.Length; $index++) {
            $char = $Text[$index]
            if ($inString) {
                if ($escaped) { $escaped = $false; continue }
                if ($char -eq '\') { $escaped = $true; continue }
                if ($char -eq '"') { $inString = $false }
                continue
            }
            if ($char -eq '"') { $inString = $true; continue }
            if ($char -eq $open) { $depth++ }
            elseif ($char -eq $close) {
                $depth--
                if ($depth -eq 0) {
                    $candidate = $Text.Substring($start, $index - $start + 1)
                    try { return $candidate | ConvertFrom-Json -Depth 100 } catch { break }
                }
            }
        }
    }

    throw 'Firebase CLI output did not contain valid JSON.'
}

function Get-PropertyValue {
    param(
        [AllowNull()] $Object,
        [Parameter(Mandatory)][string[]] $Names
    )
    if ($null -eq $Object) { return $null }
    foreach ($name in $Names) {
        $property = $Object.PSObject.Properties[$name]
        if ($null -ne $property -and $null -ne $property.Value) { return $property.Value }
    }
    return $null
}

function Collect-AppRecords {
    param([AllowNull()] $Node)
    $records = [System.Collections.Generic.List[object]]::new()

    function Visit {
        param([AllowNull()] $Value)
        if ($null -eq $Value -or $Value -is [string] -or $Value -is [ValueType]) { return }
        if ($Value -is [System.Collections.IEnumerable] -and $Value -isnot [pscustomobject]) {
            foreach ($item in $Value) { Visit -Value $item }
            return
        }
        $appId = Get-PropertyValue -Object $Value -Names @('appId', 'app_id')
        $platform = Get-PropertyValue -Object $Value -Names @('platform')
        if (-not [string]::IsNullOrWhiteSpace([string]$appId) -and -not [string]::IsNullOrWhiteSpace([string]$platform)) {
            $records.Add($Value)
        }
        foreach ($property in $Value.PSObject.Properties) { Visit -Value $property.Value }
    }

    Visit -Value $Node
    return @($records)
}

function Get-AppPackage {
    param([Parameter(Mandatory)] $Record)
    return [string](Get-PropertyValue -Object $Record -Names @('namespace', 'packageName', 'package_name', 'androidPackage'))
}

function Get-FirebaseAndroidApps {
    $result = Invoke-Firebase -Arguments @(
        'apps:list', 'ANDROID', '--project', $ProjectId, '--json', '--non-interactive'
    )
    return @(Collect-AppRecords -Node (Get-BalancedJson -Text $result.Text))
}

function Find-AppByPackage {
    param(
        [Parameter(Mandatory)][object[]] $Records,
        [Parameter(Mandatory)][string] $Package
    )
    $matches = @($Records | Where-Object { (Get-AppPackage -Record $_) -eq $Package })
    if ($matches.Count -gt 1) { throw "Firebase contains duplicate Android apps for '$Package'." }
    if ($matches.Count -eq 1) { return $matches[0] }
    return $null
}

function Update-SecretsMap {
    $map = [ordered]@{}
    if (Test-Path -LiteralPath $SecretsMapPath -PathType Leaf) {
        $existing = Get-Content -LiteralPath $SecretsMapPath -Raw | ConvertFrom-Json -Depth 20
        foreach ($property in $existing.PSObject.Properties) { $map[$property.Name] = [string]$property.Value }
    }
    $map[$App] = $DestinationPath
    $map | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $SecretsMapPath -Encoding UTF8
}

Assert-File -Path $ManifestPath
Assert-File -Path $ValidatorPath
$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -Depth 100
$appConfig = $manifest.apps.$App
if ($null -eq $appConfig) { throw "Mobile manifest does not define $App." }
$packageName = [string]$appConfig.androidPackage

$login = Invoke-Firebase -Arguments @('login:list') -AllowFailure
if ($login.ExitCode -ne 0 -or $login.Text -notmatch 'Logged in as') {
    throw "Firebase login is required. Run: pnpm dlx firebase-tools@$FirebaseToolsVersion login"
}

$records = @(Get-FirebaseAndroidApps)
$record = Find-AppByPackage -Records $records -Package $packageName
if ($null -eq $record) {
    [void](Invoke-Firebase -Arguments @(
        'apps:create', 'ANDROID', "BThwani $App Android Development",
        '--package-name', $packageName,
        '--project', $ProjectId,
        '--json', '--non-interactive'
    ))

    for ($attempt = 1; $attempt -le 10; $attempt++) {
        Start-Sleep -Seconds 2
        $record = Find-AppByPackage -Records @(Get-FirebaseAndroidApps) -Package $packageName
        if ($null -ne $record) { break }
    }
    if ($null -eq $record) { throw "Firebase app '$packageName' was not visible after creation." }
}

$appId = [string](Get-PropertyValue -Object $record -Names @('appId', 'app_id'))
$sdkConfig = Invoke-Firebase -Arguments @(
    'apps:sdkconfig', 'ANDROID', $appId, '--project', $ProjectId, '--non-interactive'
)
$config = Get-BalancedJson -Text $sdkConfig.Text

New-Item -ItemType Directory -Path $DestinationDirectory -Force | Out-Null
$config | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $DestinationPath -Encoding UTF8

$validation = & node $ValidatorPath --file $DestinationPath --package $packageName --json 2>&1
if ($LASTEXITCODE -ne 0) { throw "Downloaded Firebase config failed validation: $validation" }
$validationText = (($validation | ForEach-Object { [string]$_ }) -join "`n")
$validationJson = Get-BalancedJson -Text $validationText
if ($validationJson.ok -ne $true -or [string]$validationJson.projectId -ne $ProjectId) {
    throw "Firebase config validation failed for $App."
}

Update-SecretsMap
Write-Host "PASS: $App Firebase config is ready at $DestinationPath" -ForegroundColor Green
