#Requires -Version 7.4
[CmdletBinding()]
param(
  [ValidateSet("Verify", "Full")]
  [string]$Mode = "Full",
  [switch]$InstallDependencies
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-StrictMode -Version Latest

function Invoke-Checked {
  param(
    [Parameter(Mandatory)][string]$Command,
    [string[]]$Arguments = @()
  )

  Write-Host "> $Command $($Arguments -join ' ')" -ForegroundColor DarkCyan
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code $LASTEXITCODE`: $Command $($Arguments -join ' ')"
  }
}

function Invoke-PnpmScript {
  param([Parameter(Mandatory)][string]$Name)
  Invoke-Checked -Command "pnpm" -Arguments @("run", $Name)
}

function Assert-Contains {
  param(
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][string]$Pattern,
    [Parameter(Mandatory)][string]$Failure
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Required file is missing: $Path"
  }
  $content = Get-Content -LiteralPath $Path -Raw
  if ($content -notmatch $Pattern) {
    throw $Failure
  }
}

$root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Push-Location $root
try {
  foreach ($requiredCommand in @("git", "node", "pnpm", "go", "pwsh", "graphify", "lean-ctx", "ocr")) {
    if (-not (Get-Command $requiredCommand -ErrorAction SilentlyContinue)) {
      throw "Required command is unavailable: $requiredCommand"
    }
  }

  $branch = (& git branch --show-current).Trim()
  if ($branch -ne "smsm") {
    throw "Expected branch 'smsm', current branch is '$branch'."
  }

  $initialStatus = (& git status --porcelain=v1 --untracked-files=all | Out-String).Trim()
  if ($initialStatus) {
    throw "Working tree must be clean before verification.`n$initialStatus"
  }

  Invoke-Checked -Command "git" -Arguments @("fetch", "origin", "--prune")
  $localSha = (& git rev-parse HEAD).Trim()
  $remoteSha = (& git rev-parse origin/smsm).Trim()
  if ($localSha -ne $remoteSha) {
    throw "Local smsm is not synchronized with origin/smsm. local=$localSha remote=$remoteSha"
  }

  if (Test-Path -LiteralPath "go.work" -PathType Leaf) {
    throw "Root go.work must not exist unless it governs every Go module."
  }
  if (Test-Path -LiteralPath "go.work.sum" -PathType Leaf) {
    throw "Root go.work.sum remains after go.work removal."
  }

  Assert-Contains `
    -Path "services/dsh/backend/internal/http/provider_rating_routes.go" `
    -Pattern 'Dimensions\s+string\s+`json:"dimensions"`' `
    -Failure "Partner field rating input does not expose dimensions."

  Assert-Contains `
    -Path "services/dsh/backend/internal/http/provider_rating_routes.go" `
    -Pattern 'input\.Score,\s*input\.Comment,\s*input\.Dimensions,\s*correlationID\(r\)' `
    -Failure "SubmitPartnerFieldRating is not called with dimensions."

  $graphifyIgnore = Get-Content -LiteralPath ".graphifyignore" -Raw
  if ($graphifyIgnore -match '(?m)^apps/control-panel/runtime/\s*$') {
    throw ".graphifyignore excludes the entire control-panel runtime."
  }

  $geminiSettings = Get-Content -LiteralPath ".gemini/settings.json" -Raw
  if ($geminiSettings -match '(?i)C:/Users/|C:\\Users\\|hook-guard\s+gemini') {
    throw "Gemini tracked configuration contains a personal path or unsupported Graphify hook command."
  }
  if (Test-Path -LiteralPath ".gemini/settings.json.graphify-bak") {
    throw "Tracked or local Gemini Graphify backup remains."
  }

  $ocrRule = Get-Content -LiteralPath ".opencodereview/rule.json" -Raw | ConvertFrom-Json
  foreach ($requiredExclusion in @(
    "**/graphify-out/**",
    "**/.diagnostics/**",
    "**/.nx/**",
    "**/.pnpm-store/**",
    "**/.cache/**",
    "**/.turbo/**",
    "**/.yagni-out/**",
    "**/.artifacts/**",
    "**/*.log",
    "**/*.bak",
    "**/*.graphify-bak"
  )) {
    if ($requiredExclusion -notin @($ocrRule.exclude)) {
      throw "OpenCodeReview exclusion is missing: $requiredExclusion"
    }
  }

  if ($InstallDependencies) {
    Invoke-Checked -Command "pnpm" -Arguments @("install", "--frozen-lockfile")
  }

  foreach ($scriptName in @(
    "database:dsh:contract",
    "guard:migration-manifest-drift",
    "guard:guard-registry",
    "guard:required-command-integrity",
    "guard:dsh-route-permission-binding",
    "guard:backend-api-binding",
    "openapi:verify:dsh",
    "openapi:verify:wlt"
  )) {
    Invoke-PnpmScript -Name $scriptName
  }

  $goModules = @(
    "services/dsh/backend",
    "services/wlt/backend",
    "core/identity/backend",
    "core/workforce/backend",
    "core/platform-control/backend",
    "core/providers/backend"
  )
  $previousGoWork = $env:GOWORK
  try {
    $env:GOWORK = "off"
    foreach ($module in $goModules) {
      if (-not (Test-Path -LiteralPath (Join-Path $module "go.mod") -PathType Leaf)) {
        throw "Go module is missing: $module"
      }
      Push-Location $module
      try {
        Invoke-Checked -Command "go" -Arguments @("build", "./...")
      }
      finally {
        Pop-Location
      }
    }
  }
  finally {
    if ($null -eq $previousGoWork) {
      Remove-Item Env:GOWORK -ErrorAction SilentlyContinue
    } else {
      $env:GOWORK = $previousGoWork
    }
  }

  if ($Mode -eq "Full") {
    Invoke-PnpmScript -Name "toolchain:ai:full"
    Invoke-PnpmScript -Name "database:dsh:test"
    Invoke-PnpmScript -Name "guard:foundation"
    Invoke-PnpmScript -Name "guard:journey"
    Invoke-PnpmScript -Name "guard:governance-all"
  } else {
    Invoke-PnpmScript -Name "toolchain:ai:verify"
  }

  Invoke-Checked -Command "git" -Arguments @("diff", "--check")

  $finalSha = (& git rev-parse HEAD).Trim()
  $finalStatus = (& git status --porcelain=v1 --untracked-files=all | Out-String).Trim()
  if ($finalSha -ne $localSha) {
    throw "HEAD changed during verification. start=$localSha end=$finalSha"
  }
  if ($finalStatus) {
    throw "Verification changed the working tree.`n$finalStatus"
  }

  Write-Host ""
  Write-Host "verified_sha=$finalSha" -ForegroundColor Green
  Write-Host "graphify_scope=application-code" -ForegroundColor Green
  Write-Host "decision=PASS" -ForegroundColor Green
}
finally {
  Pop-Location
}
