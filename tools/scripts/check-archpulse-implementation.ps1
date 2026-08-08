<#
.SYNOPSIS
  Non-destructive static diagnosis of ArchPulse's installed implementation.

.DESCRIPTION
  Locates the installed ThanhNguyxn.archpulse-vscode extension used by Antigravity IDE,
  reads its manifest and compiled JavaScript, and prints focused evidence showing how
  archpulse.ignore is read and how source files are discovered.

  The script does not edit IDE settings, extension files, generated diagrams, or source.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$WorkspaceSettings = Join-Path $RepoRoot '.vscode/settings.json'
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

function Get-JsonPropertyValue($Object, [string]$Name) {
  if ($null -eq $Object) { return $null }
  $Property = $Object.PSObject.Properties[$Name]
  if ($null -eq $Property) { return $null }
  return $Property.Value
}

function Find-ExtensionPath {
  if (-not (Test-Path -LiteralPath $ExtensionRoot)) { return $null }
  $Candidates = @(
    Get-ChildItem -LiteralPath $ExtensionRoot -Directory -Filter $ExtensionPattern -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending
  )
  if ($Candidates.Count -eq 0) { return $null }
  return $Candidates[0].FullName
}

function Show-Context([string]$Text, [string]$Pattern, [string]$Label, [int]$Radius = 700) {
  $Match = [regex]::Match($Text, $Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if (-not $Match.Success) {
    Warn ('No compiled-code match for {0}' -f $Label)
    return $false
  }

  $Start = [Math]::Max(0, $Match.Index - $Radius)
  $End = [Math]::Min($Text.Length, $Match.Index + $Match.Length + $Radius)
  $Length = $End - $Start
  $Snippet = $Text.Substring($Start, $Length)
  $Snippet = $Snippet -replace "`r", ''
  $Snippet = $Snippet -replace "`n", ' '
  $Snippet = [regex]::Replace($Snippet, '\s{2,}', ' ')

  Pass ('Found compiled-code evidence for {0} at byte {1}' -f $Label, $Match.Index)
  Write-Host '        ----- snippet -----'
  Write-Host ('        {0}' -f $Snippet)
  Write-Host '        ----- end snippet -----'
  return $true
}

Write-Host ''
Write-Host '╔════════════════════════════════════════════╗' -ForegroundColor Cyan
Write-Host '║   ArchPulse Implementation Diagnostic      ║' -ForegroundColor Cyan
Write-Host '╚════════════════════════════════════════════╝' -ForegroundColor Cyan
Info ('Repository: {0}' -f $RepoRoot)

Section 'Workspace configuration'
if (-not (Test-Path -LiteralPath $WorkspaceSettings)) {
  Fail ('Missing workspace settings: {0}' -f $WorkspaceSettings)
  exit 2
}
$Settings = Get-Content -LiteralPath $WorkspaceSettings -Raw | ConvertFrom-Json
$WorkspaceIgnore = @(Get-JsonPropertyValue $Settings 'archpulse.ignore')
Info ('Configured ignore pattern count: {0}' -f $WorkspaceIgnore.Count)
foreach ($Pattern in @('plans/**', 'tools/**', '**/tests/**', '**/*.test.mjs', '**/*_test.go')) {
  if ($WorkspaceIgnore -contains $Pattern) { Pass ('Workspace ignore contains {0}' -f $Pattern) }
  else { Warn ('Workspace ignore is missing {0}' -f $Pattern) }
}

Section 'Installed ArchPulse'
$ExtensionPath = Find-ExtensionPath
if ([string]::IsNullOrWhiteSpace($ExtensionPath)) {
  Fail ('Could not locate ArchPulse under {0}' -f $ExtensionRoot)
  exit 3
}
Info ('Extension path: {0}' -f $ExtensionPath)

$ManifestPath = Join-Path $ExtensionPath 'package.json'
$CompiledPath = Join-Path $ExtensionPath 'dist/extension.js'
if (-not (Test-Path -LiteralPath $ManifestPath)) {
  Fail ('Missing extension manifest: {0}' -f $ManifestPath)
  exit 3
}
if (-not (Test-Path -LiteralPath $CompiledPath)) {
  Fail ('Missing compiled extension: {0}' -f $CompiledPath)
  exit 3
}

$Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
Info ('Identity: {0}.{1}' -f $Manifest.publisher, $Manifest.name)
Info ('Version: {0}' -f $Manifest.version)
Info ('Main: {0}' -f $Manifest.main)

$Properties = $Manifest.contributes.configuration.properties
$IgnoreDefinition = Get-JsonPropertyValue $Properties 'archpulse.ignore'
if ($null -eq $IgnoreDefinition) {
  Fail 'Manifest does not declare archpulse.ignore'
} else {
  Pass 'Manifest declares archpulse.ignore'
  Info ('Manifest ignore type: {0}' -f $IgnoreDefinition.type)
  Info ('Manifest ignore default: {0}' -f (@($IgnoreDefinition.default) -join ', '))
  if ($null -ne $IgnoreDefinition.scope) { Info ('Manifest ignore scope: {0}' -f $IgnoreDefinition.scope) }
  else { Info 'Manifest ignore scope: <default scope>' }
}

Section 'Bundled dependencies and files'
$DependencyNames = @()
if ($null -ne $Manifest.dependencies) { $DependencyNames += @($Manifest.dependencies.PSObject.Properties.Name) }
if ($null -ne $Manifest.devDependencies) { $DependencyNames += @($Manifest.devDependencies.PSObject.Properties.Name) }
$InterestingDeps = @($DependencyNames | Where-Object { $_ -match '(?i)(glob|fast-glob|micromatch|minimatch|ignore|typescript|parser)' } | Sort-Object -Unique)
if ($InterestingDeps.Count -gt 0) {
  foreach ($Dep in $InterestingDeps) { Info ('Relevant package: {0}' -f $Dep) }
} else {
  Info 'No glob/match package is obvious in package.json dependencies'
}

foreach ($Candidate in @('src', 'out', 'dist', 'dist/extension.js.map', 'out/extension.js.map')) {
  $CandidatePath = Join-Path $ExtensionPath $Candidate
  if (Test-Path -LiteralPath $CandidatePath) { Info ('Packaged path exists: {0}' -f $Candidate) }
}

$Compiled = Get-Content -LiteralPath $CompiledPath -Raw
Info ('Compiled extension size: {0} bytes' -f $Compiled.Length)

Section 'Configuration read path'
$FoundConfig = $false
$FoundConfig = (Show-Context -Text $Compiled -Pattern 'getConfiguration\(["'']archpulse["'']\)' -Label 'getConfiguration("archpulse")') -or $FoundConfig
$FoundConfig = (Show-Context -Text $Compiled -Pattern '\.get\(["'']ignore["'']' -Label '.get("ignore")') -or $FoundConfig
$FoundConfig = (Show-Context -Text $Compiled -Pattern 'archpulse\.ignore' -Label 'literal archpulse.ignore') -or $FoundConfig
if (-not $FoundConfig) { Fail 'Could not find a clear configuration-read path in compiled code' }

Section 'File discovery and exclusion path'
$DiscoveryMarkers = @(
  @{ Pattern = 'workspace\.findFiles'; Label = 'workspace.findFiles' },
  @{ Pattern = '\.findFiles\('; Label = 'findFiles(' },
  @{ Pattern = 'fast-glob|fastGlob|fg\('; Label = 'fast-glob' },
  @{ Pattern = 'micromatch'; Label = 'micromatch' },
  @{ Pattern = 'minimatch'; Label = 'minimatch' },
  @{ Pattern = 'globSync|glob\.sync|glob\('; Label = 'glob' },
  @{ Pattern = 'readdir|readDirectory'; Label = 'filesystem directory scan' }
)
$DiscoveryFound = $false
foreach ($Marker in $DiscoveryMarkers) {
  if (Show-Context -Text $Compiled -Pattern $Marker.Pattern -Label $Marker.Label -Radius 900) {
    $DiscoveryFound = $true
  }
}
if (-not $DiscoveryFound) { Warn 'No familiar file-discovery API was identified by the static probes' }

Section 'Ignore-use probes'
$IgnoreUsePatterns = @(
  @{ Pattern = 'ignorePatterns'; Label = 'ignorePatterns identifier' },
  @{ Pattern = 'excludePatterns'; Label = 'excludePatterns identifier' },
  @{ Pattern = 'exclude'; Label = 'exclude identifier' },
  @{ Pattern = 'ignore'; Label = 'ignore identifier' }
)
foreach ($Probe in $IgnoreUsePatterns) {
  [void](Show-Context -Text $Compiled -Pattern $Probe.Pattern -Label $Probe.Label -Radius 1000)
}

Section 'Interpretation checklist'
Info 'Look for the snippet that reads .get("ignore") and note the variable receiving the array.'
Info 'Then look for file discovery and verify that the same variable reaches the scanner/exclude argument.'
Info 'If workspace.findFiles is used, inspect whether exclusions are passed as a valid VS Code GlobPattern rather than an unconverted array.'
Info 'If a glob library is used, inspect whether the configured patterns are passed in its ignore option and whether paths are workspace-relative.'
Info 'This diagnostic made no changes.'
