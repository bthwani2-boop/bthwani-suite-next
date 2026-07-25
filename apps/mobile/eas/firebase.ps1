# Authentication wrapper for the Firebase Management REST implementation.
# REST implementation markers retained for contract visibility:
# https://firebase.googleapis.com/v1beta1
# 'auth', 'print-access-token'
# projects/$ProjectId/androidApps
# projects/-/androidApps/$encodedAppId/config
# configFileContents / FromBase64String

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

function Invoke-GcloudChecked {
    param([Parameter(Mandatory)][string[]] $Arguments)

    $output = & gcloud @Arguments '--quiet' 2>&1
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    $text = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
    if ($exitCode -ne 0) {
        throw "gcloud failed ($exitCode): gcloud $($Arguments -join ' ')`n$text"
    }
    return $text
}

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    throw 'gcloud CLI is required to provision Firebase Android configuration.'
}

# User OAuth tokens require an explicit quota project for client-based APIs.
[void](Invoke-GcloudChecked -Arguments @('config', 'set', 'project', $ProjectId))
[void](Invoke-GcloudChecked -Arguments @('config', 'set', 'billing/quota_project', $ProjectId))
[void](Invoke-GcloudChecked -Arguments @(
    'services', 'enable',
    'serviceusage.googleapis.com',
    'firebase.googleapis.com',
    '--project', $ProjectId
))

# The core script calls Invoke-RestMethod. This local wrapper injects the
# mandatory quota-project header into every Firebase Management API request.
function Invoke-RestMethod {
    param(
        [Parameter(Mandatory)] $Method,
        [Parameter(Mandatory)] $Uri,
        [System.Collections.IDictionary] $Headers = @{},
        [AllowNull()] $Body,
        [AllowNull()] [string] $ContentType,
        [AllowNull()] $ErrorAction
    )

    $effectiveHeaders = @{}
    foreach ($entry in $Headers.GetEnumerator()) {
        $effectiveHeaders[[string]$entry.Key] = [string]$entry.Value
    }

    $resolvedUri = [System.Uri]$Uri
    if ($resolvedUri.Host -ieq 'firebase.googleapis.com') {
        $effectiveHeaders['X-Goog-User-Project'] = $ProjectId
    }

    $parameters = @{
        Method = $Method
        Uri = $resolvedUri
        Headers = $effectiveHeaders
        ErrorAction = 'Stop'
    }
    if ($PSBoundParameters.ContainsKey('Body')) { $parameters.Body = $Body }
    if (-not [string]::IsNullOrWhiteSpace($ContentType)) { $parameters.ContentType = $ContentType }

    Microsoft.PowerShell.Utility\Invoke-RestMethod @parameters
}

$core = (Resolve-Path (Join-Path $PSScriptRoot 'firebase-core.ps1')).Path
& $core -App $App -Sha1Fingerprint $Sha1Fingerprint -ProjectId $ProjectId -SecretsRoot $SecretsRoot
exit $LASTEXITCODE
