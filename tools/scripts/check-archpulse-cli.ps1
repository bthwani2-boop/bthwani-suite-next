<#
.SYNOPSIS
  Non-destructive diagnosis of the ArchPulse VS Code wrapper and the live npm CLI it invokes.

.DESCRIPTION
  Locates the ArchPulse extension installed for Antigravity IDE, proves how its wrapper
  invokes ArchPulse, then queries npm/npx for the actual ArchPulse CLI version and help
  text used at runtime. This distinguishes extension settings from CLI capabilities.

  This script does not generate diagrams and does not modify repository files, IDE
  settings, or the extension installation. npx/npm may update their normal package cache.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ExtensionRoot = Join-Path $HOME '.antigravity-ide/extensions'
$ExtensionPattern = 'thanhnguyxn.archpulse-vscode-*'

function Section([string]$Title) {
  Write-Host ''
  Write-Host ('=== {0} ===' -f $Title) -ForegroundColor Cyan
}
function Info([string]$Message) { Write-Host ('  INFO  {0}' -f $Message) }
function Pass([string]$Message) { Write-Host ('  PASS  {0}' -f $Message) -ForegroundColor Green }
function Warn([string]$Message) { Write-Host ('  WARN  {0}' -f $Message) -ForegroundColor Yellow }
function Fail([string]$Message) { Write-Host ('  FAIL  {0}' -f $Message) -ForegroundColor Red }

function Find-ExtensionPath {
  if (-not (Test-Path -LiteralPath $ExtensionRoot)) { return $null }
  $Candidates = @(
    Get-ChildItem -LiteralPath $ExtensionRoot -Directory -Filter $ExtensionPattern -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending
  )
  if ($Candidates.Count -eq 0) { return $null }
  return $Candidates[0].FullName
}

function Show-AllContexts {
  param(
    [string]$Text,
    [string]$Pattern,
    [string]$Label,
    [int]$Radius = 900,
    [int]$Limit = 4
  )

  $Matches = [regex]::Matches($Text, $Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($Matches.Count -eq 0) {
    Warn ('No compiled-code match for {0}' -f $Label)
    return
  }

  Pass ('Found {0} match(es) for {1}' -f $Matches.Count, $Label)
  $Count = [Math]::Min($Matches.Count, $Limit)
  for ($Index = 0; $Index -lt $Count; $Index++) {
    $Match = $Matches[$Index]
    $Start = [Math]::Max(0, $Match.Index - $Radius)
    $End = [Math]::Min($Text.Length, $Match.Index + $Match.Length + $Radius)
    $Snippet = $Text.Substring($Start, $End - $Start)
    $Snippet = $Snippet -replace "`r", ''
    $Snippet = $Snippet -replace "`n", ' '
    $Snippet = [regex]::Replace($Snippet, '\s{2,}', ' ')
    Write-Host ('        [{0}] byte {1}' -f ($Index + 1), $Match.Index)
    Write-Host ('        {0}' -f $Snippet)
  }
}

function Invoke-NativeProbe {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  Info ('Probe: {0}' -f $Label)
  Info ('Command: {0} {1}' -f $Command, ($Arguments -join ' '))

  $OldPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $Output = @(& $Command @Arguments 2>&1)
    $ExitCode = $LASTEXITCODE
  } catch {
    $Output = @($_.Exception.Message)
    $ExitCode = -1
  } finally {
    $ErrorActionPreference = $OldPreference
  }

  if ($ExitCode -eq 0) { Pass ('{0} exited 0' -f $Label) }
  else { Warn ('{0} exit code: {1}' -f $Label, $ExitCode) }

  $Text = ($Output | ForEach-Object { $_.ToString() }) -join "`n"
  if ([string]::IsNullOrWhiteSpace($Text)) {
    Warn ('{0} produced no output' -f $Label)
  } else {
    foreach ($Line in ($Text -split "`r?`n")) {
      Write-Host ('        {0}' -f $Line)
    }
  }

  return [pscustomobject]@{
    Label = $Label
    ExitCode = $ExitCode
    Text = $Text
  }
}

Write-Host ''
Write-Host '╔════════════════════════════════════════════╗' -ForegroundColor Cyan
Write-Host '║       ArchPulse CLI Invocation Check       ║' -ForegroundColor Cyan
Write-Host '╚════════════════════════════════════════════╝' -ForegroundColor Cyan

$ExtensionPath = Find-ExtensionPath
if ([string]::IsNullOrWhiteSpace($ExtensionPath)) {
  Fail ('Could not locate ArchPulse under {0}' -f $ExtensionRoot)
  exit 2
}

$ManifestPath = Join-Path $ExtensionPath 'package.json'
$CompiledPath = Join-Path $ExtensionPath 'dist/extension.js'
if (-not (Test-Path -LiteralPath $ManifestPath) -or -not (Test-Path -LiteralPath $CompiledPath)) {
  Fail 'ArchPulse manifest or compiled extension is missing.'
  exit 3
}

$Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
$Compiled = Get-Content -LiteralPath $CompiledPath -Raw

Section 'Installed extension'
Info ('Path: {0}' -f $ExtensionPath)
Info ('Identity: {0}.{1}' -f $Manifest.publisher, $Manifest.name)
Info ('Version: {0}' -f $Manifest.version)
Info ('Main: {0}' -f $Manifest.main)

Section 'Wrapper invocation evidence'
Show-AllContexts -Text $Compiled -Pattern 'runArchpulseCLI' -Label 'runArchpulseCLI' -Radius 1300 -Limit 2
Show-AllContexts -Text $Compiled -Pattern '\bspawn\b' -Label 'spawn API' -Radius 1400 -Limit 2

$GenerateInvocation = [regex]::Match(
  $Compiled,
  'spawn\)\(a,\["archpulse",\.\.\.o\].*?let o=\["generate","\.","--output",t\]',
  [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
)
if ($Compiled -match '\["generate","\.","--output",t\]' -and $Compiled -match '\["archpulse",\.\.\.o\]') {
  Pass 'Wrapper command is effectively: npx archpulse generate . --output <outputDirectory>'
} else {
  Warn 'Could not prove the exact generate argument array with the compact signature probe.'
}

Section 'Configuration keys actually read by wrapper'
$GetMatches = [regex]::Matches($Compiled, '\.get\(["'']([^"'']+)["'']\)')
$Keys = @($GetMatches | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
if ($Keys.Count -eq 0) {
  Warn 'No .get("...") configuration reads were detected.'
} else {
  foreach ($Key in $Keys) { Info ('wrapper reads setting key: {0}' -f $Key) }
}
if ($Keys -contains 'ignore') { Pass 'Wrapper reads archpulse.ignore.' }
else { Fail 'Wrapper does not read archpulse.ignore.' }
if ($Keys -contains 'outputFormats') { Pass 'Wrapper reads archpulse.outputFormats.' }
else { Warn 'Wrapper does not read archpulse.outputFormats for generation.' }

Section 'Runtime package resolution'
if ($null -eq (Get-Command npm -ErrorAction SilentlyContinue)) {
  Fail 'npm is not available on PATH.'
  exit 4
}
if ($null -eq (Get-Command npx -ErrorAction SilentlyContinue)) {
  Fail 'npx is not available on PATH.'
  exit 4
}

$RegistryVersion = Invoke-NativeProbe -Label 'npm registry version' -Command 'npm' -Arguments @('view', 'archpulse', 'version')
$RegistryTags = Invoke-NativeProbe -Label 'npm dist-tags' -Command 'npm' -Arguments @('view', 'archpulse', 'dist-tags', '--json')
$RuntimeVersion = Invoke-NativeProbe -Label 'npx ArchPulse version' -Command 'npx' -Arguments @('--yes', 'archpulse', '--version')

Section 'Live CLI help'
$RootHelp = Invoke-NativeProbe -Label 'ArchPulse root help' -Command 'npx' -Arguments @('--yes', 'archpulse', '--help')
$GenerateHelp = Invoke-NativeProbe -Label 'ArchPulse generate help' -Command 'npx' -Arguments @('--yes', 'archpulse', 'generate', '--help')
$AnalyzeHelp = Invoke-NativeProbe -Label 'ArchPulse analyze help' -Command 'npx' -Arguments @('--yes', 'archpulse', 'analyze', '--help')

Section 'Live CLI capability classification'
$AllHelp = @($RootHelp.Text, $GenerateHelp.Text, $AnalyzeHelp.Text) -join "`n"
$Capabilities = @(
  @{ Name = 'ignore'; Pattern = '(?i)(--ignore\b|ignore[- ]patterns?|ignore\s+glob)' },
  @{ Name = 'exclude'; Pattern = '(?i)(--exclude\b|exclude[- ]patterns?|exclude\s+glob)' },
  @{ Name = 'config'; Pattern = '(?i)(--config\b|configuration\s+file|config\s+file)' },
  @{ Name = 'include'; Pattern = '(?i)--include\b' },
  @{ Name = 'format'; Pattern = '(?i)(--format\b|--formats\b)' },
  @{ Name = 'output'; Pattern = '(?i)--output\b' }
)

foreach ($Capability in $Capabilities) {
  if ($AllHelp -match $Capability.Pattern) {
    Pass ('CLI help exposes {0}-related capability' -f $Capability.Name)
  } else {
    Warn ('CLI help exposes no {0}-related capability' -f $Capability.Name)
  }
}

$HasIgnore = $AllHelp -match '(?i)(--ignore\b|--exclude\b|ignore[- ]patterns?|exclude[- ]patterns?)'
$HasConfig = $AllHelp -match '(?i)(--config\b|configuration\s+file|config\s+file)'

Section 'Diagnosis'
Fail 'ArchPulse VS Code 0.1.3 declares archpulse.ignore but its generation wrapper does not read or forward it.'
if ($HasIgnore) {
  Pass 'The live CLI exposes an ignore/exclude mechanism. A repository wrapper can use it without patching generated diagrams.'
} elseif ($HasConfig) {
  Pass 'The live CLI exposes configuration-file support. Inspect that format as the preferred repository-level workaround.'
} else {
  Fail 'The live CLI help exposes neither ignore/exclude nor an obvious config-file mechanism.'
  Info 'In that case archpulse.ignore is non-functional end-to-end for this extension/CLI path; use a fixed upstream version or a controlled repository wrapper/filtering strategy.'
}
Info 'This diagnostic did not generate or edit architecture files.'
