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
        [Parameter(Mandatory)][string[]]$Arguments
    )

    Push-Location -LiteralPath $WorkingDirectory
    try {
        & pnpm dlx $EasCli @Arguments
        $exitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    if ($exitCode -ne 0) {
        throw "EAS command failed: eas $($Arguments -join ' ')"
    }
}

try {
    if (-not (Test-Path -LiteralPath $RepoRoot -PathType Container)) {
        throw "Repository root was not found: $RepoRoot"
    }

    Remove-Item Env:SENTRY_AUTH_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_FORCE_ENV_TOKEN -ErrorAction SilentlyContinue

    & pnpm dlx $SentryCli auth refresh --force
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
            Write-Host "Updating SENTRY_AUTH_TOKEN: $relativeRuntime / $environment"
            Invoke-Eas -WorkingDirectory $runtime -Arguments @(
                "env:create", $environment,
                "--name", "SENTRY_AUTH_TOKEN",
                "--value", $token,
                "--visibility", "sensitive",
                "--scope", "project",
                "--force",
                "--non-interactive"
            )
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
