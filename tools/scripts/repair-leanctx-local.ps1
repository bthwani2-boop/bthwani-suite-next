[CmdletBinding()]
param(
  [ValidateRange(30, 900)]
  [int]$TimeoutSeconds = 180
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

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
    [Parameter(Mandatory)]
    [string[]]$Arguments,

    [int]$Timeout = $TimeoutSeconds,

    [switch]$AllowFailure
  )

  Write-Host "`n==> lean-ctx $($Arguments -join ' ')" -ForegroundColor Cyan

  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $script:LeanCtx
  $startInfo.WorkingDirectory = $root
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.CreateNoWindow = $true

  foreach ($argument in $Arguments) {
    [void]$startInfo.ArgumentList.Add($argument)
  }

  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $startInfo

  if (-not $process.Start()) {
    throw "Failed to start LeanCTX."
  }

  $stdoutTask = $process.StandardOutput.ReadToEndAsync()
  $stderrTask = $process.StandardError.ReadToEndAsync()

  if (-not $process.WaitForExit($Timeout * 1000)) {
    try {
      $process.Kill($true)
    }
    catch {
      Write-Warning "Could not terminate timed-out LeanCTX process."
    }
    throw "LeanCTX command timed out after ${Timeout}s: lean-ctx $($Arguments -join ' ')"
  }

  $stdout = $stdoutTask.GetAwaiter().GetResult()
  $stderr = $stderrTask.GetAwaiter().GetResult()
  $text = (($stdout, $stderr) -join "`n").Trim()
  $exitCode = [int]$process.ExitCode

  if ($text) {
    Write-Host $text
  }

  if (-not $AllowFailure -and $exitCode -ne 0) {
    throw "LeanCTX command failed with exit code ${exitCode}: lean-ctx $($Arguments -join ' ')"
  }

  return [pscustomobject]@{
    exit_code = $exitCode
    text = $text
  }
}

function Backup-File {
  param(
    [Parameter(Mandatory)]
    [string]$Path,

    [Parameter(Mandatory)]
    [string]$Label
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return
  }

  New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
  $safeName = (($Label + "-" + [IO.Path]::GetFileName($Path)) -replace '[^A-Za-z0-9._-]', '_')
  Copy-Item -LiteralPath $Path -Destination (Join-Path $backupRoot $safeName) -Force
}

function Test-AnyPath {
  param([string[]]$Paths)
  foreach ($path in $Paths) {
    if ($path -and (Test-Path -LiteralPath $path)) {
      return $true
    }
  }
  return $false
}

function Initialize-DetectedAgents {
  $targets = @(
    @{
      name = "claude"
      paths = @((Join-Path $HOME ".claude"), (Join-Path $HOME ".claude.json"))
    },
    @{
      name = "codex"
      paths = @((Join-Path $HOME ".codex"))
    },
    @{
      name = "gemini"
      paths = @((Join-Path $HOME ".gemini"))
    },
    @{
      name = "antigravity"
      paths = @((Join-Path $HOME ".gemini/antigravity"))
    },
    @{
      name = "antigravity-cli"
      paths = @((Join-Path $HOME ".gemini/antigravity-cli"))
    },
    @{
      name = "qoder"
      paths = @((Join-Path $HOME ".qoder"))
    },
    @{
      name = "qodercli"
      paths = @((Join-Path $HOME ".qoder"))
    }
  )

  foreach ($target in $targets) {
    if (Test-AnyPath -Paths $target.paths) {
      [void](Invoke-LeanCtx -Arguments @("init", "--agent", $target.name, "--mode", "hybrid") -Timeout 240)
    }
    else {
      Write-Host "skip_not_detected=$($target.name)"
    }
  }
}

function Reset-ClaudeLeanCtxWrappers {
  $hooksDirectory = Join-Path $HOME ".claude/hooks"
  $wrapperNames = @(
    "lean-ctx-rewrite.sh",
    "lean-ctx-rewrite-native",
    "lean-ctx-redirect-native"
  )

  foreach ($name in $wrapperNames) {
    $path = Join-Path $hooksDirectory $name
    if (Test-Path -LiteralPath $path -PathType Leaf) {
      Backup-File -Path $path -Label "Claude-hook"
      Remove-Item -LiteralPath $path -Force
      Write-Host "removed_stale_wrapper=$path"
    }
  }
}

function Assert-RepositoryPolicy {
  $projectConfig = Join-Path $root ".lean-ctx.toml"
  if (-not (Test-Path -LiteralPath $projectConfig -PathType Leaf)) {
    throw "Missing project LeanCTX config: $projectConfig"
  }

  $configText = Get-Content -LiteralPath $projectConfig -Raw

  if ($configText -match '(?m)^\s*tool_profile\s*=') {
    throw "The project config must not persist tool_profile. Use the CLI profile selector instead."
  }

  if ($configText -notmatch '(?m)^\s*shadow_mode\s*=\s*false\s*$') {
    throw "The project config must keep shadow_mode = false."
  }

  foreach ($marker in @(
    'shell_activation\s*=\s*"agents-only"',
    'cache_policy\s*=\s*"safe"',
    'auto_capture\s*=\s*false',
    'journal_enabled\s*=\s*false',
    'enable_wakeup_ctx\s*=\s*false',
    'contribute_enabled\s*=\s*false'
  )) {
    if ($configText -notmatch $marker) {
      throw "Required LeanCTX project marker is missing: $marker"
    }
  }

  $geminiProjectSettings = Join-Path $root ".gemini/settings.json"
  if (Test-Path -LiteralPath $geminiProjectSettings -PathType Leaf) {
    $geminiText = Get-Content -LiteralPath $geminiProjectSettings -Raw
    if ($geminiText -match '(?im)"trust"\s*:\s*true') {
      throw "Repository-level Gemini settings must not enable trust=true."
    }
  }
}

$script:LeanCtx = Resolve-LeanCtxExecutable

Push-Location $root
try {
  Write-Host "LeanCTX unified configuration for bthwani-suite-next" -ForegroundColor Green
  Write-Host "repository_root=$root"
  Write-Host "selected_tool_profile=lean"
  Write-Host "selected_agent_mode=hybrid"
  Write-Host "reason=lowest fixed schema cost while preserving native tools and on-demand ctx_call access"

  Assert-RepositoryPolicy

  # Prevent inherited harden/shadow environment state from forcing Replace mode.
  Remove-Item Env:LEAN_CTX_HARDEN -ErrorAction SilentlyContinue
  $env:LEAN_CTX_SHADOW_MODE = "false"

  [void](Invoke-LeanCtx -Arguments @("config", "set", "shadow_mode", "false"))

  if ($IsWindows) {
    $homePath = [IO.Path]::GetFullPath($HOME)
    $binaryPath = [IO.Path]::GetFullPath($script:LeanCtx)
    if ($binaryPath.StartsWith($homePath, [StringComparison]::OrdinalIgnoreCase)) {
      $relative = $binaryPath.Substring($homePath.Length)
      $relative = ($relative -replace '^[\\/]+', '') -replace '\\', '/'
      $portableHookBinary = '$HOME/' + $relative
      [void](Invoke-LeanCtx -Arguments @("config", "set", "hook_binary", $portableHookBinary))
    }
  }

  # Trust must happen before agent setup so shadow_mode=false caps Replace to Hybrid.
  [void](Invoke-LeanCtx -Arguments @("trust"))

  # Revert any previously enabled strict enforcement before regenerating hooks.
  [void](Invoke-LeanCtx -Arguments @("harden", "--undo") -AllowFailure -Timeout 90)

  # Official repair first, then explicit Hybrid setup for every detected agent.
  [void](Invoke-LeanCtx -Arguments @("doctor", "--fix") -AllowFailure -Timeout 300)
  Initialize-DetectedAgents

  # Tool schemas are selected independently from integration mode.
  [void](Invoke-LeanCtx -Arguments @("tools", "lean"))

  $validation = Invoke-LeanCtx -Arguments @("config", "validate")
  if ($validation.text -notmatch '(?m)\[OK\]\s+All\s+\d+\s+keys\s+validated\s+successfully') {
    throw "LeanCTX configuration validation did not report success."
  }

  $tools = Invoke-LeanCtx -Arguments @("tools", "show")
  if ($tools.text -notmatch '(?im)Tool Profile:\s*lean\b') {
    throw "LeanCTX effective tool profile is not lean."
  }

  $doctor = Invoke-LeanCtx -Arguments @("doctor") -AllowFailure
  if ($doctor.text -match '(?im)Shadow mode\s+active') {
    # The wording "native tools denied" is harden/Replace state, not desired Hybrid mode.
    [void](Invoke-LeanCtx -Arguments @("harden", "--undo") -AllowFailure -Timeout 90)
    [void](Invoke-LeanCtx -Arguments @("config", "set", "shadow_mode", "false"))
    [void](Invoke-LeanCtx -Arguments @("trust"))
    Initialize-DetectedAgents
    $doctor = Invoke-LeanCtx -Arguments @("doctor") -AllowFailure
  }

  if ($doctor.exit_code -ne 0) {
    throw "LeanCTX doctor still reports a failure."
  }

  if ($doctor.text -match '(?im)Shadow mode\s+active') {
    throw "LeanCTX remains in Replace/harden mode instead of Hybrid mode."
  }

  $integrations = Invoke-LeanCtx -Arguments @("doctor", "integrations") -AllowFailure

  if ($integrations.text -match '(?im)Claude Code[\s\S]*?Hook wrappers\s+stale binary') {
    Reset-ClaudeLeanCtxWrappers
    [void](Invoke-LeanCtx -Arguments @("init", "--agent", "claude", "--mode", "hybrid") -Timeout 240)
    $integrations = Invoke-LeanCtx -Arguments @("doctor", "integrations") -AllowFailure
  }

  if ($integrations.text -match '(?im)Gemini CLI[\s\S]*?Gemini hooks\s+drift') {
    [void](Invoke-LeanCtx -Arguments @("init", "--agent", "gemini", "--mode", "hybrid") -Timeout 240)
    $integrations = Invoke-LeanCtx -Arguments @("doctor", "integrations") -AllowFailure
  }

  if ($integrations.exit_code -ne 0 -or
      $integrations.text -match '(?im)stale binary|hooks?\s+drift|hook wrappers\s+.*(?:stale|failed)') {
    throw "LeanCTX integration health still reports repairable drift."
  }

  [void](Invoke-LeanCtx -Arguments @("tools", "health") -Timeout 180)

  Write-Host "`nleanctx_tool_profile=lean" -ForegroundColor Green
  Write-Host "leanctx_agent_mode=hybrid" -ForegroundColor Green
  Write-Host "leanctx_shadow_mode=false" -ForegroundColor Green
  Write-Host "backup_directory=$backupRoot"
  Write-Host "decision=PASS" -ForegroundColor Green
}
finally {
  Pop-Location
}
