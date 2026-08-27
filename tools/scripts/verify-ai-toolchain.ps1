[CmdletBinding()]
param(
  [ValidateSet("Verify", "Full")]
  [string]$Mode = "Verify",

  [ValidateSet("antigravity-implementer", "graphify", "leanctx")]
  [string[]]$Require = @()
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Push-Location $Root

try {
  $StartHead = (& git rev-parse HEAD).Trim()
  $StartStatus = (& git status --porcelain=v1 --untracked-files=all | Out-String)

  foreach ($Tool in $Require) {
    switch ($Tool) {
      "antigravity-implementer" { & node tools/scripts/invoke-antigravity-implementer.mjs --diagnostic-only }
      "graphify" { & (Join-Path $PSScriptRoot "invoke-graphify-toolchain.ps1") -Mode Verify }
      "leanctx" { & (Join-Path $PSScriptRoot "invoke-leanctx-toolchain.ps1") -Mode Verify }
    }
    if ($LASTEXITCODE -ne 0) { throw "Required optional tool failed: $Tool" }
  }

  if ($Mode -eq "Full" -and $Require.Count -eq 0) {
    Write-Output "No optional AI tool was requested; nothing to verify."
  }

  $EndHead = (& git rev-parse HEAD).Trim()
  $EndStatus = (& git status --porcelain=v1 --untracked-files=all | Out-String)
  if ($StartHead -ne $EndHead) { throw "HEAD changed during tool verification." }
  if ($StartStatus -ne $EndStatus) { throw "Working tree changed during tool verification." }

  Write-Output "verified_sha=$EndHead"
  Write-Output "required_tools=$($Require -join ',')"
  Write-Output "decision=PASS"
}
finally {
  Pop-Location
}
