<#
.SYNOPSIS
  BTHWANI_PERFORMANCE_GOVERNANCE_GATE — Go Benchmark Runner

.DESCRIPTION
  Runs `go test -bench=. -benchmem` for the specified service backend
  and saves the result to .diagnostics/performance/<service>-go-benchmarks.txt.

  Usage:
    pwsh -File tools/performance/go/run-go-benchmarks.ps1 -Service dsh
    pwsh -File tools/performance/go/run-go-benchmarks.ps1 -Service wlt

  The script also compares against the previous run (if available) and emits
  a warning if any benchmark regressed by more than 15% (fail at 30%).

.PARAMETER Service
  The service name: dsh | wlt | identity
#>

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("dsh", "wlt", "identity")]
  [string]$Service
)

$ErrorActionPreference = "Stop"

# ── Paths ──────────────────────────────────────────────────────────────────────
$repoRoot   = Resolve-Path (Join-Path $PSScriptRoot ".." ".." "..")
$serviceDir = Join-Path $repoRoot "services" $Service "backend"
$outDir     = Join-Path $repoRoot ".diagnostics" "performance"
$outFile    = Join-Path $outDir "$Service-go-benchmarks.txt"
$prevFile   = Join-Path $outDir "$Service-go-benchmarks.prev.txt"

if (-not (Test-Path $serviceDir)) {
  Write-Error "Service backend not found: $serviceDir"
  exit 1
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# ── Archive previous results for comparison ────────────────────────────────────
if (Test-Path $outFile) {
  Copy-Item $outFile $prevFile -Force
}

# ── Run benchmarks ────────────────────────────────────────────────────────────
Write-Host "`n  Running Go benchmarks for: $Service"
Write-Host "  Directory: $serviceDir`n"

Push-Location $serviceDir
$benchOutput = & go test "-bench=." -benchmem -benchtime=2s -count=1 ./internal/... ./cmd/... 2>&1
$exitCode = $LASTEXITCODE
Pop-Location

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$header = "# Go Benchmark Report — $Service`n# Generated: $timestamp`n`n"

Set-Content -Path $outFile -Value ($header + ($benchOutput -join "`n"))

if ($exitCode -ne 0) {
  Write-Error "Go benchmarks failed for $Service (exit code $exitCode)"
  exit $exitCode
}

Write-Host "  Results saved to: $($outFile.Replace($repoRoot.ToString(), ''))"

# ── Regression comparison (if previous exists) ────────────────────────────────
if (Test-Path $prevFile) {
  Write-Host "`n  Comparing against previous run..."

  $warnPct = 15
  $failPct  = 30
  $regressions = @()

  # Parse BenchmarkXxx lines: "BenchmarkName  N  XXX ns/op  YYY B/op  ZZZ allocs/op"
  $currentLines  = Get-Content $outFile  | Where-Object { $_ -match "^Benchmark" }
  $previousLines = Get-Content $prevFile | Where-Object { $_ -match "^Benchmark" }

  $prevMap = @{}
  foreach ($line in $previousLines) {
    $parts = $line -split '\s+'
    if ($parts.Count -ge 3) {
      $prevMap[$parts[0]] = [double]$parts[2]
    }
  }

  foreach ($line in $currentLines) {
    $parts = $line -split '\s+'
    if ($parts.Count -ge 3) {
      $name    = $parts[0]
      $current = [double]$parts[2]
      if ($prevMap.ContainsKey($name)) {
        $prev = $prevMap[$name]
        if ($prev -gt 0) {
          $pct = (($current - $prev) / $prev) * 100
          if ($pct -ge $failPct) {
            $regressions += [PSCustomObject]@{ Name=$name; Pct=[math]::Round($pct,1); Level="FAIL" }
          } elseif ($pct -ge $warnPct) {
            $regressions += [PSCustomObject]@{ Name=$name; Pct=[math]::Round($pct,1); Level="WARN" }
          }
        }
      }
    }
  }

  if ($regressions.Count -gt 0) {
    Write-Host "`n  Benchmark regressions detected:"
    foreach ($r in $regressions) {
      $icon = if ($r.Level -eq "FAIL") { "❌" } else { "⚠️" }
      Write-Host "  $icon $($r.Name): +$($r.Pct)% slower"
    }
    $failCount = ($regressions | Where-Object { $_.Level -eq "FAIL" }).Count
    if ($failCount -gt 0) {
      Write-Error "`n  $failCount benchmark(s) regressed by >$failPct%. Gate FAILED."
      exit 1
    }
  } else {
    Write-Host "  ✅ No significant regressions detected."
  }
}

Write-Host "`n  GO_BENCHMARK_$($Service.ToUpper()): PASS"
