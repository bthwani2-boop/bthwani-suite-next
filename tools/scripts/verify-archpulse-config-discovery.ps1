<#
.SYNOPSIS
  Non-destructive runtime verification of ArchPulse config auto-discovery and ignore semantics.

.DESCRIPTION
  Creates an isolated temporary TypeScript fixture, runs ArchPulse 0.5.3 analyze with:
  1) no config,
  2) an auto-discovered archpulse.config.yml,
  3) an explicit --config path,
  and compares the analyzed file counts. It also tests both directory-style and glob-style
  ignore patterns. The repository itself is never analyzed or modified.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

function Section([string]$Title) {
  Write-Host ''
  Write-Host ('=== {0} ===' -f $Title) -ForegroundColor Cyan
}
function Info([string]$Message) { Write-Host ('  INFO  {0}' -f $Message) }
function Pass([string]$Message) { Write-Host ('  PASS  {0}' -f $Message) -ForegroundColor Green }
function Warn([string]$Message) { Write-Host ('  WARN  {0}' -f $Message) -ForegroundColor Yellow }
function Fail([string]$Message) { Write-Host ('  FAIL  {0}' -f $Message) -ForegroundColor Red }

function Invoke-ArchPulseAnalyze {
  param(
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [string]$ConfigPath
  )

  Push-Location $WorkingDirectory
  try {
    $Args = @('--yes', 'archpulse', 'analyze', '.', '--verbose')
    if (-not [string]::IsNullOrWhiteSpace($ConfigPath)) {
      $Args += @('--config', $ConfigPath)
    }

    $OldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      $Output = @(& npx @Args 2>&1)
      $ExitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $OldPreference
    }

    $Text = ($Output | ForEach-Object { $_.ToString() }) -join "`n"
    $FileCount = $null
    foreach ($Pattern in @(
      '(?im)Files analyzed\s*:\s*(\d+)',
      '(?im)Found\s+(\d+)\s+files?',
      '(?im)Parsed\s+(\d+)\s+files?'
    )) {
      $Match = [regex]::Match($Text, $Pattern)
      if ($Match.Success) {
        $FileCount = [int]$Match.Groups[1].Value
        break
      }
    }

    return [pscustomobject]@{
      ExitCode = $ExitCode
      FileCount = $FileCount
      Text = $Text
      Command = ('npx {0}' -f ($Args -join ' '))
    }
  } finally {
    Pop-Location
  }
}

function Show-RunResult {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)]$Result
  )

  Info ('{0}: {1}' -f $Label, $Result.Command)
  if ($Result.ExitCode -eq 0) { Pass ('{0} exited 0' -f $Label) }
  else { Fail ('{0} exit code {1}' -f $Label, $Result.ExitCode) }

  if ($null -ne $Result.FileCount) {
    Info ('{0} file count: {1}' -f $Label, $Result.FileCount)
  } else {
    Warn ('Could not parse an analyzed file count for {0}' -f $Label)
  }

  foreach ($Line in ($Result.Text -split "`r?`n" | Select-Object -Last 30)) {
    Write-Host ('        {0}' -f $Line)
  }
}

Write-Host ''
Write-Host '╔════════════════════════════════════════════╗' -ForegroundColor Cyan
Write-Host '║  ArchPulse Config Discovery Verification   ║' -ForegroundColor Cyan
Write-Host '╚════════════════════════════════════════════╝' -ForegroundColor Cyan

if ($null -eq (Get-Command npx -ErrorAction SilentlyContinue)) {
  Fail 'npx is not available on PATH.'
  exit 2
}

$ProbeRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('archpulse-discovery-probe-{0}' -f ([guid]::NewGuid().ToString('N')))
$SrcDir = Join-Path $ProbeRoot 'src'
$ToolsDir = Join-Path $ProbeRoot 'tools'
$TestsDir = Join-Path $ProbeRoot 'tests'
$ConfigPath = Join-Path $ProbeRoot 'archpulse.config.yml'
$HiddenConfigPath = Join-Path $ProbeRoot 'archpulse.config.hidden.yml'

try {
  New-Item -ItemType Directory -Path $SrcDir, $ToolsDir, $TestsDir -Force | Out-Null

  Set-Content -LiteralPath (Join-Path $SrcDir 'entry.ts') -Encoding utf8 -Value @'
import { coreValue } from './core';
console.log(coreValue);
'@
  Set-Content -LiteralPath (Join-Path $SrcDir 'core.ts') -Encoding utf8 -Value @'
export const coreValue = 42;
'@
  Set-Content -LiteralPath (Join-Path $ToolsDir 'helper.ts') -Encoding utf8 -Value @'
export const helper = 'tool';
'@
  Set-Content -LiteralPath (Join-Path $TestsDir 'entry.test.ts') -Encoding utf8 -Value @'
export const testMarker = true;
'@

  Info ('Temporary fixture: {0}' -f $ProbeRoot)

  Section 'Baseline without config'
  $Baseline = Invoke-ArchPulseAnalyze -WorkingDirectory $ProbeRoot
  Show-RunResult -Label 'baseline' -Result $Baseline

  Section 'Auto-discovery with glob-style ignore'
  Set-Content -LiteralPath $ConfigPath -Encoding utf8 -Value @'
ignore:
  - "tools/**"
  - "tests/**"
output:
  directory: docs
  filename: architecture
  formats:
    - drawio
'@
  $AutoGlob = Invoke-ArchPulseAnalyze -WorkingDirectory $ProbeRoot
  Show-RunResult -Label 'auto glob config' -Result $AutoGlob

  Section 'Explicit config with glob-style ignore'
  $ExplicitGlob = Invoke-ArchPulseAnalyze -WorkingDirectory $ProbeRoot -ConfigPath $ConfigPath
  Show-RunResult -Label 'explicit glob config' -Result $ExplicitGlob

  Section 'Auto-discovery with directory-style ignore'
  Set-Content -LiteralPath $ConfigPath -Encoding utf8 -Value @'
ignore:
  - tools/
  - tests/
output:
  directory: docs
  filename: architecture
  formats:
    - drawio
'@
  $AutoDirectory = Invoke-ArchPulseAnalyze -WorkingDirectory $ProbeRoot
  Show-RunResult -Label 'auto directory config' -Result $AutoDirectory

  Section 'No-config control after hiding default config'
  Move-Item -LiteralPath $ConfigPath -Destination $HiddenConfigPath -Force
  $Control = Invoke-ArchPulseAnalyze -WorkingDirectory $ProbeRoot
  Show-RunResult -Label 'hidden-config control' -Result $Control

  Section 'Diagnosis'
  $AutoDiscoveryProven = $false
  if ($null -ne $Baseline.FileCount -and $null -ne $AutoGlob.FileCount -and $AutoGlob.FileCount -lt $Baseline.FileCount) {
    Pass 'Default archpulse.config.yml is auto-discovered and glob-style ignore changes the scan.'
    $AutoDiscoveryProven = $true
  } elseif ($null -ne $Baseline.FileCount -and $null -ne $AutoDirectory.FileCount -and $AutoDirectory.FileCount -lt $Baseline.FileCount) {
    Pass 'Default archpulse.config.yml is auto-discovered and directory-style ignore changes the scan.'
    $AutoDiscoveryProven = $true
  }

  if (-not $AutoDiscoveryProven) {
    Warn 'Auto-discovery was not proven from parsed file counts.'
  }

  if ($null -ne $ExplicitGlob.FileCount -and $null -ne $Baseline.FileCount -and $ExplicitGlob.FileCount -lt $Baseline.FileCount) {
    Pass 'Explicit --config definitely applies ignore filtering.'
  } else {
    Warn 'Explicit --config filtering was not proven from parsed file counts.'
  }

  if ($null -ne $AutoGlob.FileCount -and $null -ne $AutoDirectory.FileCount) {
    if ($AutoGlob.FileCount -lt $AutoDirectory.FileCount) {
      Pass 'Glob-style directory patterns are more effective in this probe.'
    } elseif ($AutoDirectory.FileCount -lt $AutoGlob.FileCount) {
      Pass 'Directory-style patterns are more effective in this probe.'
    } else {
      Info 'Glob-style and directory-style patterns produced the same analyzed file count.'
    }
  }

  if ($null -ne $Control.FileCount -and $null -ne $Baseline.FileCount -and $Control.FileCount -eq $Baseline.FileCount) {
    Pass 'Hidden-config control matches the baseline, strengthening the config causality check.'
  }

  Info 'This verification changed only an isolated temporary directory.'
} finally {
  if (Test-Path -LiteralPath $ProbeRoot) {
    Remove-Item -LiteralPath $ProbeRoot -Recurse -Force -ErrorAction SilentlyContinue
    Info ('Removed temporary fixture: {0}' -f $ProbeRoot)
  }
}
