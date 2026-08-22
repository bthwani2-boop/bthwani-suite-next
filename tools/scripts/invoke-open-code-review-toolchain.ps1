[CmdletBinding()]
param(
  [ValidateSet("Setup", "Repair", "Version", "Verify", "DelegatePreview", "DelegateRules", "DelegateAudit", "Full")]
  [string]$Mode = "Setup",
  [string[]]$Path = @(),
  [string]$From = "",
  [string]$To = "HEAD",
  [switch]$SkipInstall,
  [string]$TargetRef = "",
  [string]$ExpectedSha = "",
  [string]$BaseRef = "",
  [string]$Model = "",
  [switch]$NoWait
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RemoteClient = Join-Path $Root "tools/scripts/request-remote-toolchain.ps1"
$RulePath = Join-Path $Root ".opencodereview/rule.json"
$ExpectedRemoteVersion = "1.9.9"

function Test-RemoteControlPrerequisites {
  $null = Get-Command gh -ErrorAction Stop
  & gh auth status 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "GitHub CLI authentication is required for remote OpenCodeReview control." }
  if (-not (Test-Path -LiteralPath $RulePath -PathType Leaf)) { throw "Missing canonical OpenCodeReview rules: $RulePath" }
  if (-not (Test-Path -LiteralPath $RemoteClient -PathType Leaf)) { throw "Missing remote toolchain client: $RemoteClient" }
  Write-Output "opencodereview_execution=GITHUB_REMOTE_ONLY"
  Write-Output "opencodereview_remote_version=$ExpectedRemoteVersion"
  Write-Output "opencodereview_workflow=.github/workflows/open-code-review.yml"
  Write-Output "local_ocr_installation=NOT_REQUIRED"
  Write-Output "local_ocr_execution=FORBIDDEN_BY_PROJECT_CONTROL_PATH"
}

Push-Location $Root
try {
  switch ($Mode) {
    "Setup" {
      Test-RemoteControlPrerequisites
      return
    }
    "Repair" {
      Test-RemoteControlPrerequisites
      return
    }
    "Version" {
      Write-Output "opencodereview_execution=GITHUB_REMOTE_ONLY"
      Write-Output "opencodereview_remote_version=$ExpectedRemoteVersion"
      Write-Output "opencodereview_workflow=.github/workflows/open-code-review.yml"
      return
    }
  }

  Test-RemoteControlPrerequisites

  if (@($Path).Count -gt 0) {
    throw "-Path is not supported by the remote-only OCR authority. Review is candidate-bound and diff-scoped by GitHub base/head refs."
  }

  if ([string]::IsNullOrWhiteSpace($BaseRef) -and -not [string]::IsNullOrWhiteSpace($From)) {
    $BaseRef = $From
  }
  if ([string]::IsNullOrWhiteSpace($TargetRef) -and -not [string]::IsNullOrWhiteSpace($To) -and $To -ne "HEAD") {
    $TargetRef = $To
  }

  $request = @{
    Command = "opencodereview"
    TargetRef = $TargetRef
    ExpectedSha = $ExpectedSha
    BaseRef = $BaseRef
    Model = $Model
    NoWait = $NoWait
  }
  & $RemoteClient @request
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
  Pop-Location
}
