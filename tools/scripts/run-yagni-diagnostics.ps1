Set-Location -LiteralPath "$PSScriptRoot\..\.."
$ErrorActionPreference = "Continue"

$SessionId = "YAGNI-DIAG-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$OutRoot = Join-Path (Get-Location) ".diagnostics\yagni\$SessionId"
New-Item -ItemType Directory -Force -Path $OutRoot | Out-Null

$checks = @(
  @{ Name = "ast-structural-rules"; Command = "pnpm run guard:ast-grep-rules" },
  @{ Name = "runtime-anti-stub"; Command = "pnpm run guard:runtime-real-bindings" },
  @{ Name = "runtime-config"; Command = "pnpm run guard:runtime-config" },
  @{ Name = "repository-structure"; Command = "pnpm run guard:repo-structure" },
  @{ Name = "orphan-files"; Command = "pnpm run diagnostics:orphan-files" }
)

$results = New-Object System.Collections.Generic.List[object]
foreach ($check in $checks) {
  $log = Join-Path $OutRoot ($check.Name + ".log")
  $output = & pwsh -NoProfile -Command $check.Command 2>&1
  $exit = $LASTEXITCODE
  $output | Set-Content -LiteralPath $log -Encoding UTF8
  $results.Add([pscustomobject]@{
    name = $check.Name
    command = $check.Command
    status = if ($exit -eq 0) { "PASS" } else { "FINDING" }
    exitCode = $exit
    log = (Resolve-Path -Relative $log)
  }) | Out-Null
}

$Json = Join-Path $OutRoot "yagni-diagnostics.json"
$Report = Join-Path $OutRoot "YAGNI_DIAGNOSTICS.md"
$results | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Json -Encoding UTF8

$md = @(
  "# BThwani YAGNI Diagnostics",
  "",
  "This report is derived diagnostic output. It creates no policy, approval, or runtime truth.",
  "",
  "Session: ``$SessionId``",
  "",
  "| Check | Command | Status | Exit | Log |",
  "|---|---|---|---:|---|"
)
foreach ($r in $results) {
  $md += "| $($r.name) | ``$($r.command)`` | $($r.status) | $($r.exitCode) | ``$($r.log)`` |"
}
$md -join "`n" | Set-Content -LiteralPath $Report -Encoding UTF8

Write-Host "RESULT: DIAGNOSTIC_COMPLETE"
Write-Host "Evidence: $OutRoot"
Write-Host "Report:   $Report"
Write-Host "Canonical enforcement remains with the registered guards above; this wrapper does not upgrade their assurance."
