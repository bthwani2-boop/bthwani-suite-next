[CmdletBinding()]
param(
    [string]$RepoRoot = "C:\bthwani-suite-next",
    [string[]]$EasEnvironments = @("development", "preview", "production")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$SentryCli = "sentry@0.38.0"
$EasCli = "eas-cli@latest"
$token = $null

function Invoke-Eas {
    param(
        [Parameter(Mandatory)][string]$WorkingDirectory,
        [Parameter(Mandatory)][string[]]$Arguments,
        [switch]$AllowFailure
    )

    Push-Location -LiteralPath $WorkingDirectory
    try {
        & pnpm dlx $EasCli @Arguments | Out-Host
        $exitCode = [int]$LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "EAS command failed: eas $($Arguments -join ' ')"
    }

    return $exitCode
}

function Set-EasToken {
    param(
        [Parameter(Mandatory)][string]$WorkingDirectory,
        [Parameter(Mandatory)][string]$Environment,
        [Parameter(Mandatory)][string]$Value
    )

    $updateExitCode = Invoke-Eas -WorkingDirectory $WorkingDirectory -Arguments @(
        "env:update", $Environment,
        "--variable-name", "SENTRY_AUTH_TOKEN",
        "--value", $Value,
        "--visibility", "sensitive",
        "--scope", "project",
        "--non-interactive"
    ) -AllowFailure

    if ($updateExitCode -eq 0) {
        return
    }

    Invoke-Eas -WorkingDirectory $WorkingDirectory -Arguments @(
        "env:create", $Environment,
        "--name", "SENTRY_AUTH_TOKEN",
        "--value", $Value,
        "--visibility", "sensitive",
        "--scope", "project",
        "--non-interactive"
    ) | Out-Null
}

try {
    if (-not (Test-Path -LiteralPath $RepoRoot -PathType Container)) {
        throw "Repository root was not found: $RepoRoot"
    }

    Remove-Item Env:SENTRY_AUTH_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_FORCE_ENV_TOKEN -ErrorAction SilentlyContinue

    & pnpm dlx $SentryCli auth refresh --force | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "Sentry OAuth refresh failed. Run factory-reset.ps1 interactively to authorize again."
    }

    $tokenOutput = & pnpm dlx $SentryCli auth token
    if ($LASTEXITCODE -ne 0) {
        throw "Sentry CLI could not return the refreshed token."
    }

    $token = (($tokenOutput | Out-String).Trim())
    if ([string]::IsNullOrWhiteSpace($token)) {
        throw "The refreshed Sentry token is empty."
    }

    foreach ($relativeRuntime in @(
        "apps\app-client\runtime",
        "apps\app-partner\runtime",
        "apps\app-captain\runtime",
        "apps\app-field\runtime"
    )) {
        $runtime = Join-Path $RepoRoot $relativeRuntime
        if (-not (Test-Path -LiteralPath $runtime -PathType Container)) {
            throw "Application runtime was not found: $runtime"
        }

        foreach ($environment in $EasEnvironments) {
            Write-Host "Upserting SENTRY_AUTH_TOKEN: $relativeRuntime / $environment"
            Set-EasToken `
                -WorkingDirectory $runtime `
                -Environment $environment `
                -Value $token
        }
    }

    Write-Host "Sentry OAuth token refreshed and synchronized to all EAS projects."
}
finally {
    $token = $null
    Remove-Item Env:SENTRY_AUTH_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_FORCE_ENV_TOKEN -ErrorAction SilentlyContinue
}
