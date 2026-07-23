[CmdletBinding()]
param(
    [string]$RepoRoot = "C:\bthwani-suite-next",
    [string]$Organization = "bthwani",
    [string[]]$EasEnvironments = @("development", "preview", "production"),
    [switch]$ConfirmFullReset,
    [switch]$SkipEas,
    [switch]$SkipScheduledRefresh
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "SentryReset.Common.ps1")

try {
    Write-Stage "BTHWANI SENTRY FACTORY RESET"

    if (-not $ConfirmFullReset) {
        throw "Run with -ConfirmFullReset. This deletes every Sentry project in organization '$Organization'."
    }

    if (-not (Test-Path -LiteralPath $RepoRoot -PathType Container)) {
        throw "Repository root was not found: $RepoRoot"
    }

    Assert-Command -Name "pnpm"
    Assert-Command -Name "pwsh"

    Write-Warning "ALL Sentry projects in '$Organization' will be deleted and recreated."
    Write-Warning "Only Sentry-related EAS variables are deleted; unrelated EAS data remains unchanged."
    Write-Host "Starting in 8 seconds. Press Ctrl+C to cancel."
    Start-Sleep -Seconds 8

    Write-Stage "CLEAR LOCAL SENTRY STATE"
    Remove-LocalSentryState -RepoRoot $RepoRoot

    Write-Stage "LOGIN TO SENTRY AND AUTHORIZE"
    Connect-SentryOAuth

    $organizationResponse = Invoke-SentryApi -Method GET -Path "organizations/$([Uri]::EscapeDataString($Organization))/"
    $organizationItems = @(ConvertTo-FlatItems -InputObject $organizationResponse)
    $organizationObject = $organizationItems | Select-Object -First 1
    $organizationSlug = [string](Get-PropertyValue -InputObject $organizationObject -Name "slug")
    if ([string]::IsNullOrWhiteSpace($organizationSlug)) {
        $organizationSlug = $Organization
    }
    Write-Host "Connected organization: $organizationSlug"

    Write-Stage "DELETE ALL EXISTING SENTRY PROJECTS"
    Remove-AllSentryProjects -Organization $Organization

    Write-Stage "CREATE ALL SENTRY PROJECTS FROM ZERO"
    $createdProjects = [System.Collections.Generic.List[object]]::new()
    foreach ($definition in Get-ProjectDefinitions) {
        Write-Host "Creating Sentry project: $($definition.Slug)"
        $createdProjects.Add((New-SentryProjectWithDsn -Organization $Organization -Definition $definition))
    }

    Write-Stage "WRITE CLEAN LOCAL CONFIGURATION"
    $mobileEnv = Join-Path $RepoRoot "infra\local\mobile.env"
    $localValues = [ordered]@{
        SENTRY_ORG = $Organization
        SENTRY_URL = "$script:SentryUrl/"
        SENTRY_AUTH_TOKEN = ""
        EXPO_PUBLIC_APP_ENV = "development"
        EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE = "0.05"
        EXPO_PUBLIC_SENTRY_DEBUG = "false"
        EXPO_PUBLIC_SENTRY_STARTUP_PROBE = "false"
    }

    foreach ($project in $createdProjects | Where-Object { $null -ne $_.AppKey }) {
        $localValues["SENTRY_PROJECT_$($project.Key)"] = $project.Slug
        $localValues["EXPO_PUBLIC_SENTRY_DSN_$($project.Key)"] = $project.PublicDsn
    }

    Set-DotEnvValues -Path $mobileEnv -Values $localValues
    Write-Host "Updated local Sentry configuration: $mobileEnv"
    Write-Host "The OAuth token was not written to the repository or mobile.env."

    if (-not $SkipEas) {
        Write-Stage "DELETE AND RECREATE ALL SENTRY VARIABLES IN EAS"
        $mobileProjects = @($createdProjects | Where-Object { $null -ne $_.AppKey })
        Ensure-EasAuthentication -WorkingDirectory (Join-Path $RepoRoot "apps\app-client\runtime")
        Reset-EasSentryVariables `
            -RepoRoot $RepoRoot `
            -Organization $Organization `
            -MobileProjects $mobileProjects `
            -Environments $EasEnvironments

        if (-not $SkipScheduledRefresh) {
            Write-Stage "INSTALL AUTOMATIC OAUTH TOKEN REFRESH"
            Install-RefreshTask -RepoRoot $RepoRoot
        }
    }

    Write-Stage "FINAL VERIFICATION"
    $remoteProjects = @(Get-SentryProjects -Organization $Organization)
    foreach ($project in $createdProjects) {
        $match = $remoteProjects | Where-Object {
            [string](Get-PropertyValue -InputObject $_ -Name "slug") -eq $project.Slug
        } | Select-Object -First 1

        if ($null -eq $match) {
            throw "Final verification failed for Sentry project: $($project.Slug)"
        }
        Write-Host "[OK] $($project.Slug)"
    }

    Write-Host ""
    Write-Host "Sentry factory reset completed successfully."
    Write-Host "Created projects: $($createdProjects.Count)"
    if ($SkipEas) {
        Write-Host "EAS synchronization was skipped."
    }
    else {
        Write-Host "EAS environments synchronized: $($EasEnvironments -join ', ')"
    }
}
finally {
    Remove-Item Env:SENTRY_AUTH_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_URL -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_FORCE_ENV_TOKEN -ErrorAction SilentlyContinue
    $script:SentryToken = $null
}
