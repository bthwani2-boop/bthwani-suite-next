Set-Location -LiteralPath "$PSScriptRoot\..\.."

$ErrorActionPreference = "Continue"

$SessionId = "YAGNI-DIAG-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$OutRoot = Join-Path (Get-Location) ".yagni-out\$SessionId"
New-Item -ItemType Directory -Force -Path $OutRoot | Out-Null

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param([string]$Name, [string]$Status, [string]$Evidence)
  $script:results.Add([pscustomobject]@{
    name = $Name
    status = $Status
    evidence = $Evidence
  }) | Out-Null
}

function Has-Command {
  param([string]$Name)
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

foreach ($cmd in @("git","node","pnpm","nx","go","graphify","semgrep","reviewdog","aider","deadcode","gopls","sg")) {
  $found = Has-Command $cmd
  if ($found) {
    Add-Result "cmd:$cmd" "PASS" $found
  } else {
    Add-Result "cmd:$cmd" "MISSING" "$cmd not found in PATH"
  }
}

foreach ($path in @(
  ".gitignore",
  ".aiderignore",
  ".semgrepignore",
  "knip.json",
  ".reviewdog.yml",
  ".agents/rules/bthwani-ponytail-yagni.md",
  ".agents/skills/bthwani-ponytail-yagni/SKILL.md",
  "tools/yagni/semgrep/bthwani-yagni.yml",
  "tools/yagni/ast-grep/sgconfig.yml",
  "tools/scripts/run-yagni-diagnostics.ps1"
)) {
  if (Test-Path -LiteralPath $path) {
    Add-Result "file:$path" "PASS" $path
  } else {
    Add-Result "file:$path" "MISSING" $path
  }
}

$Json = Join-Path $OutRoot "yagni-diagnostics.json"
$Report = Join-Path $OutRoot "YAGNI_DIAGNOSTICS.md"

$results | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Json -Encoding UTF8

$md = @()
$md += "# BTHWANI YAGNI DIAGNOSTICS"
$md += ""
$md += "Session: $SessionId"
$md += ""
$md += "| Name | Status | Evidence |"
$md += "|---|---|---|"
foreach ($r in $results) {
  $ev = ($r.evidence -replace "\|", "/" -replace "`r?`n", "<br>")
  $md += "| $($r.name) | $($r.status) | $ev |"
}

$md -join "`n" | Set-Content -LiteralPath $Report -Encoding UTF8

Write-Host "RESULT: DIAGNOSTIC_DONE"
Write-Host "Evidence: $OutRoot"
Write-Host "Report:   $Report"
