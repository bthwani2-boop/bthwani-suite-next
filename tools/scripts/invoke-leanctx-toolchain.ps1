[CmdletBinding()]
param(
  [ValidateSet("Verify", "Repair", "Full")]
  [string]$Mode = "Verify"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Push-Location $root
try {
  $command = Get-Command lean-ctx -ErrorAction Stop
  $version = (& $command.Source --version 2>&1 | Out-String).Trim()
  if (-not $version) { throw "LeanCTX returned an empty version." }

  $config = Get-Content -LiteralPath ".lean-ctx.toml" -Raw
  $required = @(
    'shell_activation = "agents-only"',
    'cache_policy = "safe"',
    'tool_profile = "power"',
    'enable_wakeup_ctx = false',
    'auto_capture = false',
    'journal_enabled = false',
    'contribute_enabled = false'
  )
  foreach ($marker in $required) {
    if (-not $config.Contains($marker)) { throw "LeanCTX safe policy marker missing: $marker" }
  }

  if ($Mode -in @("Repair", "Full")) {
    & $command.Source trust
    if ($LASTEXITCODE -ne 0) { throw "LeanCTX trust failed." }
  }

  & $command.Source doctor
  if ($LASTEXITCODE -ne 0) {
    if ($config.Contains("update_check_disabled = true")) {
      Write-Warning "LeanCTX doctor reported a non-core issue while update checks are intentionally disabled."
    } else {
      throw "LeanCTX doctor failed."
    }
  }
  & $command.Source status
  if ($LASTEXITCODE -ne 0) { throw "LeanCTX status failed." }

  Write-Output "leanctx_version=$version"
  Write-Output "decision=PASS"
}
finally {
  Pop-Location
}
