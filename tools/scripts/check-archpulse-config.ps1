<#
.SYNOPSIS
  Non-destructive diagnosis of the effective ArchPulse configuration.

.DESCRIPTION
  Checks repository ArchPulse settings, possible IDE/user overrides, running
  VS Code-compatible IDE processes, CLI extension inventories, installed
  ArchPulse extension manifests, and compiled configuration references.

  This script never generates or edits architecture diagrams and never changes
  IDE settings.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$WorkspaceSettings = Join-Path $RepoRoot '.vscode/settings.json'
$ExtensionId = 'ThanhNguyxn.archpulse-vscode'

function Section([string]$Title) {
  Write-Host ''
  Write-Host ('=== {0} ===' -f $Title) -ForegroundColor Cyan
}

function Out-Line([string]$Level, [string]$Message) {
  $Color = switch ($Level) {
    'PASS' { 'Green' }
    'WARN' { 'Yellow' }
    'FAIL' { 'Red' }
    default { 'Gray' }
  }
  Write-Host ('  {0,-5} {1}' -f $Level, $Message) -ForegroundColor $Color
}

function Add-UniquePath(
  [System.Collections.Generic.List[string]]$List,
  [string]$Path
) {
  if ([string]::IsNullOrWhiteSpace($Path)) { return }
  try { $Full = [System.IO.Path]::GetFullPath($Path) } catch { return }
  if (-not ($List -contains $Full)) { $List.Add($Full) }
}

function Get-JsonProperty($Object, [string]$Name) {
  if ($null -eq $Object) { return $null }
  $Property = $Object.PSObject.Properties[$Name]
  if ($null -eq $Property) { return $null }
  return $Property.Value
}

function Show-ArchPulseKeys([string]$Path, [string]$Label) {
  if (-not (Test-Path -LiteralPath $Path)) { return $false }

  $Hits = @(Select-String -LiteralPath $Path -Pattern '"archpulse\.[^"]+"\s*:' -ErrorAction SilentlyContinue)
  if ($Hits.Count -eq 0) {
    Out-Line 'INFO' ('{0}: no ArchPulse keys ({1})' -f $Label, $Path)
  } else {
    Out-Line 'WARN' ('{0} contains ArchPulse keys: {1}' -f $Label, $Path)
    foreach ($Hit in $Hits) {
      Write-Host ('        {0}' -f $Hit.Line.Trim())
    }
  }
  return $true
}

function Get-RunningIdeProcesses {
  try {
    return @(Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object {
      $_.Name -match '(?i)(antigravity|agy|code|cursor|windsurf)' -or
      $_.ExecutablePath -match '(?i)(antigravity|agy|code|cursor|windsurf)'
    })
  } catch {
    Out-Line 'WARN' ('Could not inspect running IDE processes: {0}' -f $_.Exception.Message)
    return @()
  }
}

function Add-ProductExtensionRoot(
  [System.Collections.Generic.List[string]]$Roots,
  [string]$ExecutablePath
) {
  if ([string]::IsNullOrWhiteSpace($ExecutablePath)) { return }
  $ExeDir = Split-Path -Parent $ExecutablePath
  $Candidates = @(
    (Join-Path $ExeDir 'resources/app/product.json'),
    (Join-Path $ExeDir '../resources/app/product.json'),
    (Join-Path $ExeDir '../../resources/app/product.json')
  )

  foreach ($ProductJsonPath in $Candidates) {
    if (-not (Test-Path -LiteralPath $ProductJsonPath)) { continue }
    try {
      $Product = Get-Content -LiteralPath $ProductJsonPath -Raw | ConvertFrom-Json
      Out-Line 'INFO' ('Product manifest: {0}' -f $ProductJsonPath)
      if ($Product.nameLong) {
        Out-Line 'INFO' ('Product name: {0}' -f $Product.nameLong)
      }
      if ($Product.dataFolderName) {
        Out-Line 'INFO' ('Product dataFolderName: {0}' -f $Product.dataFolderName)
        Add-UniquePath $Roots (Join-Path $HOME ('{0}/extensions' -f $Product.dataFolderName))
      }
    } catch {
      Out-Line 'WARN' ('Could not parse product.json at {0}: {1}' -f $ProductJsonPath, $_.Exception.Message)
    }
  }
}

function Inspect-Cli(
  [string]$CommandName,
  [System.Collections.Generic.List[string]]$LocatedExtensions
) {
  $Command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($null -eq $Command) { return }

  Out-Line 'INFO' ('CLI {0} => {1}' -f $CommandName, $Command.Source)

  try {
    $Inventory = @(& $CommandName --list-extensions --show-versions 2>$null)
    $ArchPulse = @($Inventory | Where-Object { $_ -match '(?i)archpulse' })
    if ($ArchPulse.Count -gt 0) {
      Out-Line 'PASS' ('{0} reports: {1}' -f $CommandName, ($ArchPulse -join ', '))
    } else {
      Out-Line 'WARN' ('{0} does not report ArchPulse' -f $CommandName)
    }
  } catch {
    Out-Line 'WARN' ('{0} extension inventory failed: {1}' -f $CommandName, $_.Exception.Message)
  }

  try {
    $Help = (& $CommandName --help 2>$null) -join "`n"
    if ($Help -match '(?i)--locate-extension') {
      $Located = (& $CommandName --locate-extension $ExtensionId 2>$null | Select-Object -First 1)
      if (-not [string]::IsNullOrWhiteSpace($Located)) {
        $Located = $Located.Trim()
        Out-Line 'PASS' ('{0} located ArchPulse at: {1}' -f $CommandName, $Located)
        Add-UniquePath $LocatedExtensions $Located
      }
    } else {
      Out-Line 'INFO' ('{0} does not advertise --locate-extension' -f $CommandName)
    }
  } catch {
    Out-Line 'WARN' ('{0} locate-extension check failed: {1}' -f $CommandName, $_.Exception.Message)
  }
}

function Find-ArchPulseExtensions(
  [object[]]$RunningProcesses,
  [System.Collections.Generic.List[string]]$CliLocated
) {
  $Roots = New-Object System.Collections.Generic.List[string]
  $Found = New-Object System.Collections.Generic.List[string]

  $KnownRoots = @(
    (Join-Path $HOME '.vscode/extensions'),
    (Join-Path $HOME '.vscode-insiders/extensions'),
    (Join-Path $HOME '.antigravity/extensions'),
    (Join-Path $HOME '.antigravity-ide/extensions'),
    (Join-Path $HOME '.agy/extensions'),
    (Join-Path $HOME '.agy-ide/extensions'),
    (Join-Path $HOME '.cursor/extensions'),
    (Join-Path $HOME '.windsurf/extensions'),
    (Join-Path $env:APPDATA 'Antigravity/extensions'),
    (Join-Path $env:APPDATA 'Antigravity IDE/extensions'),
    (Join-Path $env:APPDATA 'Google Antigravity/extensions'),
    (Join-Path $env:LOCALAPPDATA 'Antigravity/extensions'),
    (Join-Path $env:LOCALAPPDATA 'Antigravity IDE/extensions'),
    (Join-Path $env:LOCALAPPDATA 'Google Antigravity/extensions')
  )

  foreach ($Root in $KnownRoots) { Add-UniquePath $Roots $Root }
  foreach ($Process in $RunningProcesses) {
    Add-ProductExtensionRoot -Roots $Roots -ExecutablePath $Process.ExecutablePath
  }
  foreach ($Path in $CliLocated) { Add-UniquePath $Found $Path }

  foreach ($Root in ($Roots | Select-Object -Unique)) {
    if (-not (Test-Path -LiteralPath $Root)) { continue }
    Out-Line 'INFO' ('Extension root exists: {0}' -f $Root)
    try {
      Get-ChildItem -LiteralPath $Root -Directory -ErrorAction Stop |
        Where-Object { $_.Name -match '(?i)archpulse' } |
        ForEach-Object { Add-UniquePath $Found $_.FullName }
    } catch {
      Out-Line 'WARN' ('Could not enumerate extension root {0}: {1}' -f $Root, $_.Exception.Message)
    }
  }

  return @($Found | Select-Object -Unique)
}

function Inspect-Extension([string]$ExtensionPath) {
  $ManifestPath = Join-Path $ExtensionPath 'package.json'
  Out-Line 'INFO' ('Extension path: {0}' -f $ExtensionPath)

  if (-not (Test-Path -LiteralPath $ManifestPath)) {
    Out-Line 'FAIL' 'package.json is missing from extension directory'
    return
  }

  try {
    $Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
  } catch {
    Out-Line 'FAIL' ('Cannot parse extension package.json: {0}' -f $_.Exception.Message)
    return
  }

  $Identity = '{0}.{1}' -f $Manifest.publisher, $Manifest.name
  Out-Line 'INFO' ('Extension identity: {0}' -f $Identity)
  Out-Line 'INFO' ('Extension version: {0}' -f $Manifest.version)

  if ($Identity -ieq $ExtensionId) {
    Out-Line 'PASS' ('Extension identity matches {0}' -f $ExtensionId)
  } else {
    Out-Line 'WARN' ('Extension identity differs from expected {0}' -f $ExtensionId)
  }

  $Properties = $Manifest.contributes.configuration.properties
  if ($null -eq $Properties) {
    Out-Line 'FAIL' 'Extension manifest has no contributes.configuration.properties'
    return
  }

  foreach ($Key in @(
    'archpulse.ignore',
    'archpulse.outputDirectory',
    'archpulse.outputFormats',
    'archpulse.autoGenerate',
    'archpulse.showHealthInStatusBar'
  )) {
    $Definition = Get-JsonProperty $Properties $Key
    if ($null -eq $Definition) {
      Out-Line 'FAIL' ('Installed extension does NOT declare {0}' -f $Key)
    } else {
      Out-Line 'PASS' ('Installed extension declares {0}' -f $Key)
      if ($Definition.scope) {
        Out-Line 'INFO' ('{0} scope: {1}' -f $Key, $Definition.scope)
      }
      if ($Key -eq 'archpulse.ignore' -and $null -ne $Definition.default) {
        Out-Line 'INFO' ('archpulse.ignore default: {0}' -f ($Definition.default -join ', '))
      }
    }
  }

  $Evidence = @()
  try {
    $JsFiles = Get-ChildItem -LiteralPath $ExtensionPath -Recurse -File -Filter '*.js' -ErrorAction Stop |
      Where-Object { $_.FullName -notmatch '[\\/]node_modules[\\/]' }
    foreach ($File in $JsFiles) {
      $Hits = @(Select-String -LiteralPath $File.FullName -Pattern 'getConfiguration\(["'']archpulse["'']\)|get\(["'']ignore["'']\)|archpulse\.ignore' -AllMatches -ErrorAction SilentlyContinue)
      if ($Hits.Count -gt 0) { $Evidence += $Hits | Select-Object -First 2 }
      if ($Evidence.Count -ge 8) { break }
    }
  } catch {
    Out-Line 'WARN' ('Could not inspect compiled extension JavaScript: {0}' -f $_.Exception.Message)
  }

  if ($Evidence.Count -gt 0) {
    Out-Line 'PASS' 'Compiled extension code contains ArchPulse configuration/ignore references'
    foreach ($Hit in ($Evidence | Select-Object -First 8)) {
      $Relative = [System.IO.Path]::GetRelativePath($ExtensionPath, $Hit.Path)
      $Text = $Hit.Line.Trim()
      if ($Text.Length -gt 200) { $Text = $Text.Substring(0, 200) + '...' }
      Write-Host ('        {0}:{1}: {2}' -f $Relative, $Hit.LineNumber, $Text)
    }
  } else {
    Out-Line 'WARN' 'No clear archpulse.ignore read was found in compiled extension JavaScript'
  }
}

Write-Host ''
Write-Host '╔════════════════════════════════════════════╗' -ForegroundColor Cyan
Write-Host '║  ArchPulse Effective Configuration Check   ║' -ForegroundColor Cyan
Write-Host '╚════════════════════════════════════════════╝' -ForegroundColor Cyan
Out-Line 'INFO' ('Repository: {0}' -f $RepoRoot)

Section 'Git state'
try {
  $Branch = (& git -C $RepoRoot branch --show-current 2>$null).Trim()
  $Head = (& git -C $RepoRoot rev-parse HEAD 2>$null).Trim()
  Out-Line 'INFO' ('Branch: {0}' -f $Branch)
  Out-Line 'INFO' ('HEAD: {0}' -f $Head)
  $SettingsStatus = @(& git -C $RepoRoot status --short -- '.vscode/settings.json' 2>$null)
  if ([string]::IsNullOrWhiteSpace(($SettingsStatus -join ''))) {
    Out-Line 'PASS' '.vscode/settings.json matches Git working tree'
  } else {
    Out-Line 'WARN' '.vscode/settings.json has local changes'
  }
} catch {
  Out-Line 'WARN' ('Git state could not be read: {0}' -f $_.Exception.Message)
}

Section 'Repository workspace settings'
if (-not (Test-Path -LiteralPath $WorkspaceSettings)) {
  Out-Line 'FAIL' ('Missing {0}' -f $WorkspaceSettings)
  exit 2
}

try {
  $Settings = Get-Content -LiteralPath $WorkspaceSettings -Raw | ConvertFrom-Json
  Out-Line 'PASS' 'Workspace settings JSON parses successfully'
} catch {
  Out-Line 'FAIL' ('Workspace settings JSON cannot be parsed: {0}' -f $_.Exception.Message)
  exit 2
}

$Ignore = @(Get-JsonProperty $Settings 'archpulse.ignore')
if ($Ignore.Count -eq 0 -or ($Ignore.Count -eq 1 -and $null -eq $Ignore[0])) {
  Out-Line 'FAIL' 'archpulse.ignore is absent or empty'
} else {
  Out-Line 'PASS' ('archpulse.ignore is present with {0} pattern(s)' -f $Ignore.Count)
  foreach ($Pattern in @('plans/**', 'tools/**', '**/tests/**', '**/*.test.mjs', '**/*_test.go')) {
    if ($Ignore -contains $Pattern) {
      Out-Line 'PASS' ('ignore contains {0}' -f $Pattern)
    } else {
      Out-Line 'WARN' ('ignore does not contain expected pattern {0}' -f $Pattern)
    }
  }
}

foreach ($Key in @(
  'archpulse.outputDirectory',
  'archpulse.outputFormats',
  'archpulse.autoGenerate',
  'archpulse.showHealthInStatusBar'
)) {
  $Value = Get-JsonProperty $Settings $Key
  if ($null -eq $Value) {
    Out-Line 'WARN' ('{0} is not set at workspace level' -f $Key)
  } else {
    if ($Value -is [System.Array]) { $Value = $Value -join ', ' }
    Out-Line 'INFO' ('{0} = {1}' -f $Key, $Value)
  }
}

Section 'Potential user-level overrides'
$UserCandidates = @(
  @{ Label = 'VS Code'; Path = (Join-Path $env:APPDATA 'Code/User/settings.json') },
  @{ Label = 'VS Code Insiders'; Path = (Join-Path $env:APPDATA 'Code - Insiders/User/settings.json') },
  @{ Label = 'Antigravity'; Path = (Join-Path $env:APPDATA 'Antigravity/User/settings.json') },
  @{ Label = 'Antigravity IDE'; Path = (Join-Path $env:APPDATA 'Antigravity IDE/User/settings.json') },
  @{ Label = 'Google Antigravity'; Path = (Join-Path $env:APPDATA 'Google Antigravity/User/settings.json') },
  @{ Label = 'Cursor'; Path = (Join-Path $env:APPDATA 'Cursor/User/settings.json') },
  @{ Label = 'Windsurf'; Path = (Join-Path $env:APPDATA 'Windsurf/User/settings.json') }
)
$AnyUserSettings = $false
foreach ($Candidate in $UserCandidates) {
  if (Show-ArchPulseKeys -Path $Candidate.Path -Label $Candidate.Label) { $AnyUserSettings = $true }
}
if (-not $AnyUserSettings) {
  Out-Line 'INFO' 'No known VS Code-compatible user settings files were found'
}

Section 'Workspace-file overrides'
$WorkspaceFiles = @(Get-ChildItem -LiteralPath $RepoRoot -File -Filter '*.code-workspace' -ErrorAction SilentlyContinue)
if ($WorkspaceFiles.Count -eq 0) {
  Out-Line 'INFO' 'No root *.code-workspace file found'
} else {
  foreach ($WorkspaceFile in $WorkspaceFiles) {
    [void](Show-ArchPulseKeys -Path $WorkspaceFile.FullName -Label 'Workspace file')
  }
}

Section 'Running IDE processes'
$RunningProcesses = @(Get-RunningIdeProcesses)
if ($RunningProcesses.Count -eq 0) {
  Out-Line 'WARN' 'No VS Code-family IDE process was detected'
} else {
  foreach ($Process in $RunningProcesses) {
    Out-Line 'INFO' ('{0} => {1}' -f $Process.Name, $Process.ExecutablePath)
  }
}

Section 'CLI extension inventories'
$CliLocated = New-Object System.Collections.Generic.List[string]
foreach ($CommandName in @('agy-ide', 'antigravity', 'code', 'cursor', 'windsurf')) {
  Inspect-Cli -CommandName $CommandName -LocatedExtensions $CliLocated
}
if ($CliLocated.Count -eq 0) {
  Out-Line 'INFO' 'No CLI directly returned an ArchPulse installation path'
}

Section 'Installed extension'
$ExtensionPaths = @(Find-ArchPulseExtensions -RunningProcesses $RunningProcesses -CliLocated $CliLocated)
if ($ExtensionPaths.Count -eq 0) {
  Out-Line 'FAIL' 'ArchPulse installation directory was not located'
  Out-Line 'INFO' 'Use the running IDE executable and CLI evidence above to identify the active extension host.'
} else {
  Out-Line 'INFO' ('Found {0} ArchPulse extension installation(s)' -f $ExtensionPaths.Count)
  foreach ($ExtensionPath in $ExtensionPaths) {
    Inspect-Extension -ExtensionPath $ExtensionPath
  }
}

Section 'Interpretation'
if (($Ignore -contains 'plans/**') -and ($Ignore -contains 'tools/**')) {
  Out-Line 'INFO' 'Repository configuration explicitly excludes Plans and Tools.'
  Out-Line 'INFO' 'If a fresh graph still contains Plans/Tools, the active extension is not applying this workspace ignore configuration correctly.'
}
Out-Line 'INFO' 'This script made no changes.'
