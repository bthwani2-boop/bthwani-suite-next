# Internal helper used only by tools/scripts/mobile-eas.ps1.
# Ensures one Android Firebase app and one valid package/SHA-1 restricted runtime API key.

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('app-client', 'app-partner', 'app-captain', 'app-field')]
    [string] $App,

    [string] $Sha1Fingerprint,
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
$GoogleInputLocalPath = Join-Path $RepoRoot 'tools\scripts\google-cloud\google-platform-input.local.json'
$SecretsMapPath = Join-Path $RepoRoot 'secrets.local.mobile.json'
$DestinationDirectory = Join-Path $SecretsRoot $App
$DestinationPath = Join-Path $DestinationDirectory 'google-services.json'
$FirebaseKeyDisplayName = "bthwani-$App-android-firebase-development"
$FirebaseApiServices = @(
    'firebaseinstallations.googleapis.com',
    'fcmregistrations.googleapis.com'
)

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

function Invoke-Gcloud {
    param(
        [Parameter(Mandatory)][string[]] $Arguments,
        [switch] $CaptureOnly
    )

    $output = & gcloud @Arguments '--quiet' 2>&1
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    $text = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
    if ($exitCode -ne 0) {
        throw "gcloud failed ($exitCode): gcloud $($Arguments -join ' ')`n$text"
    }
    if ($text -and -not $CaptureOnly) { Write-Host $text }
    return $text
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

    throw 'Command output did not contain valid JSON.'
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
        if ($appId -and $platform) { $records.Add($Value) }
        foreach ($property in $Value.PSObject.Properties) { Visit -Value $property.Value }
    }

    Visit -Value $Node
    return @($records)
}

function Resolve-Sha1Fingerprint {
    if ($Sha1Fingerprint -match '^([A-Fa-f0-9]{2}:){19}[A-Fa-f0-9]{2}$') {
        return $Sha1Fingerprint.ToUpperInvariant()
    }

    Assert-File -Path $GoogleInputLocalPath
    $input = Get-Content -LiteralPath $GoogleInputLocalPath -Raw | ConvertFrom-Json -Depth 100
    $value = [string]$input.apps.$App.sha1Fingerprint
    if ($value -notmatch '^([A-Fa-f0-9]{2}:){19}[A-Fa-f0-9]{2}$') {
        throw "$GoogleInputLocalPath does not contain a valid SHA-1 for $App."
    }
    return $value.ToUpperInvariant()
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

    $matches = @($Records | Where-Object {
        [string](Get-PropertyValue -Object $_ -Names @('namespace', 'packageName', 'package_name', 'androidPackage')) -eq $Package
    })
    if ($matches.Count -gt 1) { throw "Firebase contains duplicate Android apps for '$Package'." }
    if ($matches.Count -eq 1) { return $matches[0] }
    return $null
}

function Get-KeyNameByDisplayName {
    $json = Invoke-Gcloud -Arguments @(
        'services', 'api-keys', 'list', '--project', $ProjectId, '--format=json'
    ) -CaptureOnly
    $items = @(Get-BalancedJson -Text $json)
    $match = $items | Where-Object { $_.displayName -eq $FirebaseKeyDisplayName } | Select-Object -First 1
    if ($null -eq $match) { return $null }
    return [string]$match.name
}

function Get-KeyResourceName {
    param([Parameter(Mandatory)] $Payload)
    foreach ($node in @($Payload.response, $Payload.result, $Payload)) {
        if ($null -eq $node) { continue }
        $name = [string](Get-PropertyValue -Object $node -Names @('name'))
        if ($name -match '/locations/global/keys/') { return $name }
    }
    return $null
}

function Get-KeyString {
    param([Parameter(Mandatory)][string] $KeyName)

    for ($attempt = 1; $attempt -le 10; $attempt++) {
        try {
            $payload = Get-BalancedJson -Text (Invoke-Gcloud -Arguments @(
                'services', 'api-keys', 'get-key-string', $KeyName, '--format=json'
            ) -CaptureOnly)
            $value = if ($payload.keyString) { [string]$payload.keyString } else { [string]$payload.response.keyString }
            if ($value -match '^AIza[0-9A-Za-z_-]{35}$') { return $value }
        } catch {
            if ($attempt -eq 10) { throw }
        }
        Start-Sleep -Seconds 2
    }

    throw "Firebase API key '$FirebaseKeyDisplayName' is missing or invalid."
}

function Ensure-FirebaseApiKey {
    param(
        [Parameter(Mandatory)][string] $PackageName,
        [Parameter(Mandatory)][string] $Sha1
    )

    [void](Invoke-Gcloud -Arguments (@(
        'services', 'enable', 'apikeys.googleapis.com'
    ) + $FirebaseApiServices + @('--project', $ProjectId)))

    $keyName = Get-KeyNameByDisplayName
    $arguments = if ($keyName) {
        @('services', 'api-keys', 'update', $keyName)
    } else {
        @('services', 'api-keys', 'create', '--display-name', $FirebaseKeyDisplayName)
    }
    foreach ($service in $FirebaseApiServices) {
        $arguments += @('--api-target', "service=$service")
    }
    $arguments += @(
        '--allowed-application', "sha1_fingerprint=$Sha1,package_name=$PackageName",
        '--project', $ProjectId,
        '--format=json'
    )

    $resultText = Invoke-Gcloud -Arguments $arguments -CaptureOnly
    if (-not $keyName) {
        $keyName = Get-KeyResourceName -Payload (Get-BalancedJson -Text $resultText)
        if (-not $keyName) { throw "Unable to identify Firebase API key '$FirebaseKeyDisplayName'." }
    }

    return Get-KeyString -KeyName $keyName
}

function Set-ClientApiKey {
    param(
        [Parameter(Mandatory)] $Config,
        [Parameter(Mandatory)][string] $PackageName,
        [Parameter(Mandatory)][string] $ApiKey
    )

    $client = @($Config.client | Where-Object {
        $_.client_info.android_client_info.package_name -eq $PackageName
    }) | Select-Object -First 1
    if ($null -eq $client) { throw "Firebase SDK config does not contain '$PackageName'." }

    $entry = [pscustomobject]@{ current_key = $ApiKey }
    if ($null -ne $client.PSObject.Properties['api_key']) {
        $client.api_key = @($entry)
    } else {
        $client | Add-Member -NotePropertyName api_key -NotePropertyValue @($entry)
    }
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
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    throw 'gcloud CLI is required to provision the Firebase Android API key.'
}

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -Depth 100
$appConfig = $manifest.apps.$App
if ($null -eq $appConfig) { throw "Mobile manifest does not define $App." }
$packageName = [string]$appConfig.androidPackage
$resolvedSha1 = Resolve-Sha1Fingerprint

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

$firebaseApiKey = Ensure-FirebaseApiKey -PackageName $packageName -Sha1 $resolvedSha1
$appId = [string](Get-PropertyValue -Object $record -Names @('appId', 'app_id'))
$sdkConfig = Invoke-Firebase -Arguments @(
    'apps:sdkconfig', 'ANDROID', $appId, '--project', $ProjectId, '--non-interactive'
)
$config = Get-BalancedJson -Text $sdkConfig.Text
Set-ClientApiKey -Config $config -PackageName $packageName -ApiKey $firebaseApiKey

New-Item -ItemType Directory -Path $DestinationDirectory -Force | Out-Null
$config | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $DestinationPath -Encoding UTF8

$validation = & node $ValidatorPath --file $DestinationPath --package $packageName --json 2>&1
if ($LASTEXITCODE -ne 0) { throw "Downloaded Firebase config failed validation: $validation" }
$validationJson = Get-BalancedJson -Text (($validation | ForEach-Object { [string]$_ }) -join "`n")
if ($validationJson.ok -ne $true -or [string]$validationJson.projectId -ne $ProjectId) {
    throw "Firebase config validation failed for $App."
}

Update-SecretsMap
Write-Host "PASS: $App Firebase app and restricted runtime API key are ready." -ForegroundColor Green
