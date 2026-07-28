Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'mobile\reverse-all.ps1') @args
exit $LASTEXITCODE
