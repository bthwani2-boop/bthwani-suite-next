Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

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
                Write-Host "Fast EAS sync: $($project.AppKey) / $environment"

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

                # One remote operation replaces eight public variables.
                # --force updates existing values and creates missing values.
                Invoke-EasCli -WorkingDirectory $runtime -Arguments @(
                    "env:push", $environment,
                    "--path", $environmentFile,
                    "--force"
                ) | Out-Null
            }

            # One remote operation applies the sensitive token to all environments.
            $tokenArguments = [System.Collections.Generic.List[string]]::new()
            foreach ($argument in @(
                "env:create",
                "--name", "SENTRY_AUTH_TOKEN",
                "--value", $script:SentryToken,
                "--visibility", "sensitive",
                "--scope", "project",
                "--force",
                "--non-interactive"
            )) {
                $tokenArguments.Add($argument)
            }

            foreach ($environment in $Environments) {
                $tokenArguments.Add("--environment")
                $tokenArguments.Add($environment)
            }

            Write-Host "Fast EAS secret sync: $($project.AppKey) / $($Environments -join ', ')"
            Invoke-EasCli -WorkingDirectory $runtime -Arguments $tokenArguments.ToArray() | Out-Null
        }
    }
    finally {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
