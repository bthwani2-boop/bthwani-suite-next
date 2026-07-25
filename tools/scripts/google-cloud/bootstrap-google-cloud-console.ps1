# tools/scripts/google-cloud/bootstrap-google-cloud-console.ps1
# Bootstrap Google Cloud access and Maps prerequisites without storing secrets in Git.

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z][a-z0-9-]{4,28}[a-z0-9]$')]
    [string] $ProjectId,

    [string] $BillingAccountId,

    [string] $GrantPrincipalEmail,

    [ValidateSet('read-only', 'maps-setup', 'billing-linker')]
    [string] $AccessProfile = 'maps-setup',

    [switch] $Login,
    [switch] $LinkBilling,
    [switch] $EnableMapsSdkAndroid,
    [switch] $GrantConsoleAccess,
    [switch] $DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

function Write-Step {
    param([Parameter(Mandatory)][string] $Message)
    Write-Host "`n== $Message ==" -ForegroundColor Cyan
}

function Invoke-CommandChecked {
    param(
        [Parameter(Mandatory)][string] $Command,
        [Parameter(Mandatory)][string[]] $Arguments,
        [switch] $AllowFailure
    )

    $rendered = "$Command $($Arguments -join ' ')"
    if ($DryRun) {
        Write-Host "DRY-RUN: $rendered" -ForegroundColor DarkYellow
        return ''
    }

    Write-Host "> $rendered" -ForegroundColor DarkGray
    $output = & $Command @Arguments 2>&1
    $exitCode = [int]$global:LASTEXITCODE
    $text = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
    if ($text) { Write-Host $text }
    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "Command failed with exit code ${exitCode}: $rendered"
    }
    return $text
}

function Test-GcloudInstalled {
    $cmd = Get-Command gcloud -ErrorAction SilentlyContinue
    if (-not $cmd) {
        throw @'
gcloud CLI is not installed or not on PATH.
Install Google Cloud CLI, restart PowerShell, then rerun this script:
https://cloud.google.com/sdk/docs/install
'@
    }
}

function Get-ProjectRolesForProfile {
    param([Parameter(Mandatory)][string] $Profile)

    switch ($Profile) {
        'read-only' {
            return @('roles/viewer')
        }
        'maps-setup' {
            return @(
                'roles/viewer',
                'roles/serviceusage.serviceUsageAdmin',
                'roles/serviceusage.apiKeysAdmin'
            )
        }
        'billing-linker' {
            return @(
                'roles/viewer',
                'roles/serviceusage.serviceUsageAdmin',
                'roles/serviceusage.apiKeysAdmin',
                'roles/billing.projectManager'
            )
        }
    }
}

function Assert-EmailValue {
    param([Parameter(Mandatory)][string] $Email)
    if ($Email -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
        throw "Invalid email address: $Email"
    }
}

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' BTHWANI GOOGLE CLOUD CONSOLE BOOTSTRAP' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "Project:        $ProjectId"
Write-Host "Access profile: $AccessProfile"
Write-Host "Dry run:        $DryRun"

Test-GcloudInstalled

if ($Login) {
    Write-Step 'Authenticate gcloud'
    Invoke-CommandChecked -Command 'gcloud' -Arguments @('auth', 'login') | Out-Null
}

Write-Step 'Current gcloud account'
Invoke-CommandChecked -Command 'gcloud' -Arguments @('auth', 'list', '--filter=status:ACTIVE', '--format=value(account)') | Out-Null

Write-Step 'Select project'
Invoke-CommandChecked -Command 'gcloud' -Arguments @('config', 'set', 'project', $ProjectId) | Out-Null
Invoke-CommandChecked -Command 'gcloud' -Arguments @('projects', 'describe', $ProjectId, '--format=value(projectId)') | Out-Null

if ($GrantConsoleAccess) {
    if ([string]::IsNullOrWhiteSpace($GrantPrincipalEmail)) {
        throw '-GrantConsoleAccess requires -GrantPrincipalEmail.'
    }
    Assert-EmailValue -Email $GrantPrincipalEmail
    $member = "user:$GrantPrincipalEmail"
    $roles = Get-ProjectRolesForProfile -Profile $AccessProfile

    Write-Step "Grant project IAM roles to $GrantPrincipalEmail"
    foreach ($role in $roles) {
        Invoke-CommandChecked -Command 'gcloud' -Arguments @(
            'projects', 'add-iam-policy-binding', $ProjectId,
            '--member', $member,
            '--role', $role,
            '--condition', 'None'
        ) | Out-Null
    }

    if (-not [string]::IsNullOrWhiteSpace($BillingAccountId) -and $AccessProfile -eq 'billing-linker') {
        Write-Step "Grant billing account user to $GrantPrincipalEmail"
        Invoke-CommandChecked -Command 'gcloud' -Arguments @(
            'billing', 'accounts', 'add-iam-policy-binding', $BillingAccountId,
            '--member', $member,
            '--role', 'roles/billing.user'
        ) | Out-Null
    }
}

if ($LinkBilling) {
    if ([string]::IsNullOrWhiteSpace($BillingAccountId)) {
        Write-Step 'Available billing accounts'
        Invoke-CommandChecked -Command 'gcloud' -Arguments @('billing', 'accounts', 'list') | Out-Null
        throw 'Provide -BillingAccountId to link billing to the project.'
    }

    Write-Step 'Link billing account to project'
    Invoke-CommandChecked -Command 'gcloud' -Arguments @(
        'billing', 'projects', 'link', $ProjectId,
        '--billing-account', $BillingAccountId
    ) | Out-Null
}

if ($EnableMapsSdkAndroid) {
    Write-Step 'Enable Google Cloud services required for Android Maps API keys'
    Invoke-CommandChecked -Command 'gcloud' -Arguments @(
        'services', 'enable',
        'serviceusage.googleapis.com',
        'apikeys.googleapis.com',
        'maps-android-backend.googleapis.com',
        '--project', $ProjectId
    ) | Out-Null
}

Write-Step 'Billing state'
Invoke-CommandChecked -Command 'gcloud' -Arguments @('billing', 'projects', 'describe', $ProjectId) -AllowFailure | Out-Null

Write-Step 'Enabled Maps-related services'
Invoke-CommandChecked -Command 'gcloud' -Arguments @(
    'services', 'list',
    '--enabled',
    '--filter=NAME:(apikeys.googleapis.com OR maps-android-backend.googleapis.com)',
    '--project', $ProjectId
) -AllowFailure | Out-Null

Write-Host "`nPASS: Google Cloud console bootstrap checks completed for $ProjectId." -ForegroundColor Green
Write-Host 'Next: run tools/scripts/google-cloud/create-android-maps-api-key.ps1 after you have the EAS SHA-1 fingerprint.'
