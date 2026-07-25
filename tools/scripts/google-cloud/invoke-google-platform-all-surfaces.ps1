# Resolve Google Cloud CLI on Windows, then invoke the governed all-surface orchestrator.
# This remains an all-surface entry point: all four mobile apps and control-panel.

[CmdletBinding()]
param(
    [ValidateSet(
        'Plan',
        'EnableFirebase',
        'BootstrapFirebaseApps',
        'UploadFirebaseToEas',
        'CreateMapsKeys',
        'Preflight',
        'All'
    )]
    [string] $Phase = 'Plan',

    [string] $InputPath,

    [switch] $Login,
    [switch] $Apply,
    [switch] $UploadMapsToEas
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

function Add-GcloudToProcessPath {
    $existing = Get-Command gcloud -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "gcloud: $($existing.Source)" -ForegroundColor Green
        return
    }

    $candidates = [System.Collections.Generic.List[string]]::new()

    if (-not [string]::IsNullOrWhiteSpace($env:CLOUDSDK_ROOT_DIR)) {
        $candidates.Add((Join-Path $env:CLOUDSDK_ROOT_DIR 'bin\gcloud.cmd'))
        $candidates.Add((Join-Path $env:CLOUDSDK_ROOT_DIR 'google-cloud-sdk\bin\gcloud.cmd'))
    }
    if (-not [string]::IsNullOrWhiteSpace(${env:ProgramFiles(x86)})) {
        $candidates.Add((Join-Path ${env:ProgramFiles(x86)} 'Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'))
    }
    if (-not [string]::IsNullOrWhiteSpace($env:ProgramFiles)) {
        $candidates.Add((Join-Path $env:ProgramFiles 'Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'))
    }
    if (-not [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
        $candidates.Add((Join-Path $env:LOCALAPPDATA 'Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'))
    }
    $candidates.Add('C:\GoogleCloudSDK\google-cloud-sdk\bin\gcloud.cmd')

    $resolved = $candidates |
        Select-Object -Unique |
        Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } |
        Select-Object -First 1

    if ([string]::IsNullOrWhiteSpace([string]$resolved)) {
        $checked = ($candidates | Select-Object -Unique) -join "`n - "
        throw "Google Cloud CLI was not found on PATH or in the known Windows installation paths.`nChecked:`n - $checked"
    }

    $binDirectory = Split-Path -Parent $resolved
    $separator = [System.IO.Path]::PathSeparator
    $pathEntries = @($env:Path -split [regex]::Escape([string]$separator))
    if ($pathEntries -notcontains $binDirectory) {
        $env:Path = "$binDirectory$separator$env:Path"
    }

    $command = Get-Command gcloud -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "gcloud was found at '$resolved', but could not be resolved after updating the process PATH."
    }

    Write-Host "gcloud: $($command.Source)" -ForegroundColor Green
}

Add-GcloudToProcessPath

$orchestrator = Join-Path $PSScriptRoot 'prepare-google-platform-all-surfaces.ps1'
if (-not (Test-Path -LiteralPath $orchestrator -PathType Leaf)) {
    throw "Governed Google platform orchestrator is missing: $orchestrator"
}

$arguments = @('-Phase', $Phase)
if (-not [string]::IsNullOrWhiteSpace($InputPath)) {
    $arguments += @('-InputPath', $InputPath)
}
if ($Login) { $arguments += '-Login' }
if ($Apply) { $arguments += '-Apply' }
if ($UploadMapsToEas) { $arguments += '-UploadMapsToEas' }

Write-Host "> pwsh -NoProfile -ExecutionPolicy Bypass -File $orchestrator $($arguments -join ' ')" -ForegroundColor DarkGray
& pwsh -NoProfile -ExecutionPolicy Bypass -File $orchestrator @arguments
$exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
if ($exitCode -ne 0) {
    throw "Google platform all-surface orchestration failed with exit code ${exitCode}."
}

Write-Host "`nPASS: Google Cloud CLI resolution and all-surface phase '$Phase' completed." -ForegroundColor Green
