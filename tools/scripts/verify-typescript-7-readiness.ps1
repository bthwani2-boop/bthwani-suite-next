[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$expectedBranch = "task/typescript-7-readiness"
$expectedTypeScriptVersion = "6.0.3"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$tsconfigPath = Join-Path $repoRoot "tsconfig.base.json"
$packageJsonPath = Join-Path $repoRoot "package.json"

function Write-Section {
    param([Parameter(Mandatory)][string]$Title)

    Write-Host ""
    Write-Host "=== $Title ==="
}

function Invoke-PnpmStep {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string[]]$Arguments
    )

    Write-Section $Name
    $startedAt = Get-Date

    & pnpm @Arguments
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        throw "$Name failed with exit code $exitCode."
    }

    $elapsed = (Get-Date) - $startedAt
    Write-Host ("Completed in {0:hh\:mm\:ss}." -f $elapsed)
}

Push-Location $repoRoot
try {
    Write-Section "Preflight"

    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw "git is not available in PATH."
    }

    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        throw "pnpm is not available in PATH."
    }

    $currentBranch = (& git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to determine the current Git branch."
    }

    if ($currentBranch -ne $expectedBranch) {
        throw "Wrong branch: '$currentBranch'. Switch to '$expectedBranch' before running this script."
    }

    if (-not (Test-Path -LiteralPath $tsconfigPath)) {
        throw "Missing file: $tsconfigPath"
    }

    if (-not (Test-Path -LiteralPath $packageJsonPath)) {
        throw "Missing file: $packageJsonPath"
    }

    Write-Host "Repository: $repoRoot"
    Write-Host "Branch:     $currentBranch"

    Write-Section "Remove TypeScript 6 deprecation suppression"

    $tsconfigContent = [System.IO.File]::ReadAllText($tsconfigPath)
    $ignoreDeprecationsPattern = '(?m)^\s*"ignoreDeprecations"\s*:\s*"6\.0"\s*,?\r?\n'

    if ([System.Text.RegularExpressions.Regex]::IsMatch($tsconfigContent, $ignoreDeprecationsPattern)) {
        $updatedTsconfig = [System.Text.RegularExpressions.Regex]::Replace(
            $tsconfigContent,
            $ignoreDeprecationsPattern,
            "",
            1
        )

        $utf8WithoutBom = [System.Text.UTF8Encoding]::new($false)
        [System.IO.File]::WriteAllText($tsconfigPath, $updatedTsconfig, $utf8WithoutBom)
        Write-Host 'Removed "ignoreDeprecations": "6.0" from tsconfig.base.json.'
    }
    else {
        Write-Host 'The setting "ignoreDeprecations": "6.0" is already absent.'
    }

    try {
        $null = Get-Content -LiteralPath $tsconfigPath -Raw | ConvertFrom-Json
    }
    catch {
        throw "tsconfig.base.json is invalid JSON after the edit: $($_.Exception.Message)"
    }

    $packageJson = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json
    $declaredTypeScript = [string]$packageJson.devDependencies.typescript

    if ($declaredTypeScript -ne "~$expectedTypeScriptVersion") {
        throw "Expected package.json to keep typescript at '~$expectedTypeScriptVersion', but found '$declaredTypeScript'."
    }

    Write-Host "TypeScript declaration remains: $declaredTypeScript"

    Invoke-PnpmStep -Name "Install locked dependencies" -Arguments @(
        "install",
        "--frozen-lockfile"
    )

    Write-Section "Verify TypeScript version"
    $versionOutput = (& pnpm exec tsc --version | Out-String).Trim()
    $versionExitCode = $LASTEXITCODE
    Write-Host $versionOutput

    if ($versionExitCode -ne 0) {
        throw "pnpm exec tsc --version failed with exit code $versionExitCode."
    }

    if ($versionOutput -ne "Version $expectedTypeScriptVersion") {
        throw "Expected TypeScript $expectedTypeScriptVersion, but received '$versionOutput'."
    }

    Invoke-PnpmStep -Name "Typecheck" -Arguments @("run", "typecheck")
    Invoke-PnpmStep -Name "Lint" -Arguments @("run", "lint")
    Invoke-PnpmStep -Name "Tests" -Arguments @("run", "test")
    Invoke-PnpmStep -Name "Build" -Arguments @("run", "build")
    Invoke-PnpmStep -Name "Governance gates" -Arguments @("run", "guard:governance-all")

    Write-Section "Result"
    Write-Host "TypeScript 7 readiness verification completed successfully."
    Write-Host "TypeScript remains pinned to $expectedTypeScriptVersion."

    & git status --short
    if ($LASTEXITCODE -ne 0) {
        throw "git status failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
