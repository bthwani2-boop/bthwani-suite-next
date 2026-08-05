[CmdletBinding()]
param(
  [ValidateSet("Verify", "Full")]
  [string]$Mode = "Verify"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Push-Location $root
try {
  $startHead = (& git rev-parse HEAD).Trim()
  $startStatus = (& git status --porcelain=v1 --untracked-files=all | Out-String)

  Get-Content package.json -Raw | ConvertFrom-Json | Out-Null
  Get-Content governance/guards/guard-registry.json -Raw | ConvertFrom-Json | Out-Null
  Get-Content services/dsh/database/migrations/manifest.json -Raw | ConvertFrom-Json | Out-Null
  Get-Content services/dsh/database/migrations/manifest.extensions.json -Raw | ConvertFrom-Json | Out-Null
  Get-Content .opencodereview/rule.json -Raw | ConvertFrom-Json | Out-Null
  Get-Content .gemini/settings.json -Raw | ConvertFrom-Json | Out-Null

  $toolMode = if ($Mode -eq "Full") { "Full" } else { "Verify" }
  & (Join-Path $PSScriptRoot "invoke-graphify-toolchain.ps1") -Mode $toolMode
  & (Join-Path $PSScriptRoot "invoke-leanctx-toolchain.ps1") -Mode $toolMode
  & (Join-Path $PSScriptRoot "invoke-open-code-review-toolchain.ps1") -Mode $toolMode

  $commands = @(
    @{ Name = "pnpm"; Args = @("run", "guard:guard-registry") },
    @{ Name = "pnpm"; Args = @("run", "guard:migration-manifest-drift") },
    @{ Name = "pnpm"; Args = @("run", "database:dsh:contract") },
    @{ Name = "pnpm"; Args = @("run", "guard:dsh-route-permission-binding") }
  )
  foreach ($command in $commands) {
    $commandName = [string]$command.Name
    [string[]]$commandArgs = @($command.Args)
    & $commandName @commandArgs
    if ($LASTEXITCODE -ne 0) { throw "Verification command failed: $commandName $($commandArgs -join ' ')" }
  }

  $goModules = @(
    "services/dsh/backend",
    "services/wlt/backend",
    "core/identity/backend",
    "core/workforce/backend",
    "core/platform-control/backend",
    "core/providers/backend"
  )
  foreach ($module in $goModules) {
    if (-not (Test-Path -LiteralPath (Join-Path $module "go.mod"))) { throw "Go module missing: $module" }
    Push-Location $module
    try {
      $env:GOWORK = "off"
      & go build ./...
      if ($LASTEXITCODE -ne 0) { throw "Go build failed: $module" }
    }
    finally {
      Remove-Item Env:GOWORK -ErrorAction SilentlyContinue
      Pop-Location
    }
  }

  $endHead = (& git rev-parse HEAD).Trim()
  $endStatus = (& git status --porcelain=v1 --untracked-files=all | Out-String)
  if ($startHead -ne $endHead) { throw "HEAD changed during verification." }
  if ($startStatus -ne $endStatus) { throw "Working tree changed during verification." }

  Write-Output "verified_sha=$endHead"
  Write-Output "decision=PASS"
}
finally {
  Pop-Location
}
