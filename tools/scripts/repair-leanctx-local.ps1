[CmdletBinding(SupportsShouldProcess)]
param(
  [switch]$Apply,
  [switch]$SkipSetupFix
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$backupRoot = Join-Path $root (".artifacts/backups/leanctx-local/" + (Get-Date -Format "yyyyMMdd-HHmmss"))

function Resolve-LeanCtxExecutable {
  $candidates = @(
    (Join-Path $env:APPDATA "npm/node_modules/lean-ctx-bin/bin/lean-ctx.exe"),
    (Join-Path $env:APPDATA "npm/lean-ctx.exe")
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  foreach ($name in @("lean-ctx.exe", "lean-ctx.cmd", "lean-ctx")) {
    $command = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) {
      return $command.Source
    }
  }

  throw "LeanCTX executable was not found."
}

function Invoke-LeanCtx {
  param(
    [Parameter(Mandatory)][string]$Executable,
    [Parameter(Mandatory)][string[]]$Arguments
  )

  $output = (& $Executable @Arguments 2>&1 | Out-String).Trim()
  $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }

  if ($output) {
    Write-Output $output
  }

  if ($exitCode -ne 0) {
    throw "LeanCTX command failed with exit code ${exitCode}: lean-ctx $($Arguments -join ' ')"
  }

  return $output
}

function Get-OptionalProperty {
  param(
    [AllowNull()]$Object,
    [Parameter(Mandatory)][string]$Name
  )

  if ($null -eq $Object) {
    return $null
  }

  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) {
    return $null
  }

  return $property.Value
}

function Get-LeanCtxServer {
  param([AllowNull()]$Json)

  if ($null -eq $Json) {
    return $null
  }

  foreach ($containerName in @("mcpServers", "servers")) {
    $container = Get-OptionalProperty -Object $Json -Name $containerName
    if ($null -eq $container) {
      continue
    }

    foreach ($serverName in @("lean-ctx", "lean_ctx")) {
      $server = Get-OptionalProperty -Object $container -Name $serverName
      if ($null -ne $server) {
        return $server
      }
    }
  }

  return $null
}

function Remove-BlanketTrust {
  param(
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][string]$Label
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    Write-Output "skip_missing=${Label}::${Path}"
    return $false
  }

  try {
    $json = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -Depth 100
  }
  catch {
    throw "Invalid JSON in $Label config '${Path}': $($_.Exception.Message)"
  }

  $server = Get-LeanCtxServer -Json $json
  if ($null -eq $server) {
    Write-Output "skip_no_leanctx=${Label}::${Path}"
    return $false
  }

  $trustProperty = $server.PSObject.Properties["trust"]
  if ($null -eq $trustProperty -or $trustProperty.Value -ne $true) {
    Write-Output "trust_already_safe=${Label}::${Path}"
    return $false
  }

  if (-not $Apply) {
    Write-Output "would_remove_trust=${Label}::${Path}"
    return $true
  }

  New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
  $safeName = (($Label + "-" + [IO.Path]::GetFileName($Path)) -replace '[^A-Za-z0-9._-]', '_')
  Copy-Item -LiteralPath $Path -Destination (Join-Path $backupRoot $safeName) -Force

  [void]$server.PSObject.Properties.Remove("trust")
  $jsonText = $json | ConvertTo-Json -Depth 100
  Set-Content -LiteralPath $Path -Value $jsonText -Encoding utf8NoBOM

  Write-Output "removed_trust=${Label}::${Path}"
  return $true
}

$leanCtx = Resolve-LeanCtxExecutable

if (-not $Apply) {
  Write-Output "mode=DRY_RUN"
  Write-Output "planned_action=run LeanCTX setup --fix to refresh stale wrappers"
  Write-Output "planned_action=remove trust=true only from LeanCTX MCP entries in detected user JSON configs"
  Write-Output "planned_action=validate config, lean tool profile, doctor, and integrations"
}
else {
  Write-Output "mode=APPLY"
}

if ($Apply -and -not $SkipSetupFix) {
  [void](Invoke-LeanCtx -Executable $leanCtx -Arguments @("setup", "--fix"))
}

$userJsonConfigs = @(
  @{ path = (Join-Path $HOME ".gemini/settings.json"); label = "Gemini CLI" },
  @{ path = (Join-Path $HOME ".gemini/antigravity/mcp_config.json"); label = "Antigravity IDE" },
  @{ path = (Join-Path $HOME ".gemini/antigravity-cli/mcp_config.json"); label = "Antigravity CLI" },
  @{ path = (Join-Path $HOME ".claude.json"); label = "Claude Code" },
  @{ path = (Join-Path $HOME ".qoder/settings.json"); label = "Qoder CLI" }
)

if ($env:APPDATA) {
  $userJsonConfigs += @{
    path = (Join-Path $env:APPDATA "Qoder/SharedClientCache/mcp.json")
    label = "Qoder"
  }
}

foreach ($entry in $userJsonConfigs) {
  [void](Remove-BlanketTrust -Path $entry.path -Label $entry.label)
}

if (-not $Apply) {
  Write-Output "decision=DRY_RUN"
  Write-Output "rerun_with=-Apply"
  exit 0
}

$validation = Invoke-LeanCtx -Executable $leanCtx -Arguments @("config", "validate")
if ($validation -notmatch '(?m)\[OK\]\s+All\s+\d+\s+keys\s+validated\s+successfully') {
  throw "LeanCTX configuration validation did not report success."
}

$tools = Invoke-LeanCtx -Executable $leanCtx -Arguments @("tools", "show")
if ($tools -notmatch '(?im)Tool Profile:\s*lean\b') {
  throw "LeanCTX effective tool profile is not lean after repair."
}

$doctor = Invoke-LeanCtx -Executable $leanCtx -Arguments @("doctor")
if ($doctor -match '(?im)Shadow mode\s+active') {
  throw "LeanCTX shadow mode is still active for this project."
}

$integrations = Invoke-LeanCtx -Executable $leanCtx -Arguments @("doctor", "integrations")
if ($integrations -match '(?im)stale binary|hook wrappers\s+.*(?:stale|failed)|^\s*✗') {
  throw "LeanCTX integrations still report a repairable failure."
}

Write-Output "backup_directory=$backupRoot"
Write-Output "leanctx_profile=lean"
Write-Output "leanctx_shadow_mode=false"
Write-Output "decision=PASS"
