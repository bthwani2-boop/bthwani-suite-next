# tools/scripts/google-cloud/prepare-fcm-v1-service-account.ps1
# Prepare one least-privilege FCM V1 service account for the central Firebase
# project. Dry-run is the default. The private key is written only to a secure,
# ignored local path and is never printed.

[CmdletBinding()]
param(
    [ValidatePattern('^[a-z][a-z0-9-]{4,28}[a-z0-9]$')]
    [string] $ProjectId = 'bthwani-platform',

    [ValidatePattern('^[a-z][a-z0-9-]{4,28}[a-z0-9]$')]
    [string] $ServiceAccountId = 'bthwani-fcm-eas',

    [string] $KeyPath = 'C:\bthwani-secrets\firebase\bthwani-platform-fcm-v1-service-account.json',

    [switch] $RotateKey,
    [switch] $Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$FcmService = 'fcm.googleapis.com'
$FcmRole = 'roles/firebasecloudmessaging.admin'
$ServiceAccountEmail = "$ServiceAccountId@$ProjectId.iam.gserviceaccount.com"

function Write-Step {
    param([Parameter(Mandatory)][string] $Message)
    Write-Host "`n== $Message ==" -ForegroundColor Cyan
}

function Invoke-Gcloud {
    param(
        [Parameter(Mandatory)][string[]] $Arguments,
        [switch] $AllowFailure,
        [switch] $CaptureOnly
    )

    $rendered = "gcloud $($Arguments -join ' ')"
    if (-not $Apply) {
        Write-Host "DRY-RUN: $rendered" -ForegroundColor DarkYellow
        return ''
    }

    if (-not $CaptureOnly) { Write-Host "> $rendered" -ForegroundColor DarkGray }
    $output = & gcloud @Arguments 2>&1
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    $text = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
    if ($text -and -not $CaptureOnly) { Write-Host $text }
    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "Command failed with exit code ${exitCode}: $rendered`n$text"
    }
    return $text
}

function Assert-Gcloud {
    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        throw 'gcloud CLI is required and must be available on PATH.'
    }
}

function Test-ServiceAccountExists {
    if (-not $Apply) { return $false }
    $output = Invoke-Gcloud -Arguments @(
        'iam', 'service-accounts', 'describe', $ServiceAccountEmail,
        '--project', $ProjectId,
        '--format=value(email)'
    ) -AllowFailure -CaptureOnly
    return $output.Trim() -eq $ServiceAccountEmail
}

function Assert-SecureKeyPath {
    $resolved = [System.IO.Path]::GetFullPath($KeyPath)
    $repoMarker = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
    if ($resolved.StartsWith($repoMarker, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "FCM service-account keys must not be written inside the repository: $resolved"
    }
    return $resolved
}

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' BTHWANI CENTRAL FCM V1 SERVICE ACCOUNT' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "Project:         $ProjectId"
Write-Host "Service account: $ServiceAccountEmail"
Write-Host "Role:            $FcmRole"
Write-Host "Key path:        $KeyPath"
Write-Host "Rotate key:      $RotateKey"
Write-Host "Mode:            $(if ($Apply) { 'APPLY' } else { 'DRY RUN' })"

Assert-Gcloud
$resolvedKeyPath = Assert-SecureKeyPath

Write-Step 'Select project and enable Firebase Cloud Messaging API'
Invoke-Gcloud -Arguments @('config', 'set', 'project', $ProjectId) | Out-Null
Invoke-Gcloud -Arguments @('services', 'enable', $FcmService, '--project', $ProjectId) | Out-Null

Write-Step 'Create central service account only when missing'
if (Test-ServiceAccountExists) {
    Write-Host "Service account already exists: $ServiceAccountEmail" -ForegroundColor Green
} else {
    Invoke-Gcloud -Arguments @(
        'iam', 'service-accounts', 'create', $ServiceAccountId,
        '--display-name', 'BThwani EAS FCM V1 Sender',
        '--description', 'Central FCM V1 sender credential for the four BThwani Android EAS projects.',
        '--project', $ProjectId
    ) | Out-Null
}

Write-Step 'Grant only Firebase Cloud Messaging API Admin'
Invoke-Gcloud -Arguments @(
    'projects', 'add-iam-policy-binding', $ProjectId,
    '--member', "serviceAccount:$ServiceAccountEmail",
    '--role', $FcmRole,
    '--condition=None',
    '--quiet'
) | Out-Null

Write-Step 'Create or preserve the private key file'
if (-not $Apply) {
    Write-Host "DRY-RUN: key would be created at $resolvedKeyPath only when missing or -RotateKey is supplied." -ForegroundColor DarkYellow
    return
}

if ((Test-Path -LiteralPath $resolvedKeyPath -PathType Leaf) -and -not $RotateKey) {
    Write-Host "Existing secure key preserved: $resolvedKeyPath" -ForegroundColor Green
} else {
    $parent = Split-Path -Parent $resolvedKeyPath
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    if (Test-Path -LiteralPath $resolvedKeyPath -PathType Leaf) {
        $backup = "$resolvedKeyPath.$(Get-Date -Format 'yyyyMMdd-HHmmss').bak"
        Move-Item -LiteralPath $resolvedKeyPath -Destination $backup
        Write-Host "Previous key moved to: $backup" -ForegroundColor Yellow
    }
    Invoke-Gcloud -Arguments @(
        'iam', 'service-accounts', 'keys', 'create', $resolvedKeyPath,
        '--iam-account', $ServiceAccountEmail,
        '--project', $ProjectId
    ) | Out-Null
}

try {
    $key = Get-Content -LiteralPath $resolvedKeyPath -Raw | ConvertFrom-Json -Depth 20
} catch {
    throw "FCM V1 key file is not valid JSON: $resolvedKeyPath"
}
if ([string]$key.project_id -ne $ProjectId) {
    throw "FCM V1 key project mismatch. Expected '$ProjectId', found '$($key.project_id)'."
}
if ([string]$key.client_email -ne $ServiceAccountEmail) {
    throw "FCM V1 key service-account mismatch. Expected '$ServiceAccountEmail'."
}
if ([string]::IsNullOrWhiteSpace([string]$key.private_key)) {
    throw 'FCM V1 key file does not contain a private_key.'
}

Write-Host "`nPASS: central FCM V1 service account and secure key are ready." -ForegroundColor Green
Write-Host 'The key was not printed and must never be committed.' -ForegroundColor Green
Write-Host "Next: run configure-eas-fcm-v1-all-apps.ps1 to attach it to all four EAS Android projects." -ForegroundColor Cyan
