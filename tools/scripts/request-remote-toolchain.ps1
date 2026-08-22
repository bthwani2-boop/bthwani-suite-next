[CmdletBinding()]
param(
  [ValidateSet(
    "ci-affected", "ci-full", "ci-runtime", "ci-journey",
    "codeql-full", "codeql-hygiene-audit", "codeql-hygiene-repair",
    "sonar-full", "security-full", "gitleaks", "osv", "trivy", "actionlint", "zizmor", "pinact", "shellcheck", "hadolint", "yamllint",
    "dependency-review", "lockfile-integrity", "opencodereview", "semgrep-full", "semgrep-diff", "dependabot-audit", "remote-evidence", "toolchain-full"
  )]
  [string]$Command = "toolchain-full",

  [string]$TargetRef = "",
  [string]$ExpectedSha = "",
  [string]$BaseRef = "",
  [string]$Journey = "",
  [string]$Model = "",
  [switch]$NoWait,
  [ValidateRange(1, 720)]
  [int]$TimeoutMinutes = 360
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-GhText {
  param([Parameter(Mandatory)][string[]]$Arguments)
  $output = & gh @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $text = ($output | Out-String).Trim()
  if ($exitCode -ne 0) {
    throw "gh failed ($exitCode): gh $($Arguments -join ' ')`n$text"
  }
  return $text
}

$null = Get-Command gh -ErrorAction Stop
Invoke-GhText -Arguments @("auth", "status") | Out-Null

$repo = if (-not [string]::IsNullOrWhiteSpace($env:BTHWANI_GITHUB_REPOSITORY)) {
  $env:BTHWANI_GITHUB_REPOSITORY.Trim()
} else {
  Invoke-GhText -Arguments @("repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner")
}
if ([string]::IsNullOrWhiteSpace($repo) -or $repo -notmatch "^[^/]+/[^/]+$") {
  throw "Unable to resolve GitHub repository. Set BTHWANI_GITHUB_REPOSITORY=owner/repo if needed."
}

if ([string]::IsNullOrWhiteSpace($TargetRef)) {
  if (-not [string]::IsNullOrWhiteSpace($env:BTHWANI_REMOTE_TARGET_REF)) {
    $TargetRef = $env:BTHWANI_REMOTE_TARGET_REF.Trim()
  } else {
    $git = Get-Command git -ErrorAction SilentlyContinue
    if ($null -ne $git) {
      $TargetRef = (& git branch --show-current 2>$null | Out-String).Trim()
    }
  }
}
if ([string]::IsNullOrWhiteSpace($TargetRef)) {
  throw "TargetRef is required when the local checkout is detached. Supply -TargetRef or BTHWANI_REMOTE_TARGET_REF."
}

$encodedRef = [Uri]::EscapeDataString($TargetRef)
$liveSha = Invoke-GhText -Arguments @("api", "-H", "X-GitHub-Api-Version: 2022-11-28", "/repos/$repo/branches/$encodedRef", "--jq", ".commit.sha")
if ($liveSha -notmatch "^[0-9a-fA-F]{40}$") {
  throw "GitHub did not return a full SHA for $TargetRef."
}
if ([string]::IsNullOrWhiteSpace($ExpectedSha)) {
  $ExpectedSha = $liveSha
} elseif ($ExpectedSha -ne $liveSha) {
  throw "Target moved: $TargetRef expected=$ExpectedSha live=$liveSha"
}

if ($Command -eq "ci-journey" -and [string]::IsNullOrWhiteSpace($Journey)) {
  throw "ci-journey requires -Journey."
}

$body = [ordered]@{
  schema_version = 2
  command = $Command
  target_ref = $TargetRef
  expected_sha = $ExpectedSha
}
if (-not [string]::IsNullOrWhiteSpace($BaseRef)) { $body.base_ref = $BaseRef }
if (-not [string]::IsNullOrWhiteSpace($Journey)) { $body.journey = $Journey }
if (-not [string]::IsNullOrWhiteSpace($Model)) { $body.model = $Model }
$json = $body | ConvertTo-Json -Compress

$issueUrl = Invoke-GhText -Arguments @("issue", "create", "--repo", $repo, "--title", "[remote-command]", "--body", $json)
Write-Output "remote_command=$Command"
Write-Output "target=$TargetRef@$ExpectedSha"
Write-Output "issue=$issueUrl"
Write-Output "execution_authority=GITHUB_REMOTE_ONLY"

if ($NoWait) { return }

$deadline = [DateTimeOffset]::UtcNow.AddMinutes($TimeoutMinutes)
while ([DateTimeOffset]::UtcNow -lt $deadline) {
  $snapshotText = Invoke-GhText -Arguments @("issue", "view", $issueUrl, "--repo", $repo, "--json", "state,comments")
  $snapshot = $snapshotText | ConvertFrom-Json
  $botComments = @($snapshot.comments | Where-Object { $_.author.login -eq "github-actions" -or $_.author.login -eq "github-actions[bot]" })
  foreach ($comment in ($botComments | Select-Object -Last 5)) {
    $text = [string]$comment.body
    if ($text -match 'completed with \*\*([^*]+)\*\*') {
      $conclusion = $Matches[1].Trim()
      Write-Output "remote_conclusion=$conclusion"
      if ($conclusion -eq "success") { return }
      throw "Remote command completed with $conclusion. See $issueUrl"
    }
  }
  if ([string]$snapshot.state -eq "CLOSED") {
    Write-Output "remote_conclusion=success"
    return
  }
  Start-Sleep -Seconds 10
}

throw "Timed out after $TimeoutMinutes minutes waiting for remote command. See $issueUrl"
