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

$target = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\apps\mobile\eas\maps.ps1')).Path
& $target @PSBoundParameters
exit $LASTEXITCODE
