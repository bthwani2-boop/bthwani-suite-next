[CmdletBinding()]
param(
    [string]$RepoRoot = "C:\bthwani-suite-next",
    [string]$Organization = "bthwani",
    [string[]]$EasEnvironments = @("development", "preview", "production")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "SentryReset.Common.ps1")
. (Join-Path $PSScriptRoot "NativeProcess.Fixed.ps1")
. (Join-Path $PSScriptRoot "EasSync.Fast.ps1")

function Read-DotEnvMap {
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Local Sentry configuration was not found: $Path"
    }

    $values = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^\s*#' -or [string]::IsNullOrWhiteSpace($line)) { continue }
        $separator = $line.IndexOf('=')
        if ($separator -lt 1) { continue }
        $name = $line.Substring(0, $separator).Trim()
        $value = $line.Substring($separator + 1)
        $values[$name] = $value
    }
    return $values
}

try {
    Write-Stage "RESUME FAST SENTRY EAS SYNCHRONIZATION"

    if (-not (Test-Path -LiteralPath $RepoRoot -PathType Container)) {
        throw "Repository root was not found: $RepoRoot"
    }

    Assert-Command -Name "pnpm"

    $mobileEnv = Join-Path $RepoRoot "infra\local\mobile.env"
    $values = Read-DotEnvMap -Path $mobileEnv

    $definitions = @(
        [pscustomobject]@{ Key="APP_CLIENT"; AppKey="app-client"; Runtime="apps\app-client\runtime" },
        [pscustomobject]@{ Key="APP_PARTNER"; AppKey="app-partner"; Runtime="apps\app-partner\runtime" },
        [pscustomobject]@{ Key="APP_CAPTAIN"; AppKey="app-captain"; Runtime="apps\app-captain\runtime" },
        [pscustomobject]@{ Key="APP_FIELD"; AppKey="app-field"; Runtime="apps\app-field\runtime" }
    )

    $mobileProjects = [System.Collections.Generic.List[object]]::new()
    foreach ($definition in $definitions) {
        $projectName = "SENTRY_PROJECT_$($definition.Key)"
        $dsnName = "EXPO_PUBLIC_SENTRY_DSN_$($definition.Key)"
        $projectSlug = [string]$values[$projectName]
        $publicDsn = [string]$values[$dsnName]

        if ([string]::IsNullOrWhiteSpace($projectSlug)) {
            throw "Missing local value: $projectName"
        }
        if ([string]::IsNullOrWhiteSpace($publicDsn)) {
            throw "Missing local value: $dsnName"
        }

        $mobileProjects.Add([pscustomobject]@{
            Key = $definition.Key
            AppKey = $definition.AppKey
            Runtime = $definition.Runtime
            Slug = $projectSlug
            PublicDsn = $publicDsn
        })
    }

    Write-Host "Using the Sentry projects and DSNs already created by the previous run."
    Write-Host "No Sentry project will be deleted or recreated."

    $status = Invoke-SentryCli -Arguments @("auth", "status", "--fresh") -AllowFailure
    if ($status -ne 0) {
        throw "The stored Sentry OAuth session is unavailable. Run factory-reset.ps1 only if authorization has expired."
    }

    $tokenResult = Invoke-SentryCli -Arguments @("auth", "token") -Capture
    if ($tokenResult.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($tokenResult.Output)) {
        throw "Sentry CLI did not return the stored OAuth token."
    }
    $script:SentryToken = $tokenResult.Output.Trim()

    Ensure-EasAuthentication -WorkingDirectory (Join-Path $RepoRoot "apps\app-client\runtime")

    Reset-EasSentryVariables `
        -RepoRoot $RepoRoot `
        -Organization $Organization `
        -MobileProjects $mobileProjects.ToArray() `
        -Environments $EasEnvironments

    Write-Host ""
    Write-Host "Fast EAS synchronization completed successfully."
    Write-Host "Applications: 4"
    Write-Host "Environments: $($EasEnvironments -join ', ')"
    Write-Host "Remote operations reduced to 16 instead of 216."
}
finally {
    $script:SentryToken = $null
    Remove-Item Env:SENTRY_AUTH_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_FORCE_ENV_TOKEN -ErrorAction SilentlyContinue
}
