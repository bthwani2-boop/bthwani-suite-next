<#
.SYNOPSIS
  Non-destructive diagnosis of the effective ArchPulse VS Code-compatible IDE configuration.

.DESCRIPTION
  Verifies the repository workspace settings, detects user/workspace overrides, locates
  installed ArchPulse extension copies, and inspects the extension manifest to prove
  whether archpulse.ignore is actually supported by the installed version.

  This script does not generate, edit, or delete architecture diagrams and does not
  modify IDE settings.
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

function Show-ArchPulseTextOverrides([string]$Path, [string]$Label) {
  if (-not (Test-Path $Path)) { return }

  $Raw = Get-Content -LiteralPath $Path -Raw
  $Matches = [regex]::Matches($Raw, '(?im)^\s*"archpulse\.[^"]+"\s*:\s*.*$')
  if ($Matches.Count -eq 0) {
    Info "$Label: no ArchPulse keys ($Path)"
    return
  }

  Warn "$Label contains ArchPulse keys: $Path"
  foreach ($Match in $Matches) {
    Write-Host "        $($Match.Value.Trim())"
  }
}

function Find-ArchPulseExtensions {
  $Candidates = New-Object System.Collections.Generic.List[string]
  $Roots = @(
    (Join-Path $HOME ".vscode/extensions"),
    (Join-Path $HOME ".vscode-insiders/extensions"),
    (Join-Path $HOME ".antigravity/extensions"),
    (Join-Path $HOME ".cursor/extensions"),
    (Join-Path $HOME ".windsurf/extensions")
  ) | Select-Object -Unique

  foreach ($Root in $Roots) {
    if (-not (Test-Path $Root)) { continue }
    Get-ChildItem -LiteralPath $Root -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '(?i)archpulse' } |
      ForEach-Object { $Candidates.Add($_.FullName) }
  }

  return @($Candidates | Select-Object -Unique)
}

function Inspect-Extension([string]$ExtensionPath) {
  $ManifestPath = Join-Path $ExtensionPath "package.json"
  Info "Extension path: $ExtensionPath"

  if (-not (Test-Path $ManifestPath)) {
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
    if ($null -ne (Get-JsonPropertyValue $Properties $Key)) {
      Pass "Installed extension declares $Key"
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
      Write-Host "        $Relative:$($Hit.LineNumber): $Text"
    }
  } else {
    Warn "No clear archpulse.ignore read was found in non-node_modules compiled JS"
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
if (-not (Test-Path $WorkspaceSettings)) {
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
  @{ Label = "Cursor"; Path = (Join-Path $env:APPDATA "Cursor/User/settings.json") },
  @{ Label = "Windsurf"; Path = (Join-Path $env:APPDATA "Windsurf/User/settings.json") }
)

$FoundUserSettings = $false
foreach ($Candidate in $UserSettingCandidates) {
  if (Test-Path $Candidate.Path) {
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

Section "Installed extension"
$ExtensionPaths = @(Find-ArchPulseExtensions)
if ($ExtensionPaths.Count -eq 0) {
  Fail "No ArchPulse extension directory found in known VS Code-compatible extension locations"
  Info "Run the command from the same IDE terminal where ArchPulse is installed."
} else {
  Info "Found $($ExtensionPaths.Count) ArchPulse extension installation(s)"
  foreach ($ExtensionPath in $ExtensionPaths) {
    Inspect-Extension -ExtensionPath $ExtensionPath
  }
}

Section "CLI extension inventories"
foreach ($CommandName in @("code", "antigravity", "cursor", "windsurf")) {
  $Command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($null -eq $Command) { continue }

  Info "$CommandName => $($Command.Source)"
  try {
    $Inventory = & $CommandName --list-extensions --show-versions 2>$null
    $ArchPulseLine = $Inventory | Where-Object { $_ -match '(?i)archpulse' }
    if ($ArchPulseLine) {
      Pass "$CommandName reports: $($ArchPulseLine -join ', ')"
    } else {
      Warn "$CommandName does not report an ArchPulse extension"
    }
  } catch {
    Warn "$CommandName extension inventory failed: $($_.Exception.Message)"
  }
}

Section "Interpretation"
if (($Ignore -contains "plans/**") -and ($Ignore -contains "tools/**")) {
  Info "Repository configuration explicitly excludes Plans and Tools."
  Info "If a fresh ArchPulse run still reports Plans/Tools, the effective IDE configuration is not being consumed or the installed extension has an ignore-handling defect."
}
Info "This script made no changes."
