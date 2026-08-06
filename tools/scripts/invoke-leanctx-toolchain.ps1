[CmdletBinding()]
param(
  [ValidateSet("Verify", "Repair", "Full")]
  [string]$Mode = "Verify"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$repairScript = Join-Path $PSScriptRoot "repair-leanctx-local.ps1"
$diagnosticScript = Join-Path $PSScriptRoot "diagnose-leanctx.ps1"

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

  throw "LeanCTX executable was not found on PATH or in the official npm installation path."
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
    throw "LeanCTX command failed with exit code $exitCode: lean-ctx $($Arguments -join ' ')"
  }

  return $output
}

Push-Location $root
try {
  $leanCtx = Resolve-LeanCtxExecutable
  $configPath = Join-Path $root ".lean-ctx.toml"
  if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) {
    throw "Missing project LeanCTX config: $configPath"
  }

  $config = Get-Content -LiteralPath $configPath -Raw
  $requiredMarkers = @(
    'shell_activation = "agents-only"',
    'cache_policy = "safe"',
    'tool_profile = "lean"',
    'shadow_mode = false',
    'enable_wakeup_ctx = false',
    'auto_capture = false',
    'journal_enabled = false',
    'contribute_enabled = false'
  )

  foreach ($marker in $requiredMarkers) {
    if (-not $config.Contains($marker)) {
      throw "LeanCTX project policy marker is missing: $marker"
    }
  }

  if ($config -match '(?m)^\s*tool_profile\s*=\s*"power"\s*$') {
    throw 'LeanCTX power profile is forbidden for the project default because it adds unnecessary fixed tool-schema cost.'
  }

  if ($config -match '(?m)^\s*shadow_mode\s*=\s*true\s*$') {
    throw 'LeanCTX shadow mode must remain disabled for conditional, evidence-driven routing.'
  }

  if ($Mode -in @("Repair", "Full")) {
    if (-not (Test-Path -LiteralPath $repairScript -PathType Leaf)) {
      throw "LeanCTX repair script is missing: $repairScript"
    }

    & $repairScript -Apply
    if ($LASTEXITCODE -ne 0) {
      throw "LeanCTX local repair failed."
    }
  }

  $version = Invoke-LeanCtx -Executable $leanCtx -Arguments @("--version")
  $validation = Invoke-LeanCtx -Executable $leanCtx -Arguments @("config", "validate")
  if ($validation -notmatch '(?m)\[OK\]\s+All\s+\d+\s+keys\s+validated\s+successfully') {
    throw "LeanCTX did not confirm successful config validation."
  }

  $tools = Invoke-LeanCtx -Executable $leanCtx -Arguments @("tools", "show")
  if ($tools -notmatch '(?im)Tool Profile:\s*lean\b') {
    throw "LeanCTX effective tool profile is not lean."
  }

  [void](Invoke-LeanCtx -Executable $leanCtx -Arguments @("tools", "health", "--json"))
  [void](Invoke-LeanCtx -Executable $leanCtx -Arguments @("doctor"))

  if ($Mode -eq "Full") {
    [void](Invoke-LeanCtx -Executable $leanCtx -Arguments @("doctor", "integrations"))
    [void](Invoke-LeanCtx -Executable $leanCtx -Arguments @("status", "--json"))

    if (-not (Test-Path -LiteralPath $diagnosticScript -PathType Leaf)) {
      throw "LeanCTX diagnostic script is missing: $diagnosticScript"
    }

    & $diagnosticScript -Strict
    if ($LASTEXITCODE -ne 0) {
      throw "LeanCTX strict diagnostic failed."
    }
  }

  Write-Output "leanctx_version=$version"
  Write-Output "leanctx_profile=lean"
  Write-Output "leanctx_shadow_mode=false"
  Write-Output "decision=PASS"
}
finally {
  Pop-Location
}
