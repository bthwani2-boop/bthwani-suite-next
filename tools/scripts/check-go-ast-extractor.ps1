<#
.SYNOPSIS
  Runs the Go AST route extractor against DSH, WLT, and Identity server files.
  Validates output is a JSON array and writes combined result to .diagnostics/tools/go-routes.json.
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "../../")).Path
Set-Location -LiteralPath $RepoRoot

$Fail = $false

# Verify Go is installed
Write-Host "=== GO_AST_EXTRACTOR check ==="
try {
  $goVer = go version 2>&1
  Write-Host "  go: $goVer"
} catch {
  Write-Host "  [FAIL] Go is not installed or not in PATH."
  Write-Host "         Install Go from https://go.dev/dl/"
  exit 1
}

$ExtractorPath = Join-Path $RepoRoot "tools/guards/extract_routes.go"
if (-not (Test-Path -LiteralPath $ExtractorPath)) {
  Write-Host "  [FAIL] Extractor not found: tools/guards/extract_routes.go"
  exit 1
}

# Build extractor binary into temp dir
$TmpDir = Join-Path ([System.IO.Path]::GetTempPath()) "bthwani-extractor-$([guid]::NewGuid().ToString('N').Substring(0,8))"
New-Item -ItemType Directory -Path $TmpDir -Force | Out-Null
$BinaryPath = Join-Path $TmpDir "extract_routes.exe"

try {
  Write-Host "  Building extractor binary..."
  $buildOut = go build -o $BinaryPath $ExtractorPath 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] go build failed: $buildOut"
    exit 1
  }
  Write-Host "  Extractor built OK"
} catch {
  Write-Host "  [FAIL] go build threw: $_"
  exit 1
}

$Targets = @(
  @{ Label = "DSH";      File = "services/dsh/backend/internal/http/server.go" },
  @{ Label = "WLT";      File = "services/wlt/backend/internal/http/server.go" },
  @{ Label = "Identity"; File = "core/identity/backend/internal/http/server.go" }
)

$CombinedRoutes = [System.Collections.Generic.List[object]]::new()

foreach ($target in $Targets) {
  $filePath = Join-Path $RepoRoot $target.File
  if (-not (Test-Path -LiteralPath $filePath)) {
    Write-Host "  [FAIL] GO_AST_ROUTES $($target.Label): router file missing: $($target.File)"
    $Fail = $true
    continue
  }

  try {
    $rawJson = & $BinaryPath $filePath 2>&1 | Out-String
    $parsed = $rawJson | ConvertFrom-Json -ErrorAction Stop

    if ($parsed -isnot [System.Array] -and $parsed -isnot [System.Collections.IEnumerable]) {
      Write-Host "  [FAIL] GO_AST_ROUTES $($target.Label): output is not a JSON array"
      $Fail = $true
      continue
    }

    $count = @($parsed).Count
    Write-Host "  GO_AST_ROUTES $($target.Label): PASS routes=$count"

    foreach ($route in @($parsed)) {
      $CombinedRoutes.Add($route)
    }
  } catch {
    Write-Host "  [FAIL] GO_AST_ROUTES $($target.Label): extractor error — $_"
    $Fail = $true
  }
}

# Write combined output
$DiagDir = Join-Path $RepoRoot ".diagnostics/tools"
if (-not (Test-Path -LiteralPath $DiagDir)) {
  New-Item -ItemType Directory -Path $DiagDir -Force | Out-Null
}

$outFile = Join-Path $DiagDir "go-routes.json"
$CombinedRoutes | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $outFile -Encoding UTF8
Write-Host ""
Write-Host "  Combined routes written to: .diagnostics/tools/go-routes.json ($($CombinedRoutes.Count) total)"

if ($Fail) {
  Write-Host ""
  Write-Host "GO_AST_EXTRACTOR: FAIL"
  exit 1
} else {
  Write-Host ""
  Write-Host "GO_AST_EXTRACTOR: PASS"
  exit 0
}
