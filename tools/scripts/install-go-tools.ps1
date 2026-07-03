<#
.SYNOPSIS
  Installs required Go development tools for VS Code and local validation checks.
.DESCRIPTION
  This script checks and installs the following Go tools:
  - impl (github.com/josharian/impl@latest)
  - goplay (github.com/haya14busa/goplay/cmd/goplay@latest)
  - dlv (github.com/go-delve/delve/cmd/dlv@latest)
  - deadcode (golang.org/x/tools/cmd/deadcode@latest)
.PARAMETER DryRun
  If set, the script will simulate checks and installation steps without writing files.
.PARAMETER Force
  If set, forces re-installation of all tools even if they already exist in PATH.
#>
param(
  [switch]$DryRun,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

# Establish Go Environment info
$GoPath = go env GOPATH
if (-not $GoPath) {
  Write-Error "Go GOPATH environment variable could not be resolved. Please verify Go is installed properly."
  exit 1
}

$GoBin = Join-Path $GoPath "bin"
Write-Host "--- GO ENVIRONMENT DIAGNOSIS ---"
Write-Host "GOPATH: $GoPath"
Write-Host "GOBIN (computed): $GoBin"
Write-Host "DryRun Mode: $DryRun"
Write-Host "Force Mode: $Force"
Write-Host "--------------------------------"

# Define tools and their installation paths
$Tools = @(
  @{ Name = "impl"; Urn = "github.com/josharian/impl@latest"; Executable = "impl.exe" },
  @{ Name = "goplay"; Urn = "github.com/haya14busa/goplay/cmd/goplay@latest"; Executable = "goplay.exe" },
  @{ Name = "dlv"; Urn = "github.com/go-delve/delve/cmd/dlv@latest"; Executable = "dlv.exe" },
  @{ Name = "deadcode"; Urn = "golang.org/x/tools/cmd/deadcode@latest"; Executable = "deadcode.exe" }
)

$allPassed = $true

foreach ($tool in $Tools) {
  $name = $tool.Name
  $urn = $tool.Urn
  $execName = $tool.Executable
  $expectedPath = Join-Path $GoBin $execName

  # Check if tool is already installed
  $exists = Test-Path -LiteralPath $expectedPath
  $inPath = Get-Command $name -ErrorAction SilentlyContinue

  if ($exists -and -not $Force) {
    Write-Host "[PASS] $name is already installed at: $expectedPath"
    continue
  }

  if ($inPath -and -not $Force -and -not $exists) {
    Write-Host "[PASS] $name is already available in PATH: $($inPath.Source)"
    continue
  }

  # Needs installation
  if ($DryRun) {
    Write-Host "[DRY-RUN] Would install $name from $urn to $GoBin"
  } else {
    Write-Host "[INSTALL] $name is missing. Installing from $urn..."
    try {
      # Use the current directory or a temporary workspace directory inside GOPATH
      go install $urn

      # Verify installation succeeded
      if (Test-Path -LiteralPath $expectedPath) {
        Write-Host "[SUCCESS] Installed $name successfully at $expectedPath"
      } else {
        Write-Error "[FAIL] Go install completed but $name was not found at $expectedPath"
        $allPassed = $false
      }
    } catch {
      Write-Error "[FAIL] Failed to install $($name). Error: $_"
      $allPassed = $false
    }
  }
}

# Final verification
if (-not $DryRun) {
  Write-Host "`n--- FINAL VERIFICATION ---"
  foreach ($tool in $Tools) {
    $name = $tool.Name
    $expectedPath = Join-Path $GoBin $tool.Executable
    $exists = Test-Path -LiteralPath $expectedPath
    if ($exists) {
      Write-Host "[VERIFIED] $name is present at $expectedPath"
    } else {
      Write-Host "[MISSING] $name is not found at $expectedPath"
      $allPassed = $false
    }
  }

  if ($allPassed) {
    Write-Host "`nAll requested Go tools are installed and verified."
    exit 0
  } else {
    Write-Host "`nSome Go tools failed to install."
    exit 1
  }
} else {
  Write-Host "`nDry-run completed successfully."
  exit 0
}
