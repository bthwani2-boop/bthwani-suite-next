[CmdletBinding()]
param(
  [ValidateSet("Verify", "Full")]
  [string]$Mode = "Verify",

  [ValidateSet("antigravity-implementer", "opencode-implementer", "graphify", "leanctx", "open-code-review")]
  [string[]]$Require = @()
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Push-Location $Root

try {
  $StartHead = (& git rev-parse HEAD).Trim()
  $StartStatus = (& git status --porcelain=v1 --untracked-files=all | Out-String)

  $env:BTHWANI_REQUIRED_AI_TOOLS = ($Require -join ",")

  try {
    & node tools/guards/ai-toolchain-environment-gate.mjs

    if ($LASTEXITCODE -ne 0) {
      throw "AI toolchain environment verification failed."
    }

    if ($Mode -eq "Full") {
      foreach ($Tool in $Require) {
        switch ($Tool) {
          "antigravity-implementer" {
            & node tools/scripts/invoke-antigravity-implementer.mjs --diagnostic-only
          }
          "opencode-implementer" {
            & node tools/scripts/invoke-opencode-implementer.mjs --diagnostic-only
          }

          "graphify" {
            & (Join-Path $PSScriptRoot "invoke-graphify-toolchain.ps1") -Mode Verify
          }

          "leanctx" {
            & (Join-Path $PSScriptRoot "invoke-leanctx-toolchain.ps1") -Mode Verify
          }

          "open-code-review" {
            & (Join-Path $PSScriptRoot "invoke-open-code-review-toolchain.ps1") -Mode Verify
          }
        }

        if ($LASTEXITCODE -ne 0) {
          throw "Required optional tool failed: $Tool"
        }
      }
    }
  }
  finally {
    Remove-Item Env:BTHWANI_REQUIRED_AI_TOOLS -ErrorAction SilentlyContinue
  }

  $EndHead = (& git rev-parse HEAD).Trim()
  $EndStatus = (& git status --porcelain=v1 --untracked-files=all | Out-String)

  if ($StartHead -ne $EndHead) {
    throw "HEAD changed during tool verification."
  }

  if ($StartStatus -ne $EndStatus) {
    throw "Working tree changed during tool verification."
  }

  Write-Output "verified_sha=$EndHead"
  Write-Output "decision=PASS"
}
finally {
  Pop-Location
}
