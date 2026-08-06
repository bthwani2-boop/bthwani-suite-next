[CmdletBinding()]
param(
  [switch]$SkipIntegrationRepair
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

function Invoke-LeanCtxStreaming {
  param(
    [Parameter(Mandatory)][string[]]$Arguments
  )

  Write-Host "`n==> lean-ctx $($Arguments -join ' ')" -ForegroundColor Cyan
  & $script:LeanCtx @Arguments
  $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
  if ($exitCode -ne 0) {
    throw "LeanCTX command failed with exit code ${exitCode}: lean-ctx $($Arguments -join ' ')"
  }
}

function Invoke-LeanCtxCapture {
  param(
    [Parameter(Mandatory)][string[]]$Arguments,
    [switch]$AllowFailure
  )

  Write-Host "`n==> lean-ctx $($Arguments -join ' ')" -ForegroundColor Cyan
  $lines = @(& $script:LeanCtx @Arguments 2>&1)
  $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
  foreach ($line in $lines) {
    Write-Host ([string]$line)
  }

  if (-not $AllowFailure -and $exitCode -ne 0) {
    throw "LeanCTX command failed with exit code ${exitCode}: lean-ctx $($Arguments -join ' ')"
  }

  return [pscustomobject]@{
    exit_code = $exitCode
    text = (($lines | ForEach-Object { [string]$_ }) -join "`n")
  }
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
    Write-Host "skip_missing=${Label}::${Path}"
    return
  }

  try {
    $json = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -Depth 100
  }
  catch {
    throw "Invalid JSON in $Label config '${Path}': $($_.Exception.Message)"
  }

  $server = Get-LeanCtxServer -Json $json
  if ($null -eq $server) {
    Write-Host "skip_no_leanctx=${Label}::${Path}"
    return
  }

  $trustProperty = $server.PSObject.Properties["trust"]
  if ($null -eq $trustProperty -or $trustProperty.Value -ne $true) {
    Write-Host "trust_already_safe=${Label}::${Path}"
    return
  }

  New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
  $safeName = (($Label + "-" + [IO.Path]::GetFileName($Path)) -replace '[^A-Za-z0-9._-]', '_')
  Copy-Item -LiteralPath $Path -Destination (Join-Path $backupRoot $safeName) -Force

  [void]$server.PSObject.Properties.Remove("trust")
  $jsonText = $json | ConvertTo-Json -Depth 100
  Set-Content -LiteralPath $Path -Value $jsonText -Encoding utf8NoBOM
  Write-Host "removed_trust=${Label}::${Path}"
}

$script:LeanCtx = Resolve-LeanCtxExecutable

Push-Location $root
try {
  Write-Host "LeanCTX unified configuration for bthwani-suite-next" -ForegroundColor Green
  Write-Host "repository_root=$root"
  Write-Host "selected_profile=lean"
  Write-Host "reason=lowest fixed MCP schema cost; specialized tools remain available through ctx_call"

  $projectConfig = Join-Path $root ".lean-ctx.toml"
  if (-not (Test-Path -LiteralPath $projectConfig -PathType Leaf)) {
    throw "Missing project LeanCTX config: $projectConfig"
  }

  $configText = Get-Content -LiteralPath $projectConfig -Raw
  if ($configText -match '(?m)^\s*tool_profile\s*=') {
    throw "The project config must not persist tool_profile. Pull the current smsm branch and rerun."
  }
  if ($configText -notmatch '(?m)^\s*shadow_mode\s*=\s*false\s*$') {
    throw "The project config must keep shadow_mode = false."
  }

  $preIntegration = Invoke-LeanCtxCapture -Arguments @("doctor", "integrations") -AllowFailure
  $needsSetupFix = $preIntegration.exit_code -ne 0 -or $preIntegration.text -match '(?im)stale binary|hook wrappers\s+.*(?:stale|failed)|^\s*✗'

  if ($needsSetupFix -and -not $SkipIntegrationRepair) {
    Write-Host "`nIntegration drift detected; running setup --fix with live output." -ForegroundColor Yellow
    Invoke-LeanCtxStreaming -Arguments @("setup", "--fix")
  }
  elseif ($needsSetupFix) {
    throw "LeanCTX integration repair is required, but -SkipIntegrationRepair was supplied."
  }
  else {
    Write-Host "integration_setup=already_healthy"
  }

  Invoke-LeanCtxStreaming -Arguments @("trust")
  Invoke-LeanCtxStreaming -Arguments @("tools", "lean")

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
    Remove-BlanketTrust -Path $entry.path -Label $entry.label
  }

  $validation = Invoke-LeanCtxCapture -Arguments @("config", "validate")
  if ($validation.text -notmatch '(?m)\[OK\]\s+All\s+\d+\s+keys\s+validated\s+successfully') {
    throw "LeanCTX configuration validation did not report success."
  }

  $tools = Invoke-LeanCtxCapture -Arguments @("tools", "show")
  if ($tools.text -notmatch '(?im)Tool Profile:\s*lean\b') {
    throw "LeanCTX effective tool profile is not lean."
  }

  $doctor = Invoke-LeanCtxCapture -Arguments @("doctor")
  if ($doctor.text -match '(?im)Shadow mode\s+active') {
    throw "LeanCTX shadow mode is still active."
  }

  $integrations = Invoke-LeanCtxCapture -Arguments @("doctor", "integrations")
  if ($integrations.text -match '(?im)stale binary|hook wrappers\s+.*(?:stale|failed)|^\s*✗') {
    throw "LeanCTX integrations still contain a repairable failure."
  }

  Invoke-LeanCtxStreaming -Arguments @("tools", "health")

  Write-Host "`nleanctx_profile=lean" -ForegroundColor Green
  Write-Host "leanctx_shadow_mode=false" -ForegroundColor Green
  Write-Host "backup_directory=$backupRoot"
  Write-Host "decision=PASS" -ForegroundColor Green
}
finally {
  Pop-Location
}
