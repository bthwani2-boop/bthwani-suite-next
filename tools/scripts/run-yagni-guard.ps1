Set-Location -LiteralPath "C:\bthwani-suite-next"

$ErrorActionPreference = "Continue"

$Strict = $args -contains "-Strict"
$SessionId = "YAGNI-GUARD-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$OutRoot = Join-Path (Get-Location) ".yagni-out\$SessionId"
New-Item -ItemType Directory -Force -Path $OutRoot | Out-Null

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param([string]$Name, [string]$Status, [string]$Evidence, [string]$Command)
  $script:results.Add([pscustomobject]@{
    name = $Name
    status = $Status
    evidence = $Evidence
    command = $Command
  }) | Out-Null
}

function Run-Step {
  param(
    [string]$Name,
    [scriptblock]$Block,
    [string]$OutFile,
    [string]$Command,
    [bool]$Required = $false
  )

  Write-Host "[ RUN ] $Name"

  try {
    & $Block *> $OutFile
    $code = $LASTEXITCODE
    if ($null -eq $code) { $code = 0 }

    if ($code -eq 0) {
      Write-Host "[ OK  ] $Name"
      Add-Result $Name "PASS" $OutFile $Command
    } else {
      $status = if ($Required) { "FAIL" } else { "WARN" }
      Write-Host "[ $status ] $Name exit=$code"
      Add-Result $Name $status $OutFile $Command
    }
  } catch {
    $_ | Out-File -FilePath $OutFile -Encoding UTF8
    $status = if ($Required) { "FAIL" } else { "WARN" }
    Write-Host "[ $status ] $Name"
    Add-Result $Name $status $OutFile $Command
  }
}

$CodeRoots = @("apps","shared","services","core","contracts","tools") | Where-Object {
  Test-Path -LiteralPath $_
}

Add-Result "code-roots" "PASS" ($CodeRoots -join ", ") "bounded roots only"

Run-Step "git-diff-check" {
  git --no-pager diff --check
} (Join-Path $OutRoot "git-diff-check.txt") "git --no-pager diff --check" $true

Run-Step "git-status" {
  git status --short
} (Join-Path $OutRoot "git-status.txt") "git status --short" $false

Run-Step "git-diff-stat" {
  git --no-pager diff --stat
} (Join-Path $OutRoot "git-diff-stat.txt") "git --no-pager diff --stat" $false

Run-Step "knip" {
  pnpm exec knip --config knip.json
} (Join-Path $OutRoot "knip.txt") "pnpm exec knip --config knip.json" $false

Run-Step "semgrep-yagni" {
  semgrep scan --config tools/yagni/semgrep/bthwani-yagni.yml
} (Join-Path $OutRoot "semgrep.txt") "semgrep scan --config tools/yagni/semgrep/bthwani-yagni.yml" $false

Run-Step "ast-grep" {
  pnpm exec sg scan apps shared services core contracts tools --config tools/yagni/ast-grep/sgconfig.yml
} (Join-Path $OutRoot "ast-grep.txt") "pnpm exec sg scan apps shared services core contracts tools --config tools/yagni/ast-grep/sgconfig.yml" $false

Run-Step "go-deadcode" {
  pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/run-go-deadcode.ps1
} (Join-Path $OutRoot "go-deadcode-wrapper.txt") "pwsh -File tools/scripts/run-go-deadcode.ps1" $false

$Json = Join-Path $OutRoot "yagni-results.json"
$Report = Join-Path $OutRoot "YAGNI_REPORT.md"

$results | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Json -Encoding UTF8

$md = @()
$md += "# BTHWANI YAGNI GUARD REPORT"
$md += ""
$md += "Session: $SessionId"
$md += "Strict: $Strict"
$md += ""
$md += "| Name | Status | Evidence | Command |"
$md += "|---|---|---|---|"
foreach ($r in $results) {
  $ev = ($r.evidence -replace "\|", "/" -replace "`r?`n", "<br>")
  $cmd = ($r.command -replace "\|", "/" -replace "`r?`n", "<br>")
  $md += "| $($r.name) | $($r.status) | $ev | $cmd |"
}

$md += ""
$md += "## Forbidden scan paths"
$md += ""
$md += "node_modules, .pnpm-store, .next, .expo, dist, build, coverage, graphify-out, .yagni-out, .nx, .cache, .gocache*, .gomodcache*, tools/registry/runs"

$md -join "`n" | Set-Content -LiteralPath $Report -Encoding UTF8

$failures = @($results | Where-Object { $_.status -eq "FAIL" })
$warnings = @($results | Where-Object { $_.status -eq "WARN" })

if ($failures.Count -gt 0) {
  $status = "FAIL"
} elseif ($Strict -and $warnings.Count -gt 0) {
  $status = "FAIL_STRICT_WARNINGS"
} else {
  $status = "PASS_WITH_WARNINGS_ALLOWED"
}

Write-Host ""
Write-Host "RESULT: $status"
Write-Host "Evidence: $OutRoot"
Write-Host "Report:   $Report"

if ($status -like "FAIL*") {
  exit 1
}
