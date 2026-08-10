<#
.SYNOPSIS
  Non-destructive probe of the ArchPulse CLI configuration-file schema.

.DESCRIPTION
  Uses the live ArchPulse CLI resolved by npx to run `archpulse init` inside a temporary
  directory, prints every generated configuration file, highlights filtering-related
  keys, and removes the temporary directory afterwards.

  This script does not modify repository files, IDE settings, extension files, or
  generated architecture diagrams. npx/npm may use their normal package cache.
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

Write-Host ''
Write-Host '╔════════════════════════════════════════════╗' -ForegroundColor Cyan
Write-Host '║      ArchPulse Config Schema Probe         ║' -ForegroundColor Cyan
Write-Host '╚════════════════════════════════════════════╝' -ForegroundColor Cyan

if ($null -eq (Get-Command npx -ErrorAction SilentlyContinue)) {
  Fail 'npx is not available on PATH.'
  exit 2
}

$ProbeRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('archpulse-config-probe-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $ProbeRoot -Force | Out-Null
Info ('Temporary probe directory: {0}' -f $ProbeRoot)

try {
  Section 'Live CLI version'
  $VersionOutput = @(& npx --yes archpulse --version 2>&1)
  $VersionExit = $LASTEXITCODE
  if ($VersionExit -eq 0) {
    Pass ('npx archpulse version: {0}' -f (($VersionOutput | ForEach-Object { $_.ToString() }) -join ' '))
  } else {
    Fail ('npx archpulse --version failed with exit code {0}' -f $VersionExit)
    $VersionOutput | ForEach-Object { Write-Host ('        {0}' -f $_) }
    exit 3
  }

  Section 'Generate sample configuration'
  Info ('Command: npx --yes archpulse init "{0}"' -f $ProbeRoot)
  $InitOutput = @(& npx --yes archpulse init $ProbeRoot 2>&1)
  $InitExit = $LASTEXITCODE
  $InitOutput | ForEach-Object { Write-Host ('        {0}' -f $_) }

  if ($InitExit -ne 0) {
    Fail ('archpulse init failed with exit code {0}' -f $InitExit)
    exit 4
  }
  Pass 'archpulse init completed successfully in the temporary directory.'

  Section 'Generated files'
  $Files = @(Get-ChildItem -LiteralPath $ProbeRoot -Recurse -File -Force -ErrorAction SilentlyContinue)
  if ($Files.Count -eq 0) {
    Fail 'archpulse init created no files.'
    exit 5
  }

  foreach ($File in $Files) {
    $Relative = [System.IO.Path]::GetRelativePath($ProbeRoot, $File.FullName)
    Info $Relative
  }

  Section 'Configuration contents'
  $ConfigFiles = @(
    $Files | Where-Object {
      $_.Name -match '(?i)archpulse.*\.(ya?ml|json|js|cjs|mjs)$' -or
      $_.Name -match '(?i)^archpulse\.config'
    }
  )

  if ($ConfigFiles.Count -eq 0) {
    Warn 'No obvious ArchPulse config file was identified by name.'
    $ConfigFiles = $Files
  }

  $Combined = New-Object System.Text.StringBuilder
  foreach ($File in $ConfigFiles) {
    $Relative = [System.IO.Path]::GetRelativePath($ProbeRoot, $File.FullName)
    Write-Host ''
    Write-Host ('----- {0} -----' -f $Relative) -ForegroundColor White
    $Raw = Get-Content -LiteralPath $File.FullName -Raw
    Write-Host $Raw
    [void]$Combined.AppendLine($Raw)
  }

  Section 'Filtering capability classification'
  $Text = $Combined.ToString()
  $Checks = @(
    @{ Name = 'ignore'; Pattern = '(?im)^\s*ignore\s*:' },
    @{ Name = 'exclude'; Pattern = '(?im)^\s*exclude\s*:' },
    @{ Name = 'include'; Pattern = '(?im)^\s*include\s*:' },
    @{ Name = 'patterns'; Pattern = '(?i)(ignorePatterns|excludePatterns|patterns\s*:)' },
    @{ Name = 'extensions'; Pattern = '(?im)^\s*extensions\s*:' },
    @{ Name = 'layers'; Pattern = '(?im)^\s*layers\s*:' },
    @{ Name = 'output'; Pattern = '(?im)^\s*output\s*:' }
  )

  $HasFilter = $false
  foreach ($Check in $Checks) {
    if ($Text -match $Check.Pattern) {
      Pass ('Sample config exposes {0}-related configuration.' -f $Check.Name)
      if ($Check.Name -in @('ignore', 'exclude', 'include', 'patterns')) { $HasFilter = $true }
    } else {
      Info ('Sample config has no obvious {0} key.' -f $Check.Name)
    }
  }

  Section 'Diagnosis'
  if ($HasFilter) {
    Pass 'The CLI sample config exposes a filtering mechanism. This is the preferred path for a repository-level ArchPulse configuration.'
  } else {
    Warn 'The CLI sample config exposes no obvious filtering key. The next step is static inspection of the published CLI package before inventing unsupported YAML fields.'
  }
  Info 'No repository or IDE files were changed.'
}
finally {
  if (Test-Path -LiteralPath $ProbeRoot) {
    Remove-Item -LiteralPath $ProbeRoot -Recurse -Force -ErrorAction SilentlyContinue
    Info ('Removed temporary probe directory: {0}' -f $ProbeRoot)
  }
}
