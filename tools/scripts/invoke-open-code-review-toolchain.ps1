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
  $command = Get-Command ocr -ErrorAction Stop
  $version = (& $command.Source --version 2>&1 | Out-String).Trim()
  if ($version -notmatch '1\.8\.8') {
    throw "OpenCodeReview version drift. Expected 1.8.8, got: $version"
  }

  $rulePath = ".opencodereview/rule.json"
  $rule = Get-Content -LiteralPath $rulePath -Raw | ConvertFrom-Json
  $requiredExclusions = @(
    "**/graphify-out/**", "**/.diagnostics/**", "**/.nx/**",
    "**/.pnpm-store/**", "**/.cache/**", "**/.turbo/**",
    "**/.yagni-out/**", "**/.artifacts/**", "**/*.log",
    "**/*.bak", "**/*.graphify-bak"
  )
  foreach ($pattern in $requiredExclusions) {
    if ($pattern -notin @($rule.exclude)) { throw "OCR exclusion missing: $pattern" }
  }

  $before = (& git status --porcelain=v1 --untracked-files=all | Out-String)
  if ($Mode -eq "Full") {
    & $command.Source delegate preview --rule $rulePath
    if ($LASTEXITCODE -ne 0) { throw "OCR delegation preview failed." }
  }
  $after = (& git status --porcelain=v1 --untracked-files=all | Out-String)
  if ($before -ne $after) { throw "OCR changed repository state during verification." }

  Write-Output "ocr_version=$version"
  Write-Output "rule_file=$rulePath"
  Write-Output "decision=PASS"
}
finally {
  Pop-Location
}
