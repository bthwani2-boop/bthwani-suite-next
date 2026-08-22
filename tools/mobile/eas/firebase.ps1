# Provisions Firebase Android configuration through the official Firebase Management REST API.
# firebase-tools is intentionally not used because its Windows process may crash after
# successfully printing Firebase SDK configuration output.

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('app-client', 'app-partner', 'app-captain', 'app-field')]
    [string] $App,

    [string] $Sha1Fingerprint,
    [string] $ProjectId = 'bthwani-platform',
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
$FirebaseManagementBaseUri = 'https://firebase.googleapis.com/v1beta1'
$FirebaseKeyDisplayName = "bthwani-$App-android-firebase-development"
$FirebaseApiServices = @(
    'firebaseinstallations.googleapis.com',
    'fcmregistrations.googleapis.com'
)
$script:FirebaseAccessToken = $null

function Assert-File {
    param([Parameter(Mandatory)][string] $Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required file is missing: $Path"
    }
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

function Get-FirebaseErrorText {
    param([Parameter(Mandatory)] $ErrorRecord)

    $errorDetails = Get-PropertyValue -Object $ErrorRecord -Names @('ErrorDetails')
    $details = [string](Get-PropertyValue -Object $errorDetails -Names @('Message'))
    if (-not [string]::IsNullOrWhiteSpace($details)) { return $details.Trim() }

    $exception = Get-PropertyValue -Object $ErrorRecord -Names @('Exception')
    $response = Get-PropertyValue -Object $exception -Names @('Response')
    $content = Get-PropertyValue -Object $response -Names @('Content')
    if ($null -ne $content) {
        try {
            $readMethod = $content.PSObject.Methods['ReadAsStringAsync']
            if ($null -ne $readMethod) {
                $responseText = [string]$content.ReadAsStringAsync().GetAwaiter().GetResult()
                if (-not [string]::IsNullOrWhiteSpace($responseText)) { return $responseText.Trim() }
            } elseif ($content -is [string] -and -not [string]::IsNullOrWhiteSpace([string]$content)) {
                return ([string]$content).Trim()
            }
        } catch {
            # Fall through to the original exception text.
        }
    }

    $exceptionMessage = [string](Get-PropertyValue -Object $exception -Names @('Message'))
    if (-not [string]::IsNullOrWhiteSpace($exceptionMessage)) { return $exceptionMessage.Trim() }

    $fallback = [string]$ErrorRecord
    if (-not [string]::IsNullOrWhiteSpace($fallback)) { return $fallback.Trim() }
    return 'Unknown Firebase Management API error.'
}

function Resolve-Sha1Fingerprint {
    if ($Sha1Fingerprint -match '^([A-Fa-f0-9]{2}:){19}[A-Fa-f0-9]{2}$') {
        return $Sha1Fingerprint.ToUpperInvariant()
    }

    Assert-File -Path $GoogleInputLocalPath
    $input = Get-Content -LiteralPath $GoogleInputLocalPath -Raw | ConvertFrom-Json -Depth 100
    $appsObject = Get-PropertyValue -Object $input -Names @('apps')
    $appInput = Get-PropertyValue -Object $appsObject -Names @($App)
    $value = [string](Get-PropertyValue -Object $appInput -Names @('sha1Fingerprint'))
    if ($value -notmatch '^([A-Fa-f0-9]{2}:){19}[A-Fa-f0-9]{2}$') {
        throw "$GoogleInputLocalPath does not contain a valid SHA-1 for $App."
    }
    return $value.ToUpperInvariant()
}

function Get-FirebaseAccessToken {
    if (-not [string]::IsNullOrWhiteSpace($script:FirebaseAccessToken)) {
        return $script:FirebaseAccessToken
    }

    $token = (Invoke-Gcloud -Arguments @('auth', 'print-access-token') -CaptureOnly).Trim()
    if ([string]::IsNullOrWhiteSpace($token)) {
        throw 'gcloud did not return an access token. Run: gcloud auth login'
    }
    $script:FirebaseAccessToken = $token
    return $script:FirebaseAccessToken
}

function Invoke-FirebaseManagement {
    param(
        [Parameter(Mandatory)][ValidateSet('GET', 'POST')][string] $Method,
        [Parameter(Mandatory)][string] $Path,
        [AllowNull()] $Body
    )

    $uri = if ($Path.StartsWith('https://', [System.StringComparison]::OrdinalIgnoreCase)) {
        $Path
    } else {
        "$FirebaseManagementBaseUri/$Path"
    }

    $request = @{
        Method = $Method
        Uri = $uri
        Headers = @{
            Authorization = "Bearer $(Get-FirebaseAccessToken)"
            'X-Goog-User-Project' = $ProjectId
        }
        ErrorAction = 'Stop'
    }
    if ($null -ne $Body) {
        $request.Body = $Body | ConvertTo-Json -Depth 100 -Compress
        $request.ContentType = 'application/json'
    }

    try {
        return Microsoft.PowerShell.Utility\Invoke-RestMethod @request
    } catch {
        $details = Get-FirebaseErrorText -ErrorRecord $_
        throw "Firebase Management API failed ($Method $Path): $details"
    }
}

function Get-FirebaseAndroidApps {
    $apps = [System.Collections.Generic.List[object]]::new()
    $pageToken = $null

    do {
        $path = "projects/$ProjectId/androidApps?pageSize=100"
        if (-not [string]::IsNullOrWhiteSpace($pageToken)) {
            $path += "&pageToken=$([System.Uri]::EscapeDataString($pageToken))"
        }
        $response = Invoke-FirebaseManagement -Method GET -Path $path
        foreach ($record in @(Get-PropertyValue -Object $response -Names @('apps'))) {
            if ($null -ne $record) { [void] $apps.Add($record) }
        }
        $pageToken = [string](Get-PropertyValue -Object $response -Names @('nextPageToken'))
    } while (-not [string]::IsNullOrWhiteSpace($pageToken))

    return @($apps)
}

function Find-AppByPackage {
    param(
        [Parameter(Mandatory)][object[]] $Records,
        [Parameter(Mandatory)][string] $Package
    )

    $matches = @($Records | Where-Object {
        [string](Get-PropertyValue -Object $_ -Names @('packageName')) -eq $Package
    })
    if ($matches.Count -gt 1) { throw "Firebase contains duplicate Android apps for '$Package'." }
    if ($matches.Count -eq 1) { return $matches[0] }
    return $null
}

function Wait-FirebaseOperation {
    param([Parameter(Mandatory)] $Operation)

    $operationName = [string](Get-PropertyValue -Object $Operation -Names @('name'))
    if ([string]::IsNullOrWhiteSpace($operationName)) {
        throw 'Firebase Management API did not return an operation name.'
    }

    for ($attempt = 1; $attempt -le 30; $attempt++) {
        $status = Invoke-FirebaseManagement -Method GET -Path $operationName
        $done = Get-PropertyValue -Object $status -Names @('done')
        if ($done -eq $true) {
            $operationError = Get-PropertyValue -Object $status -Names @('error')
            if ($null -ne $operationError) {
                throw "Firebase operation failed: $($operationError | ConvertTo-Json -Depth 20 -Compress)"
            }
            $operationResponse = Get-PropertyValue -Object $status -Names @('response')
            if ($null -eq $operationResponse) {
                throw 'Firebase operation completed without an Android app response.'
            }
            return $operationResponse
        }
        Start-Sleep -Seconds 2
    }

    throw "Firebase operation '$operationName' did not complete within 60 seconds."
}

function New-FirebaseAndroidApp {
    param([Parameter(Mandatory)][string] $PackageName)

    $operation = Invoke-FirebaseManagement -Method POST -Path "projects/$ProjectId/androidApps" -Body @{
        displayName = "BThwani $App Android Development"
        packageName = $PackageName
    }
    return Wait-FirebaseOperation -Operation $operation
}

function Get-FirebaseSdkConfig {
    param([Parameter(Mandatory)][string] $AppId)

    $encodedAppId = [System.Uri]::EscapeDataString($AppId)
    $response = Invoke-FirebaseManagement -Method GET -Path "projects/-/androidApps/$encodedAppId/config"
    $encodedContents = [string](Get-PropertyValue -Object $response -Names @('configFileContents'))
    if ([string]::IsNullOrWhiteSpace($encodedContents)) {
        throw "Firebase config response is empty for Android app '$AppId'."
    }

    try {
        $bytes = [Convert]::FromBase64String($encodedContents)
        $json = [System.Text.Encoding]::UTF8.GetString($bytes)
        return $json | ConvertFrom-Json -Depth 100
    } catch {
        $message = Get-FirebaseErrorText -ErrorRecord $_
        throw "Firebase config response could not be decoded for Android app '$AppId': $message"
    }
}

function Get-KeyNameByDisplayName {
    $json = Invoke-Gcloud -Arguments @(
        'services', 'api-keys', 'list', '--project', $ProjectId, '--format=json'
    ) -CaptureOnly
    $items = @(Get-BalancedJson -Text $json)
    $match = $items | Where-Object {
        [string](Get-PropertyValue -Object $_ -Names @('displayName')) -eq $FirebaseKeyDisplayName
    } | Select-Object -First 1
    if ($null -eq $match) { return $null }
    return [string](Get-PropertyValue -Object $match -Names @('name'))
}

function Get-KeyString {
    param([Parameter(Mandatory)][string] $KeyName)

    for ($attempt = 1; $attempt -le 10; $attempt++) {
        try {
            $payload = Get-BalancedJson -Text (Invoke-Gcloud -Arguments @(
                'services', 'api-keys', 'get-key-string', $KeyName, '--format=json'
            ) -CaptureOnly)
            $value = [string](Get-PropertyValue -Object $payload -Names @('keyString'))
            if (-not $value) {
                $response = Get-PropertyValue -Object $payload -Names @('response')
                $value = [string](Get-PropertyValue -Object $response -Names @('keyString'))
            }
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

    [void](Invoke-Gcloud -Arguments $arguments -CaptureOnly)
    if (-not $keyName) {
        for ($attempt = 1; $attempt -le 10; $attempt++) {
            Start-Sleep -Seconds 2
            $keyName = Get-KeyNameByDisplayName
            if ($keyName) { break }
        }
        if (-not $keyName) { throw "Unable to locate Firebase API key '$FirebaseKeyDisplayName' after creation." }
    }

    return Get-KeyString -KeyName $keyName
}

function Set-ClientApiKey {
    param(
        [Parameter(Mandatory)] $Config,
        [Parameter(Mandatory)][string] $PackageName,
        [Parameter(Mandatory)][string] $ApiKey
    )

    $clients = @(Get-PropertyValue -Object $Config -Names @('client'))
    $client = $clients | Where-Object {
        $clientInfo = Get-PropertyValue -Object $_ -Names @('client_info')
        $androidInfo = Get-PropertyValue -Object $clientInfo -Names @('android_client_info')
        [string](Get-PropertyValue -Object $androidInfo -Names @('package_name')) -eq $PackageName
    } | Select-Object -First 1
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
    throw 'gcloud CLI is required to provision Firebase Android configuration.'
}

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -Depth 100
$manifestApps = Get-PropertyValue -Object $manifest -Names @('apps')
$appConfig = Get-PropertyValue -Object $manifestApps -Names @($App)
if ($null -eq $appConfig) { throw "Mobile manifest does not define $App." }
$packageName = [string](Get-PropertyValue -Object $appConfig -Names @('androidPackage'))
if ([string]::IsNullOrWhiteSpace($packageName)) { throw "Mobile manifest does not define androidPackage for $App." }
$resolvedSha1 = Resolve-Sha1Fingerprint

[void](Invoke-Gcloud -Arguments @('config', 'set', 'project', $ProjectId))
[void](Invoke-Gcloud -Arguments @('config', 'set', 'billing/quota_project', $ProjectId))
[void](Invoke-Gcloud -Arguments @(
    'services', 'enable',
    'serviceusage.googleapis.com',
    'firebase.googleapis.com',
    'apikeys.googleapis.com',
    '--project', $ProjectId
))

$records = @(Get-FirebaseAndroidApps)
$record = Find-AppByPackage -Records $records -Package $packageName
if ($null -eq $record) {
    $record = New-FirebaseAndroidApp -PackageName $packageName
}
$recordPackage = [string](Get-PropertyValue -Object $record -Names @('packageName'))
if ($recordPackage -ne $packageName) {
    throw "Firebase Android app package mismatch. Expected '$packageName', got '$recordPackage'."
}

$firebaseApiKey = Ensure-FirebaseApiKey -PackageName $packageName -Sha1 $resolvedSha1
$appId = [string](Get-PropertyValue -Object $record -Names @('appId'))
if ([string]::IsNullOrWhiteSpace($appId)) {
    throw "Firebase Android app '$packageName' does not expose an appId."
}

$config = Get-FirebaseSdkConfig -AppId $appId
Set-ClientApiKey -Config $config -PackageName $packageName -ApiKey $firebaseApiKey

New-Item -ItemType Directory -Path $DestinationDirectory -Force | Out-Null
$config | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $DestinationPath -Encoding UTF8

$validation = & node $ValidatorPath --file $DestinationPath --package $packageName --json 2>&1
if ($LASTEXITCODE -ne 0) { throw "Downloaded Firebase config failed validation: $validation" }
$validationJson = Get-BalancedJson -Text (($validation | ForEach-Object { [string]$_ }) -join "`n")
$validationOk = Get-PropertyValue -Object $validationJson -Names @('ok')
$validationProject = [string](Get-PropertyValue -Object $validationJson -Names @('projectId'))
if ($validationOk -ne $true -or $validationProject -ne $ProjectId) {
    throw "Firebase config validation failed for $App."
}

Update-SecretsMap
Write-Host "PASS: $App Firebase app and restricted runtime API key are ready." -ForegroundColor Green
