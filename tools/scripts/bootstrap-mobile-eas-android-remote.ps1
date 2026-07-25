# tools/scripts/bootstrap-mobile-eas-android-remote.ps1
# Remote EAS Android development bootstrap wrapper.
# Ensures local signing tooling exists, then delegates to the all-app remote EAS bootstrap.

[CmdletBinding()]
param(
    [string] $EasCliVersion = 'latest',
    [string] $SigningRoot = 'C:\bthwani-secrets\eas\android',
    [switch] $ForceRegenerateSigning,
    [switch] $SubmitBuilds,
    [switch] $SkipToolInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InnerBootstrap = Join-Path $ScriptDir 'bootstrap-mobile-eas-android-development.ps1'

function Add-PathEntry {
    param([Parameter(Mandatory)][string] $Directory)
    if (-not (Test-Path -LiteralPath $Directory -PathType Container)) { return }
    $separator = [System.IO.Path]::PathSeparator
    $entries = @($env:Path -split [regex]::Escape([string]$separator))
    if ($entries -notcontains $Directory) {
        $env:Path = "$Directory$separator$env:Path"
    }
}

function Add-KeytoolCandidateRoots {
    $roots = [System.Collections.Generic.List[string]]::new()
    if (-not [string]::IsNullOrWhiteSpace($env:JAVA_HOME)) { $roots.Add($env:JAVA_HOME) }
    if (-not [string]::IsNullOrWhiteSpace($env:JDK_HOME)) { $roots.Add($env:JDK_HOME) }
    if (-not [string]::IsNullOrWhiteSpace($env:ProgramFiles)) {
        foreach ($parent in @('Java', 'Eclipse Adoptium', 'Microsoft')) {
            $root = Join-Path $env:ProgramFiles $parent
            if (Test-Path -LiteralPath $root -PathType Container) {
                Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue |
                    Sort-Object Name -Descending |
                    ForEach-Object { $roots.Add($_.FullName) }
            }
        }
        $androidStudioJbr = Join-Path $env:ProgramFiles 'Android\Android Studio\jbr'
        if (Test-Path -LiteralPath $androidStudioJbr -PathType Container) { $roots.Add($androidStudioJbr) }
    }
    if (-not [string]::IsNullOrWhiteSpace(${env:ProgramFiles(x86)})) {
        foreach ($parent in @('Java', 'Eclipse Adoptium')) {
            $root = Join-Path ${env:ProgramFiles(x86)} $parent
            if (Test-Path -LiteralPath $root -PathType Container) {
                Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue |
                    Sort-Object Name -Descending |
                    ForEach-Object { $roots.Add($_.FullName) }
            }
        }
    }
    if (-not [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
        foreach ($parent in @('Programs\Eclipse Adoptium', 'Programs\Microsoft')) {
            $root = Join-Path $env:LOCALAPPDATA $parent
            if (Test-Path -LiteralPath $root -PathType Container) {
                Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue |
                    Sort-Object Name -Descending |
                    ForEach-Object { $roots.Add($_.FullName) }
            }
        }
    }

    foreach ($root in ($roots | Select-Object -Unique)) {
        Add-PathEntry -Directory (Join-Path $root 'bin')
    }
}

function Assert-KeytoolAvailable {
    Add-KeytoolCandidateRoots
    $keytool = Get-Command keytool -ErrorAction SilentlyContinue
    if ($keytool) {
        Write-Host "keytool: $($keytool.Source)" -ForegroundColor Green
        return
    }

    if ($SkipToolInstall) {
        throw 'keytool.exe is required for SHA-1 extraction. Install JDK 21 or Android Studio, then rerun.'
    }

    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) {
        throw 'keytool.exe is missing and winget is unavailable. Install JDK 21 or Android Studio, then rerun.'
    }

    Write-Host 'keytool.exe is missing. Installing JDK 21 with winget...' -ForegroundColor Yellow
    $attempts = @(
        @('install', '--id', 'EclipseAdoptium.Temurin.21.JDK', '--exact', '--silent', '--accept-package-agreements', '--accept-source-agreements'),
        @('install', '--id', 'Microsoft.OpenJDK.21', '--exact', '--silent', '--accept-package-agreements', '--accept-source-agreements')
    )

    $installed = $false
    foreach ($arguments in $attempts) {
        $global:LASTEXITCODE = 0
        & $winget.Source @arguments
        $exitCode = if ($null -eq $global:LASTEXITCODE) { 0 } else { [int]$global:LASTEXITCODE }
        if ($exitCode -eq 0) {
            $installed = $true
            break
        }
        Write-Host "winget failed with exit code ${exitCode}: winget $($arguments -join ' ')" -ForegroundColor Yellow
    }

    if (-not $installed) {
        throw 'JDK installation failed. Install JDK 21 manually, then rerun.'
    }

    Add-KeytoolCandidateRoots
    $keytool = Get-Command keytool -ErrorAction SilentlyContinue
    if (-not $keytool) {
        throw 'JDK installed, but keytool.exe is still unavailable in this PowerShell process. Open a new PowerShell and rerun.'
    }
    Write-Host "keytool: $($keytool.Source)" -ForegroundColor Green
}

if (-not (Test-Path -LiteralPath $InnerBootstrap -PathType Leaf)) {
    throw "Inner bootstrap script is missing: $InnerBootstrap"
}

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' BTHWANI ANDROID EAS REMOTE BOOTSTRAP' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host 'Build mode: EAS Remote Build only'
Write-Host 'Local use:  credentials generation and SHA-1 extraction only'

Assert-KeytoolAvailable

$arguments = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $InnerBootstrap,
    '-EasCliVersion', $EasCliVersion,
    '-SigningRoot', $SigningRoot
)
if ($ForceRegenerateSigning) { $arguments += '-ForceRegenerateSigning' }
if ($SubmitBuilds) { $arguments += '-SubmitBuilds' }

& pwsh @arguments
$exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
if ($exitCode -ne 0) {
    throw "Remote EAS bootstrap failed with exit code ${exitCode}."
}
