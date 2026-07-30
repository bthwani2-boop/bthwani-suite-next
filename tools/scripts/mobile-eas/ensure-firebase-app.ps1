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

$target = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\apps\mobile\eas\firebase.ps1')).Path
& $target -App $App -Sha1Fingerprint $Sha1Fingerprint -ProjectId $ProjectId -SecretsRoot $SecretsRoot
exit $LASTEXITCODE
