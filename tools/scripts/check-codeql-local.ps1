<#
.SYNOPSIS
  Local CodeQL CLI availability check for bthwani-suite-next.
#>

$ErrorActionPreference = "Stop"

$codeqlExe = $null

# 1. Use explicit env override if set
if ($env:CODEQL_EXE -and (Test-Path -LiteralPath $env:CODEQL_EXE)) {
  $codeqlExe = $env:CODEQL_EXE
}

# 2. Search common installation paths
if (-not $codeqlExe) {
  $candidates = @(
    (Join-Path $env:APPDATA "Antigravity IDE\User\globalStorage\github.vscode-codeql\distribution1\codeql\codeql.exe"),
    (Join-Path $env:APPDATA "Code\User\globalStorage\github.vscode-codeql\distribution1\codeql\codeql.exe"),
    (Join-Path $env:USERPROFILE ".codeql\codeql.exe")
  )
  foreach ($c in $candidates) {
    if (Test-Path -LiteralPath $c) {
      $codeqlExe = $c
      break
    }
  }
}

# 3. Try PATH
if (-not $codeqlExe) {
  try {
    $found = Get-Command codeql -ErrorAction Stop
    $codeqlExe = $found.Source
  } catch { }
}

if (-not $codeqlExe) {
  Write-Host "CODEQL_LOCAL: FAIL"
  Write-Host "  CodeQL CLI not found."
  Write-Host "  Install one of:"
  Write-Host "    - VS Code / Antigravity IDE CodeQL extension (github.vscode-codeql)"
  Write-Host "    - Standalone CodeQL CLI: https://github.com/github/codeql-cli-binaries/releases"
  Write-Host "    - Set CODEQL_EXE env var to the path of codeql.exe"
  exit 1
}

try {
  $stderrFile = [System.IO.Path]::GetTempFileName()

  try {
    $versionOutput = & $codeqlExe version --format=json 2>$stderrFile
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
      $stderr = Get-Content -LiteralPath $stderrFile -Raw -ErrorAction SilentlyContinue
      throw "CodeQL exited with code $exitCode. $stderr"
    }

    $versionJson = $versionOutput -join "`n"

    if ([string]::IsNullOrWhiteSpace($versionJson)) {
      throw "CodeQL returned empty version JSON."
    }

    $versionObj = $versionJson | ConvertFrom-Json

    Write-Host "CODEQL_LOCAL: PASS"
    Write-Host "  version: $($versionObj.version)"
    Write-Host "  path:    $codeqlExe"
    exit 0
  }
  finally {
    Remove-Item -LiteralPath $stderrFile -Force -ErrorAction SilentlyContinue
  }
}
catch {
  Write-Host "CODEQL_LOCAL: FAIL"
  Write-Host "  Found at $codeqlExe but failed to run: $_"
  exit 1
}
