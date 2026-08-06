[CmdletBinding()]
param(
  [ValidateSet("Plan", "Apply", "Verify")]
  [string]$Mode = "Plan",

  [string]$Branch = "abbas",

  [int]$RulesetId = 18292744,

  [switch]$CommitAndPush,

  [switch]$ApplyLiveRuleset,

  [switch]$WaitForCi,

  [switch]$RunFullVerification,

  [ValidateRange(5, 180)]
  [int]$CiTimeoutMinutes = 45
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$node = (Get-Command node -ErrorAction Stop).Source
$arguments = [System.Collections.Generic.List[string]]::new()
$arguments.Add((Join-Path $root "tools/scripts/repair-agent-system.mjs"))
$arguments.Add("--mode")
$arguments.Add($Mode.ToLowerInvariant())
$arguments.Add("--branch")
$arguments.Add($Branch)
$arguments.Add("--ruleset-id")
$arguments.Add([string]$RulesetId)
$arguments.Add("--ci-timeout-minutes")
$arguments.Add([string]$CiTimeoutMinutes)

if ($CommitAndPush) { $arguments.Add("--commit-push") }
if ($ApplyLiveRuleset) { $arguments.Add("--apply-live-ruleset") }
if ($WaitForCi) { $arguments.Add("--wait-ci") }
if ($RunFullVerification) { $arguments.Add("--full") }

Push-Location $root
try {
  & $node @arguments
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
