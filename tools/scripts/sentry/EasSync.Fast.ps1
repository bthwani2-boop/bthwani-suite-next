Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Set-EasSensitiveVariable {
    param(
        [Parameter(Mandatory)][string]$WorkingDirectory,
        [Parameter(Mandatory)][string]$Environment,
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Value
    )

    Write-Host "Upserting sensitive EAS variable: $Name / $Environment"

    # env:update is the supported path for an existing variable. EAS treats a
    # variable assigned to several environments as one record, so attempting a
    # multi-environment env:create can fail when only some environments exist.
    $updateExitCode = Invoke-EasCli -WorkingDirectory $WorkingDirectory -Arguments @(
        "env:update", $Environment,
        "--variable-name", $Name,
        "--value", $Value,
        "--visibility", "sensitive",
        "--scope", "project",
        "--non-interactive"
    ) -AllowFailure

    if ($updateExitCode -eq 0) {
        return
    }

    # The variable does not exist in this environment yet. Create only that
    # environment instead of sending one create request for all environments.
    Invoke-EasCli -WorkingDirectory $WorkingDirectory -Arguments @(
        "env:create", $Environment,
        "--name", $Name,
        "--value", $Value,
        "--visibility", "sensitive",
        "--scope", "project",
        "--non-interactive"
    ) | Out-Null
}

function Reset-EasSentryVariables {
    param(
        [Parameter(Mandatory)][string]$RepoRoot,
        [Parameter(Mandatory)][string]$Organization,
        [Parameter(Mandatory)][object[]]$MobileProjects,
        [Parameter(Mandatory)][string[]]$Environments
    )

    $temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) "bthwani-sentry-eas-fast"
    New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null

    try {
        foreach ($project in $MobileProjects) {
            $runtime = Join-Path $RepoRoot $project.Runtime
            if (-not (Test-Path -LiteralPath $runtime -PathType Container)) {
                throw "Application runtime was not found: $runtime"
            }

            foreach ($environment in $Environments) {
                Write-Host "Fast EAS public sync: $($project.AppKey) / $environment"

                $environmentFile = Join-Path $temporaryRoot "$($project.AppKey)-$environment.env"
                $lines = @(
                    "SENTRY_ORG=$Organization",
                    "SENTRY_URL=$script:SentryUrl/",
                    "SENTRY_PROJECT=$($project.Slug)",
                    "EXPO_PUBLIC_SENTRY_DSN=$($project.PublicDsn)",
                    "EXPO_PUBLIC_APP_ENV=$environment",
                    "EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.05",
                    "EXPO_PUBLIC_SENTRY_DEBUG=false",
                    "EXPO_PUBLIC_SENTRY_STARTUP_PROBE=false"
                )

                [IO.File]::WriteAllLines(
                    $environmentFile,
                    [string[]]$lines,
                    [Text.UTF8Encoding]::new($false)
                )

                # One remote operation handles all public variables for this
                # application/environment pair.
                Invoke-EasCli -WorkingDirectory $runtime -Arguments @(
                    "env:push", $environment,
                    "--path", $environmentFile,
                    "--force"
                ) | Out-Null

                # Upsert the token independently for each environment. This
                # resumes safely after a partial run and avoids the GraphQL
                # duplicate-variable failure from multi-environment create.
                Set-EasSensitiveVariable `
                    -WorkingDirectory $runtime `
                    -Environment $environment `
                    -Name "SENTRY_AUTH_TOKEN" `
                    -Value $script:SentryToken
            }
        }
    }
    finally {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
