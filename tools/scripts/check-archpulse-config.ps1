<#
.SYNOPSIS
  Non-destructive diagnosis of the effective ArchPulse configuration in VS Code-compatible IDEs.

.DESCRIPTION
  Verifies repository workspace settings, detects user/workspace overrides, locates the
  actually installed ArchPulse extension (including Google Antigravity IDE), and inspects
  its manifest/compiled code to prove whether archpulse.ignore is declared and consumed.

  This script does not generate, edit, or delete architecture diagrams and does not
  modify IDE or repository settings.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$WorkspaceSettings = Join-Path $RepoRoot ".vscode/settings.json"
$ExtensionId = "ThanhNguyxn.archpulse-vscode"

function Section([string]$Title) {
  Write-Host ""
  Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Pass([string]$Message) { Write-Host "  PASS  $Message" -ForegroundColor Green }
function Warn([string]$Message) { Write-Host "  WARN  $Message" -ForegroundColor Yellow }
function Fail([string]$Message) { Write-Host "  FAIL  $Message" -ForegroundColor Red }
function Info([string]$Message) { Write-Host "  INFO  $Message" }

function Get-JsonPropertyValue($Object, [string]$Name) {
  if ($null -eq $Object) { return $null }
  $Property = $Object.PSObject.Properties[$Name]
  if ($null -eq $Property) { return $null }
  return $Property.Value
}

function Add-UniquePath([System.Collections.Generic.List[string]]$List, [string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path)) { return }
  try {
    $Full = [System.IO.Path]::GetFullPath($Path)
  } catch {
    return
  }
  if (-not ($List -contains $Full)) {
    $List.Add($Full)
  }
}

function Show-ArchPulseTextOverrides([string]$Path, [string]$Label) {
  if (-not (Test-Path -LiteralPath $Path)) { return }

  $Raw = Get-Content -LiteralPath $Path -Raw
  $Matches = [regex]::Matches($Raw, '(?im)^\s*"archpulse\.[^"]+"\s*:\s*.*$')
  if ($Matches.Count -eq 0) {
    Info "${Label}: no ArchPulse keys ($Path)"
    return
  }

  Warn "$Label contains ArchPulse keys: $Path"
  foreach ($Match in $Matches) {
    Write-Host "        $($Match.Value.Trim())"
  }
}

function Get-ProductJsonCandidates([string]$ExecutablePath) {
  $Candidates = New-Object System.Collections.Generic.List[string]
  if ([string]::IsNullOrWhiteSpace($ExecutablePath)) { return @() }

  $ExeDir = Split-Path -Parent $ExecutablePath
  Add-UniquePath $Candidates (Join-Path $ExeDir "resources/app/product.json")
  Add-UniquePath $Candidates (Join-Path $ExeDir "../resources/app/product.json")
  Add-UniquePath $Candidates (Join-Path $ExeDir "../../resources/app/product.json")
  return @($Candidates)
}

function Add-RootsFromProductJson(
  [System.Collections.Generic.List[string]]$Roots,
  [string]$ProductJsonPath
) {
  if (-not (Test-Path -LiteralPath $ProductJsonPath)) { return }

  try {
    $Product = Get-Content -LiteralPath $ProductJsonPath -Raw | ConvertFrom-Json
    Info "Product manifest: $ProductJsonPath"
    if ($Product.nameLong) { Info "Product name: $($Product.nameLong)" }
    if ($Product.dataFolderName) {
      Info "Product dataFolderName: $($Product.dataFolderName)"
      Add-UniquePath $Roots (Join-Path $HOME "$($Product.dataFolderName)/extensions")
    }
  } catch {
    Warn "Could not parse product.json at $ProductJsonPath: $($_.Exception.Message)"
  }
}

function Get-RunningIdeEvidence {
  $Evidence = @()
  try {
    $Processes = Get-CimInstance Win32_Process -ErrorAction Stop |
      Where-Object {
        $_.Name -match '(?i)(antigravity|agy|code|cursor|windsurf)' -or
        $_.ExecutablePath -match '(?i)(antigravity|agy|code|cursor|windsurf)'
      }

    foreach ($Process in $Processes) {
      $Evidence += [pscustomobject]@{
        Name = $Process.Name
        ExecutablePath = $Process.ExecutablePath
        CommandLine = $Process.CommandLine
      }
    }
  } catch {
    Warn "Could not inspect running IDE processes: $($_.Exception.Message)"
  }
  return @($Evidence)
}

function Find-ArchPulseExtensions([object[]]$RunningIdeEvidence) {
  $Roots = New-Object System.Collections.Generic.List[string]
  $Candidates = New-Object System.Collections.Generic.List[string]

  foreach ($Root in @(
    (Join-Path $HOME ".vscode/extensions"),
    (Join-Path $HOME ".vscode-insiders/extensions"),
    (Join-Path $HOME ".antigravity/extensions"),
    (Join-Path $HOME ".antigravity-ide/extensions"),
    (Join-Path $HOME ".antigravity-server/extensions"),
    (Join-Path $HOME ".agy/extensions"),
    (Join-Path $HOME ".agy-ide/extensions"),
    (Join-Path $HOME ".cursor/extensions"),
    (Join-Path $HOME ".windsurf/extensions"),
    (Join-Path $env:LOCALAPPDATA "Antigravity/extensions"),
    (Join-Path $env:LOCALAPPDATA "Antigravity IDE/extensions"),
    (Join-Path $env:APPDATA "Antigravity/extensions"),
    (Join-Path $env:APPDATA "Antigravity IDE/extensions")
  )) {
    Add-UniquePath $Roots $Root
  }

  # Discover VS Code-family data folders from running IDE product.json metadata.
  foreach ($Process in $RunningIdeEvidence) {
    if ([string]::IsNullOrWhiteSpace($Process.ExecutablePath)) { continue }
    foreach ($ProductJson in (Get-ProductJsonCandidates $Process.ExecutablePath)) {
      Add-RootsFromProductJson -Roots $Roots -ProductJsonPath $ProductJson
    }
  }

  # Discover hidden user data folders without recursively crawling the profile.
  try {
    Get-ChildItem -LiteralPath $HOME -Directory -Force -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '(?i)(vscode|code|antigravity|agy|cursor|windsurf)' } |
      ForEach-Object { Add-UniquePath $Roots (Join-Path $_.FullName "extensions") }
  } catch {}

  foreach ($Base in @($env:LOCALAPPDATA, $env:APPDATA)) {
    if ([string]::IsNullOrWhiteSpace($Base) -or -not (Test-Path -LiteralPath $Base)) { continue }
    try {
      Get-ChildItem -LiteralPath $Base -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '(?i)(antigravity|agy|code|cursor|windsurf)' } |
        ForEach-Object { Add-UniquePath $Roots (Join-Path $_.FullName "extensions") }
    } catch {}
  }

  foreach ($Root in ($Roots | Select-Object -Unique)) {
    if (-not (Test-Path -LiteralPath $Root)) { continue }
    Info "Extension root exists: $Root"
    try {
      Get-ChildItem -LiteralPath $Root -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '(?i)archpulse' } |
        ForEach-Object { Add-UniquePath $Candidates $_.FullName }
    } catch {
      Warn "Could not enumerate extension root $Root: $($_.Exception.Message)"
    }
  }

  return @($Candidates | Select-Object -Unique)
}

function Inspect-Extension([string]$ExtensionPath) {
  $ManifestPath = Join-Path $ExtensionPath "package.json"
  Info "Extension path: $ExtensionPath"

  if (-not (Test-Path -LiteralPath $ManifestPath)) {
    Fail "package.json is missing from extension directory"
    return
  }

  try {
    $Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
  } catch {
    Fail "Cannot parse extension package.json: $($_.Exception.Message)"
    return
  }

  $Identity = "$($Manifest.publisher).$($Manifest.name)"
  Info "Extension identity: $Identity"
  Info "Extension version: $($Manifest.version)"

  if ($Identity -ieq $ExtensionId) {
    Pass "Extension identity matches $ExtensionId"
  } else {
    Warn "Extension identity differs from expected $ExtensionId"
  }

  $Properties = $Manifest.contributes.configuration.properties
  if ($null -eq $Properties) {
    Fail "Extension manifest has no contributes.configuration.properties"
    return
  }

  $IgnoreDefinition = Get-JsonPropertyValue $Properties "archpulse.ignore"
  if ($null -eq $IgnoreDefinition) {
    Fail "Installed extension does NOT declare archpulse.ignore"
  } else {
    Pass "Installed extension declares archpulse.ignore"
    Info "archpulse.ignore type: $($IgnoreDefinition.type)"
    if ($null -ne $IgnoreDefinition.scope) {
      Info "archpulse.ignore scope: $($IgnoreDefinition.scope)"
    } else {
      Info "archpulse.ignore scope: <manifest default>"
    }
    if ($null -ne $IgnoreDefinition.default) {
      Info "archpulse.ignore manifest default: $($IgnoreDefinition.default -join ', ')"
    }
  }

  foreach ($Key in @(
    "archpulse.outputDirectory",
    "archpulse.outputFormats",
    "archpulse.autoGenerate",
    "archpulse.showHealthInStatusBar"
  )) {
    $Definition = Get-JsonPropertyValue $Properties $Key
    if ($null -ne $Definition) {
      Pass "Installed extension declares $Key"
      if ($null -ne $Definition.scope) { Info "$Key scope: $($Definition.scope)" }
    } else {
      Warn "Installed extension does not declare $Key"
    }
  }

  $JsFiles = Get-ChildItem -LiteralPath $ExtensionPath -Recurse -File -Filter "*.js" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '[\\/]node_modules[\\/]' }

  $ConfigEvidence = @()
  foreach ($File in $JsFiles) {
    $Hits = Select-String -LiteralPath $File.FullName -Pattern 'getConfiguration\(["'']archpulse["'']\)|get\(["'']ignore["'']\)|archpulse\.ignore' -AllMatches -ErrorAction SilentlyContinue
    if ($Hits) {
      $ConfigEvidence += $Hits | Select-Object -First 3
    }
    if ($ConfigEvidence.Count -ge 12) { break }
  }

  if ($ConfigEvidence.Count -gt 0) {
    Pass "Compiled extension code contains ArchPulse configuration/ignore references"
    foreach ($Hit in ($ConfigEvidence | Select-Object -First 8)) {
      $Relative = [System.IO.Path]::GetRelativePath($ExtensionPath, $Hit.Path)
      $Text = $Hit.Line.Trim()
      if ($Text.Length -gt 220) { $Text = $Text.Substring(0, 220) + "..." }
      Write-Host "        ${Relative}:$($Hit.LineNumber): $Text"
    }
  } else {
    Warn "No clear archpulse.ignore read was found in non-node_modules compiled JS"
  }
}

function Inspect-Cli([string]$CommandName, [System.Collections.Generic.List[string]]$LocatedExtensions) {
  $Command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($null -eq $Command) { return }

  Info "$CommandName => $($Command.Source)"

  try {
    $Inventory = & $CommandName --list-extensions --show-versions 2>$null
    $ArchPulseLine = @($Inventory | Where-Object { $_ -match '(?i)archpulse' })
    if ($ArchPulseLine.Count -gt 0) {
      Pass "$CommandName reports: $($ArchPulseLine -join ', ')"
    } else {
      Warn "$CommandName does not report an ArchPulse extension"
    }
  } catch {
    Warn "$CommandName extension inventory failed: $($_.Exception.Message)"
  }

  # VS Code-family CLIs may expose --locate-extension. Use it only if advertised.
  try {
    $HelpText = (& $CommandName --help 2>$null) -join "`n"
    if ($HelpText -match '(?i)--locate-extension') {
      $Located = (& $CommandName --locate-extension $ExtensionId 2>$null | Select-Object -First 1)
      if (-not [string]::IsNullOrWhiteSpace($Located)) {
        $Located = $Located.Trim()
        Pass "$CommandName located ArchPulse at: $Located"
        Add-UniquePath $LocatedExtensions $Located
      }
    } else {
      Info "$CommandName does not advertise --locate-extension"
    }
  } catch {
    Warn "$CommandName locate-extension check failed: $($_.Exception.Message)"
  }
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ArchPulse Effective Configuration Check   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Info "Repository: $RepoRoot"

Section "Git state"
try {
  $Branch = (& git -C $RepoRoot branch --show-current 2>$null).Trim()
  $Head = (& git -C $RepoRoot rev-parse HEAD 2>$null).Trim()
  Info "Branch: $Branch"
  Info "HEAD:   $Head"
  $SettingsStatus = & git -C $RepoRoot status --short -- ".vscode/settings.json" 2>$null
  if ([string]::IsNullOrWhiteSpace(($SettingsStatus -join ""))) {
    Pass ".vscode/settings.json matches Git working tree"
  } else {
    Warn ".vscode/settings.json has local changes"
    $SettingsStatus | ForEach-Object { Write-Host "        $_" }
  }
} catch {
  Warn "Git state could not be read: $($_.Exception.Message)"
}

Section "Repository workspace settings"
if (-not (Test-Path -LiteralPath $WorkspaceSettings)) {
  Fail "Missing $WorkspaceSettings"
  exit 2
}

try {
  $Settings = Get-Content -LiteralPath $WorkspaceSettings -Raw | ConvertFrom-Json
  Pass "Workspace settings JSON parses successfully"
} catch {
  Fail "Workspace settings JSON cannot be parsed: $($_.Exception.Message)"
  exit 2
}

$Ignore = @(Get-JsonPropertyValue $Settings "archpulse.ignore")
if ($Ignore.Count -eq 0 -or ($Ignore.Count -eq 1 -and $null -eq $Ignore[0])) {
  Fail "archpulse.ignore is absent or empty in repository workspace settings"
} else {
  Pass "archpulse.ignore is present with $($Ignore.Count) pattern(s)"
  foreach ($RequiredPattern in @("plans/**", "tools/**", "**/tests/**", "**/*.test.mjs", "**/*_test.go")) {
    if ($Ignore -contains $RequiredPattern) {
      Pass "ignore contains $RequiredPattern"
    } else {
      Warn "ignore does not contain expected pattern $RequiredPattern"
    }
  }
}

foreach ($Key in @(
  "archpulse.outputDirectory",
  "archpulse.outputFormats",
  "archpulse.autoGenerate",
  "archpulse.showHealthInStatusBar"
)) {
  $Value = Get-JsonPropertyValue $Settings $Key
  if ($null -ne $Value) {
    if ($Value -is [System.Array]) { $Value = $Value -join ", " }
    Info "$Key = $Value"
  } else {
    Warn "$Key is not set at workspace level"
  }
}

Section "Potential user-level overrides"
$UserSettingCandidates = @(
  @{ Label = "VS Code"; Path = (Join-Path $env:APPDATA "Code/User/settings.json") },
  @{ Label = "VS Code Insiders"; Path = (Join-Path $env:APPDATA "Code - Insiders/User/settings.json") },
  @{ Label = "Antigravity"; Path = (Join-Path $env:APPDATA "Antigravity/User/settings.json") },
  @{ Label = "Antigravity IDE"; Path = (Join-Path $env:APPDATA "Antigravity IDE/User/settings.json") },
  @{ Label = "Google Antigravity"; Path = (Join-Path $env:APPDATA "Google Antigravity/User/settings.json") },
  @{ Label = "Cursor"; Path = (Join-Path $env:APPDATA "Cursor/User/settings.json") },
  @{ Label = "Windsurf"; Path = (Join-Path $env:APPDATA "Windsurf/User/settings.json") }
)

$FoundUserSettings = $false
foreach ($Candidate in $UserSettingCandidates) {
  if (Test-Path -LiteralPath $Candidate.Path) {
    $FoundUserSettings = $true
    Show-ArchPulseTextOverrides -Path $Candidate.Path -Label $Candidate.Label
  }
}
if (-not $FoundUserSettings) {
  Info "No known VS Code-compatible user settings files were found"
}

Section "Workspace-file overrides"
$WorkspaceFiles = @(Get-ChildItem -LiteralPath $RepoRoot -File -Filter "*.code-workspace" -ErrorAction SilentlyContinue)
if ($WorkspaceFiles.Count -eq 0) {
  Info "No root *.code-workspace file found"
} else {
  foreach ($WorkspaceFile in $WorkspaceFiles) {
    Show-ArchPulseTextOverrides -Path $WorkspaceFile.FullName -Label "Workspace file"
  }
}

Section "Running IDE processes"
$RunningIdeEvidence = @(Get-RunningIdeEvidence)
if ($RunningIdeEvidence.Count -eq 0) {
  Warn "No VS Code-family IDE process was detected"
} else {
  foreach ($Process in $RunningIdeEvidence) {
    Info "$($Process.Name) => $($Process.ExecutablePath)"
  }
}

Section "CLI extension inventories"
$CliLocatedExtensions = New-Object System.Collections.Generic.List[string]
foreach ($CommandName in @("agy-ide", "antigravity", "code", "cursor", "windsurf")) {
  Inspect-Cli -CommandName $CommandName -LocatedExtensions $CliLocatedExtensions
}
if ($CliLocatedExtensions.Count -eq 0) {
  Info "No CLI directly returned an ArchPulse installation path"
}

Section "Installed extension"
$ExtensionPaths = New-Object System.Collections.Generic.List[string]
foreach ($Path in (Find-ArchPulseExtensions -RunningIdeEvidence $RunningIdeEvidence)) {
  Add-UniquePath $ExtensionPaths $Path
}
foreach ($Path in $CliLocatedExtensions) {
  Add-UniquePath $ExtensionPaths $Path
}

if ($ExtensionPaths.Count -eq 0) {
  Fail "ArchPulse is active in the IDE but its installation directory was not located"
  Info "The next useful evidence is the Antigravity IDE command path and running executable path shown above."
} else {
  Info "Found $($ExtensionPaths.Count) ArchPulse extension installation(s)"
  foreach ($ExtensionPath in ($ExtensionPaths | Select-Object -Unique)) {
    Inspect-Extension -ExtensionPath $ExtensionPath
  }
}

Section "Interpretation"
if (($Ignore -contains "plans/**") -and ($Ignore -contains "tools/**")) {
  Info "Repository configuration explicitly excludes Plans and Tools."
  Info "A fresh ArchPulse graph that still contains Plans/Tools proves the effective extension is not applying workspace ignore configuration correctly."
}
Info "This script made no changes."
