Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = "Continue"

$SessionId = "GO-DEADCODE-" + (Get-Date -Format "yyyyMMdd-HHmmss")
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

function Is-ExcludedPath {
  param([string]$Path)

  return (
    $Path -match '\\node_modules\\' -or
    $Path -match '\\\.pnpm-store\\' -or
    $Path -match '\\\.next\\' -or
    $Path -match '\\\.expo\\' -or
    $Path -match '\\dist\\' -or
    $Path -match '\\build\\' -or
    $Path -match '\\coverage\\' -or
    $Path -match '\\graphify-out\\' -or
    $Path -match '\\\.yagni-out\\' -or
    $Path -match '\\\.nx\\' -or
    $Path -match '\\\.cache\\' -or
    $Path -match '\\\.gocache' -or
    $Path -match '\\\.gomodcache' -or
    $Path -match '\\tools\\registry\\runs\\'
  )
}

$goMods = @(
  Get-ChildItem -Recurse -Filter "go.mod" -File -ErrorAction SilentlyContinue |
    Where-Object { -not (Is-ExcludedPath $_.FullName) } |
    ForEach-Object { $_.FullName }
)

if ($goMods.Count -eq 0) {
  Add-Result "go:modules" "SKIP" "No project go.mod files found"
} else {
  Add-Result "go:modules" "FOUND" ($goMods -join "`n")
}

$deadcodeExists = [bool](Get-Command deadcode -ErrorAction SilentlyContinue)

foreach ($goMod in $goMods) {
  $dir = Split-Path -Parent $goMod
  $safeName = $dir -replace "[:\\\/]", "_"

  Push-Location $dir
  try {
    $testOut = Join-Path $OutRoot "go-test-$safeName.txt"
    go test ./... *> $testOut
    if ($LASTEXITCODE -eq 0) {
      Add-Result "go-test:$dir" "PASS" $testOut
    } else {
      Add-Result "go-test:$dir" "FAIL" $testOut
    }

    $buildOut = Join-Path $OutRoot "go-build-$safeName.txt"
    go build ./... *> $buildOut
    if ($LASTEXITCODE -eq 0) {
      Add-Result "go-build:$dir" "PASS" $buildOut
    } else {
      Add-Result "go-build:$dir" "FAIL" $buildOut
    }

    if ($deadcodeExists) {
      $deadOut = Join-Path $OutRoot "go-deadcode-$safeName.txt"
      deadcode -test ./... *> $deadOut
      if ($LASTEXITCODE -eq 0) {
        Add-Result "go-deadcode:$dir" "PASS" $deadOut
      } else {
        Add-Result "go-deadcode:$dir" "WARN" $deadOut
      }
    } else {
      Add-Result "go-deadcode:$dir" "MISSING" "deadcode not found in PATH"
    }
  } finally {
    Pop-Location
  }
}

$Json = Join-Path $OutRoot "go-deadcode-results.json"
$Report = Join-Path $OutRoot "GO_DEADCODE_REPORT.md"

$results | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Json -Encoding UTF8

$md = @()
$md += "# Go Deadcode Guard"
$md += ""
$md += "Session: $SessionId"
$md += "Root: $((Get-Location).Path)"
$md += ""
$md += "| Name | Status | Evidence |"
$md += "|---|---|---|"
foreach ($r in $results) {
  $ev = ($r.evidence -replace "\|", "/" -replace "`r?`n", "<br>")
  $md += "| $($r.name) | $($r.status) | $ev |"
}

$md -join "`n" | Set-Content -LiteralPath $Report -Encoding UTF8

$failed = @($results | Where-Object { $_.status -eq "FAIL" })

Write-Host "RESULT: $(if ($failed.Count -eq 0) { "PASS" } else { "FAIL" })"
Write-Host "Evidence: $OutRoot"

if ($failed.Count -gt 0) {
  exit 1
}
