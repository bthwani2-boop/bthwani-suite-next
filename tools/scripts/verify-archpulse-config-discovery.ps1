<#
.SYNOPSIS
  Bounded runtime verification of ArchPulse config auto-discovery and ignore semantics.

.DESCRIPTION
  Creates an isolated temporary TypeScript fixture and compares three ArchPulse 0.5.3
  analyze runs: no config, auto-discovered archpulse.config.yml, and explicit --config.
  Every native run has a hard timeout and is terminated if ArchPulse stalls. The repository
  itself is never analyzed or modified.
#>

[CmdletBinding()]
param(
  [ValidateRange(5, 120)]
  [int]$TimeoutSeconds = 25
)

$ErrorActionPreference = 'Stop'

function Section([string]$Title) {
  Write-Host ''
  Write-Host ('=== {0} ===' -f $Title) -ForegroundColor Cyan
}
function Info([string]$Message) { Write-Host ('  INFO  {0}' -f $Message) }
function Pass([string]$Message) { Write-Host ('  PASS  {0}' -f $Message) -ForegroundColor Green }
function Warn([string]$Message) { Write-Host ('  WARN  {0}' -f $Message) -ForegroundColor Yellow }
function Fail([string]$Message) { Write-Host ('  FAIL  {0}' -f $Message) -ForegroundColor Red }

function Quote-NativeArgument([string]$Value) {
  if ($Value -notmatch '[\s"]') { return $Value }
  return '"{0}"' -f ($Value -replace '"', '\"')
}

function Invoke-ArchPulseAnalyze {
  param(
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [string]$ConfigPath
  )

  $Arguments = @('--yes', 'archpulse', 'analyze', '.')
  if (-not [string]::IsNullOrWhiteSpace($ConfigPath)) {
    $Arguments += @('--config', $ConfigPath)
  }

  $StdOutPath = Join-Path $WorkingDirectory ('archpulse-stdout-{0}.txt' -f ([guid]::NewGuid().ToString('N')))
  $StdErrPath = Join-Path $WorkingDirectory ('archpulse-stderr-{0}.txt' -f ([guid]::NewGuid().ToString('N')))
  $CommandLine = 'npx {0}' -f (($Arguments | ForEach-Object { Quote-NativeArgument $_ }) -join ' ')
  Info ('Starting: {0}' -f $CommandLine)
  Info ('Timeout: {0}s' -f $TimeoutSeconds)

  $Process = $null
  $TimedOut = $false
  try {
    $Process = Start-Process `
      -FilePath 'npx.cmd' `
      -ArgumentList $Arguments `
      -WorkingDirectory $WorkingDirectory `
      -NoNewWindow `
      -RedirectStandardOutput $StdOutPath `
      -RedirectStandardError $StdErrPath `
      -PassThru

    if (-not $Process.WaitForExit($TimeoutSeconds * 1000)) {
      $TimedOut = $true
      Warn ('ArchPulse exceeded {0}s; terminating PID {1}.' -f $TimeoutSeconds, $Process.Id)
      try { $Process.Kill($true) } catch { try { Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue } catch {} }
      try { $Process.WaitForExit(3000) | Out-Null } catch {}
    }

    $StdOut = if (Test-Path -LiteralPath $StdOutPath) { Get-Content -LiteralPath $StdOutPath -Raw -ErrorAction SilentlyContinue } else { '' }
    $StdErr = if (Test-Path -LiteralPath $StdErrPath) { Get-Content -LiteralPath $StdErrPath -Raw -ErrorAction SilentlyContinue } else { '' }
    $Text = @($StdOut, $StdErr) -join "`n"

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

    $ExitCode = if ($TimedOut) { -2 } elseif ($null -ne $Process -and $Process.HasExited) { $Process.ExitCode } else { -1 }

    return [pscustomobject]@{
      ExitCode = $ExitCode
      TimedOut = $TimedOut
      FileCount = $FileCount
      Text = $Text
      Command = $CommandLine
    }
  } finally {
    Remove-Item -LiteralPath $StdOutPath, $StdErrPath -Force -ErrorAction SilentlyContinue
    if ($null -ne $Process) { $Process.Dispose() }
  }
}

function Show-RunResult {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)]$Result
  )

  if ($Result.TimedOut) {
    Fail ('{0} timed out; ArchPulse did not finish.' -f $Label)
  } elseif ($Result.ExitCode -eq 0) {
    Pass ('{0} exited 0' -f $Label)
  } else {
    Fail ('{0} exit code {1}' -f $Label, $Result.ExitCode)
  }

  if ($null -ne $Result.FileCount) {
    Info ('{0} file count: {1}' -f $Label, $Result.FileCount)
  } else {
    Warn ('Could not parse analyzed file count for {0}' -f $Label)
  }

  $Lines = @($Result.Text -split "`r?`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Last 20)
  foreach ($Line in $Lines) { Write-Host ('        {0}' -f $Line) }
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

try {
  New-Item -ItemType Directory -Path $SrcDir, $ToolsDir, $TestsDir -Force | Out-Null

  Set-Content -LiteralPath (Join-Path $SrcDir 'entry.ts') -Encoding utf8 -Value "import { coreValue } from './core';`nconsole.log(coreValue);"
  Set-Content -LiteralPath (Join-Path $SrcDir 'core.ts') -Encoding utf8 -Value 'export const coreValue = 42;'
  Set-Content -LiteralPath (Join-Path $ToolsDir 'helper.ts') -Encoding utf8 -Value "export const helper = 'tool';"
  Set-Content -LiteralPath (Join-Path $TestsDir 'entry.test.ts') -Encoding utf8 -Value 'export const testMarker = true;'

  Info ('Temporary fixture: {0}' -f $ProbeRoot)

  Section 'Baseline without config'
  $Baseline = Invoke-ArchPulseAnalyze -WorkingDirectory $ProbeRoot
  Show-RunResult -Label 'baseline' -Result $Baseline

  if ($Baseline.TimedOut) {
    Section 'Diagnosis'
    Fail 'ArchPulse analyze itself stalls on a four-file isolated fixture. Config auto-discovery cannot be tested reliably until the CLI stall is diagnosed.'
    Info 'The timeout killed the stalled ArchPulse process; there is no need to use Ctrl+C.'
    exit 4
  }

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

  Section 'Auto-discovered config'
  $Auto = Invoke-ArchPulseAnalyze -WorkingDirectory $ProbeRoot
  Show-RunResult -Label 'auto config' -Result $Auto

  Section 'Explicit --config'
  $Explicit = Invoke-ArchPulseAnalyze -WorkingDirectory $ProbeRoot -ConfigPath $ConfigPath
  Show-RunResult -Label 'explicit config' -Result $Explicit

  Section 'Diagnosis'
  if ($Auto.TimedOut -or $Explicit.TimedOut) {
    Fail 'At least one configured run stalled; the timeout terminated it safely.'
  }

  if ($null -ne $Baseline.FileCount -and $null -ne $Auto.FileCount -and $Auto.FileCount -lt $Baseline.FileCount) {
    Pass 'Default archpulse.config.yml is auto-discovered and its ignore list changes the scan.'
  } else {
    Warn 'Auto-discovery was not proven from parsed file counts.'
  }

  if ($null -ne $Baseline.FileCount -and $null -ne $Explicit.FileCount -and $Explicit.FileCount -lt $Baseline.FileCount) {
    Pass 'Explicit --config applies ignore filtering.'
  } else {
    Warn 'Explicit --config filtering was not proven from parsed file counts.'
  }

  Info 'This verification changed only an isolated temporary directory.'
} finally {
  if (Test-Path -LiteralPath $ProbeRoot) {
    Remove-Item -LiteralPath $ProbeRoot -Recurse -Force -ErrorAction SilentlyContinue
    Info ('Removed temporary fixture: {0}' -f $ProbeRoot)
  }
}
