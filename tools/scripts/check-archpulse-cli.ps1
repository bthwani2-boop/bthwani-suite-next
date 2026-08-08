<#
.SYNOPSIS
  Non-destructive diagnosis of how ArchPulse VS Code 0.1.x invokes its bundled CLI.

.DESCRIPTION
  Locates the ArchPulse extension installed for Antigravity IDE, inspects its compiled
  extension wrapper and packaged files, and prints focused evidence about the CLI command,
  arguments, executable/package location, and any ignore/exclude capability exposed by
  the packaged CLI.

  This script does not modify the repository, IDE settings, extension installation,
  or generated architecture files.
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
Show-AllContexts -Text $Compiled -Pattern 'runArchpulseCLI' -Label 'runArchpulseCLI' -Radius 1300
Show-AllContexts -Text $Compiled -Pattern 'child_process' -Label 'child_process' -Radius 1200
Show-AllContexts -Text $Compiled -Pattern '\bexecFile\b|\bexec\b|\bspawn\b' -Label 'exec/spawn API' -Radius 1400
Show-AllContexts -Text $Compiled -Pattern 'npx|node_modules|archpulse|\.cmd|\.exe|\.js' -Label 'CLI path/command strings' -Radius 1200 -Limit 8

Section 'Configuration keys actually read by wrapper'
$GetMatches = [regex]::Matches($Compiled, '\.get\(["'']([^"'']+)["'']\)')
if ($GetMatches.Count -eq 0) {
  Warn 'No .get("...") configuration reads were detected.'
} else {
  $Keys = @($GetMatches | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
  foreach ($Key in $Keys) { Info ('wrapper reads setting key: {0}' -f $Key) }
  if ($Keys -contains 'ignore') { Pass 'Wrapper reads the ignore setting.' }
  else { Fail 'Wrapper does not read the ignore setting.' }
}

Section 'Packaged ArchPulse files'
$InterestingFiles = @(
  Get-ChildItem -LiteralPath $ExtensionPath -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
      $_.FullName -notmatch '[\\/]node_modules[\\/]' -and
      ($_.Name -match '(?i)(archpulse|cli|bin|package|config)' -or $_.Extension -in @('.cmd', '.ps1', '.sh', '.exe'))
    } |
    Select-Object -First 120
)
if ($InterestingFiles.Count -eq 0) {
  Warn 'No obvious packaged CLI/config files found outside node_modules.'
} else {
  foreach ($File in $InterestingFiles) {
    $Relative = [System.IO.Path]::GetRelativePath($ExtensionPath, $File.FullName)
    Info $Relative
  }
}

Section 'Packaged package manifests'
$PackageFiles = @(
  Get-ChildItem -LiteralPath $ExtensionPath -Recurse -File -Filter 'package.json' -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '[\\/]node_modules[\\/]' }
)
foreach ($PackageFile in $PackageFiles) {
  try {
    $Package = Get-Content -LiteralPath $PackageFile.FullName -Raw | ConvertFrom-Json
    $Relative = [System.IO.Path]::GetRelativePath($ExtensionPath, $PackageFile.FullName)
    Info ('{0} => name={1}; version={2}; bin={3}' -f $Relative, $Package.name, $Package.version, (($Package.bin | ConvertTo-Json -Compress) -replace '^null$', '<none>'))
  } catch {
    Warn ('Could not parse {0}' -f $PackageFile.FullName)
  }
}

Section 'Potential CLI option strings in packaged JavaScript'
$CandidateJs = @(
  Get-ChildItem -LiteralPath $ExtensionPath -Recurse -File -Include '*.js','*.cjs','*.mjs' -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '[\\/]node_modules[\\/]' }
)
$OptionPatterns = @('--ignore', '--exclude', 'ignorePatterns', 'excludePatterns', 'ignore', 'exclude')
foreach ($Option in $OptionPatterns) {
  $Found = $false
  foreach ($File in $CandidateJs) {
    $Hits = Select-String -LiteralPath $File.FullName -SimpleMatch -Pattern $Option -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($Hits) {
      $Relative = [System.IO.Path]::GetRelativePath($ExtensionPath, $File.FullName)
      Pass ('{0} appears in {1}' -f $Option, $Relative)
      $Found = $true
      break
    }
  }
  if (-not $Found) { Warn ('No packaged JavaScript contains {0}' -f $Option) }
}

Section 'Conclusion hints'
Info 'If the wrapper reads only outputDirectory and invokes an external CLI without ignore arguments, archpulse.ignore is manifest-only in this extension version.'
Info 'If the CLI exposes an ignore/exclude flag, that gives us a practical wrapper/workaround path.'
Info 'If neither wrapper nor CLI exposes ignore, the setting is non-functional in this installed version and a version change/fix is required.'
Info 'This diagnostic made no changes.'
