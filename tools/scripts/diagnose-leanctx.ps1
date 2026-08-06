[CmdletBinding()]
param(
  [string]$RepositoryRoot,
  [string]$OutputDirectory = ".artifacts/diagnostics/leanctx",
  [ValidateRange(30, 600)]
  [int]$TimeoutSeconds = 180,
  [switch]$Strict
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$Findings = [System.Collections.Generic.List[object]]::new()
$Probes = [System.Collections.Generic.List[object]]::new()
$root = if ($RepositoryRoot) {
  (Resolve-Path $RepositoryRoot).Path
}
else {
  (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
}
$outputPath = if ([IO.Path]::IsPathRooted($OutputDirectory)) {
  $OutputDirectory
}
else {
  Join-Path $root $OutputDirectory
}

function Add-Finding {
  param(
    [string]$Id,
    [ValidateSet("INFO", "NEEDS_EVIDENCE", "FIX_REQUIRED", "BLOCKED_EXTERNAL")]
    [string]$Severity,
    [string]$Summary,
    [string[]]$Evidence = @(),
    [string]$Recommendation = ""
  )

  $Findings.Add([pscustomobject]@{
    id = $Id
    severity = $Severity
    summary = $Summary
    evidence = @($Evidence)
    recommendation = $Recommendation
  })
}

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

  return $null
}

function Invoke-Probe {
  param(
    [Parameter(Mandatory)]
    [string]$Name,

    [Parameter(Mandatory)]
    [string[]]$Arguments
  )

  if (-not $script:LeanCtx) {
    $probe = [pscustomobject]@{
      name = $Name
      args = @($Arguments)
      exit_code = $null
      timed_out = $false
      output = ""
      error = "lean-ctx executable was not found."
    }
    $Probes.Add($probe)
    return $probe
  }

  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $script:LeanCtx
  $startInfo.WorkingDirectory = $root
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.CreateNoWindow = $true

  $escapedArgs = $Arguments | ForEach-Object {
    if ($_ -match '\s|^$') { '"{0}"' -f ($_ -replace '"', '\"') } else { $_ }
  }
  $startInfo.Arguments = $escapedArgs -join ' '

  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $startInfo
  $started = Get-Date

  if (-not $process.Start()) {
    throw "Failed to start LeanCTX probe: $Name"
  }

  $stdoutTask = $process.StandardOutput.ReadToEndAsync()
  $stderrTask = $process.StandardError.ReadToEndAsync()

  if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
    try {
      $process.Kill($true)
    }
    catch {
      Write-Warning "Could not terminate timed-out LeanCTX probe."
    }

    $probe = [pscustomobject]@{
      name = $Name
      args = @($Arguments)
      exit_code = $null
      timed_out = $true
      duration_ms = [int]((Get-Date) - $started).TotalMilliseconds
      output = ""
      error = "Timed out after ${TimeoutSeconds}s."
    }
    $Probes.Add($probe)
    return $probe
  }

  $stdout = $stdoutTask.GetAwaiter().GetResult()
  $stderr = $stderrTask.GetAwaiter().GetResult()
  $text = (($stdout, $stderr) -join "`n").Trim()

  $probe = [pscustomobject]@{
    name = $Name
    args = @($Arguments)
    exit_code = [int]$process.ExitCode
    timed_out = $false
    duration_ms = [int]((Get-Date) - $started).TotalMilliseconds
    output = $text
    error = ""
  }
  $Probes.Add($probe)
  return $probe
}

function Test-RepositoryPolicy {
  $configPath = Join-Path $root ".lean-ctx.toml"
  if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) {
    Add-Finding "MISSING_PROJECT_CONFIG" FIX_REQUIRED "The project LeanCTX config is missing." @($configPath) "Restore .lean-ctx.toml."
    return
  }

  $config = Get-Content -LiteralPath $configPath -Raw

  foreach ($marker in @(
    'shell_activation\s*=\s*"agents-only"',
    'cache_policy\s*=\s*"safe"',
    'shadow_mode\s*=\s*false',
    'auto_capture\s*=\s*false',
    'journal_enabled\s*=\s*false',
    'enable_wakeup_ctx\s*=\s*false',
    'contribute_enabled\s*=\s*false'
  )) {
    if ($config -notmatch $marker) {
      Add-Finding "CONFIG_MARKER:$marker" FIX_REQUIRED "A required safe LeanCTX project marker is missing." @($marker) "Restore the validated project value."
    }
  }

  if ($config -match '(?m)^\s*tool_profile\s*=') {
    Add-Finding "PROJECT_PROFILE_PIN" FIX_REQUIRED "The project config persists tool_profile even though LeanCTX 3.9 selects the lazy core through the CLI profile command." @() "Remove tool_profile and use lean-ctx tools lean."
  }

  if ($config -match '(?m)^\s*shadow_mode\s*=\s*true\s*$') {
    Add-Finding "PROJECT_SHADOW_MODE" FIX_REQUIRED "The project enables forced native-tool interception." @() "Keep shadow_mode=false."
  }

  $geminiPath = Join-Path $root ".gemini/settings.json"
  if (Test-Path -LiteralPath $geminiPath -PathType Leaf) {
    $geminiText = Get-Content -LiteralPath $geminiPath -Raw
    if ($geminiText -match '(?im)"trust"\s*:\s*true') {
      Add-Finding "REPOSITORY_GEMINI_TRUST" FIX_REQUIRED "Repository-level Gemini settings bypass MCP confirmations." @($geminiPath) "Remove trust=true from the repository adapter."
    }
  }
}

if (-not (Test-Path -LiteralPath (Join-Path $root ".git"))) {
  throw "Not a Git repository: $root"
}

Push-Location $root
try {
  $branch = (git branch --show-current).Trim()
  $sha = (git rev-parse HEAD).Trim()
  $gitStatus = (git status --porcelain=v1 | Out-String).Trim()
  $dirty = [bool]$gitStatus

  if ($dirty) {
    Add-Finding "WORKTREE_DIRTY" NEEDS_EVIDENCE "The worktree contains uncommitted changes." @($gitStatus) "Preserve or account for them before same-SHA closure."
  }

  Test-RepositoryPolicy

  $script:LeanCtx = Resolve-LeanCtxExecutable
  if (-not $script:LeanCtx) {
    Add-Finding "LEANCTX_NOT_INSTALLED" BLOCKED_EXTERNAL "lean-ctx is unavailable in the current environment." @() "Install or repair the official binary, then rerun."
  }
  else {
    $version = Invoke-Probe "LeanCTX version" @("--version")
    if ($version.exit_code -ne 0) {
      Add-Finding "LEANCTX_VERSION_FAILED" FIX_REQUIRED "LeanCTX version detection failed." @($version.output) "Repair the binary installation."
    }

    $validate = Invoke-Probe "LeanCTX config validate" @("config", "validate")
    if ($validate.exit_code -ne 0 -or $validate.output -notmatch '(?m)\[OK\]\s+All\s+\d+\s+keys\s+validated\s+successfully') {
      Add-Finding "LEANCTX_CONFIG_INVALID" FIX_REQUIRED "LeanCTX did not validate the effective configuration." @($validate.output) "Correct only the rejected settings."
    }

    $tools = Invoke-Probe "LeanCTX tools show" @("tools", "show")
    if ($tools.exit_code -ne 0 -or $tools.output -notmatch '(?im)Tool Profile:\s*lean\b') {
      Add-Finding "LEANCTX_PROFILE_NOT_LEAN" FIX_REQUIRED "The effective MCP tool profile is not the 12-tool lazy core." @($tools.output) "Run repair-leanctx-local.ps1."
    }

    $doctor = Invoke-Probe "LeanCTX doctor" @("doctor")
    if ($doctor.exit_code -ne 0) {
      Add-Finding "LEANCTX_DOCTOR_FAILED" FIX_REQUIRED "LeanCTX doctor returned a failure." @($doctor.output) "Run repair-leanctx-local.ps1."
    }
    if ($doctor.output -match '(?im)Shadow mode\s+active') {
      Add-Finding "LEANCTX_REPLACE_MODE_ACTIVE" FIX_REQUIRED "Native tools are still denied by Replace/Harden state." @($doctor.output) "Run lean-ctx harden --undo and regenerate agents in Hybrid mode."
    }

    $integrations = Invoke-Probe "LeanCTX doctor integrations" @("doctor", "integrations")
    if ($integrations.exit_code -ne 0 -or
        $integrations.output -match '(?im)stale binary|hooks?\s+drift|hook wrappers\s+.*(?:stale|failed)') {
      Add-Finding "LEANCTX_INTEGRATION_DRIFT" FIX_REQUIRED "At least one agent integration remains stale or inconsistent." @($integrations.output) "Run repair-leanctx-local.ps1."
    }

    $health = Invoke-Probe "LeanCTX tools health" @("tools", "health", "--json")
    if ($health.exit_code -ne 0) {
      Add-Finding "LEANCTX_TOOLS_HEALTH_FAILED" NEEDS_EVIDENCE "LeanCTX tools health could not be measured." @($health.output) "Run lean-ctx tools health manually."
    }

    [void](Invoke-Probe "LeanCTX status" @("status", "--json"))
  }

  $hasBlocked = $false; $hasFix = $false; $hasNeeds = $false
  foreach ($f in $Findings) {
    if ($f.severity -eq "BLOCKED_EXTERNAL") { $hasBlocked = $true }
    elseif ($f.severity -eq "FIX_REQUIRED") { $hasFix = $true }
    elseif ($f.severity -eq "NEEDS_EVIDENCE") { $hasNeeds = $true }
  }

  $decision = if ($hasBlocked) {
    "BLOCKED_EXTERNAL"
  }
  elseif ($hasFix) {
    "FIX_REQUIRED"
  }
  elseif ($hasNeeds) {
    "NEEDS_EVIDENCE"
  }
  else {
    "PASS"
  }

  New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
  $jsonPath = Join-Path $outputPath "leanctx-diagnostic-latest.json"
  $markdownPath = Join-Path $outputPath "leanctx-diagnostic-latest.md"

  $report = [ordered]@{
    schema_version = 3
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    repository_root = $root
    branch = $branch
    sha = $sha
    dirty = $dirty
    decision = $decision
    findings = @($Findings)
    probes = @($Probes)
  }

  $report | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $jsonPath -Encoding utf8NoBOM

  $markdown = [System.Collections.Generic.List[string]]::new()
  @(
    "# LeanCTX Deep Diagnostic",
    "",
    "- Generated: $($report.generated_at)",
    "- Branch: $branch",
    "- SHA: $sha",
    "- Dirty: $dirty",
    "- Decision: **$decision**",
    "",
    "## Findings",
    ""
  ) | ForEach-Object { $markdown.Add($_) }

  if ($Findings.Count -eq 0) {
    $markdown.Add("No findings.")
  }

  foreach ($finding in $Findings) {
    $markdown.Add("### [$($finding.severity)] $($finding.id)")
    $markdown.Add("")
    $markdown.Add($finding.summary)
    $markdown.Add("")
    if (@($finding.evidence).Count -gt 0) {
      $markdown.Add("Evidence:")
      foreach ($evidence in @($finding.evidence)) {
        if ($evidence) {
          $markdown.Add("- " + (([string]$evidence) -replace "`r?`n", " "))
        }
      }
      $markdown.Add("")
    }
    if ($finding.recommendation) {
      $markdown.Add("Recommendation: $($finding.recommendation)")
      $markdown.Add("")
    }
  }

  $markdown.Add("## Boundaries")
  $markdown.Add("")
  $markdown.Add("- The script is read-only except for reports under .artifacts.")
  $markdown.Add("- The lazy-core profile is verified from effective CLI state, not from a TOML string.")
  $markdown.Add("- Global agent integration health does not replace active-session verification.")
  $markdown.Add("- Compressed context remains navigation, not final correctness evidence.")
  $markdown.Add("- A dirty worktree prevents same-SHA closure claims.")
  $markdown | Set-Content -LiteralPath $markdownPath -Encoding utf8NoBOM

  Write-Output "leanctx_diagnostic_decision=$decision"
  Write-Output "leanctx_diagnostic_json=$jsonPath"
  Write-Output "leanctx_diagnostic_markdown=$markdownPath"

  if ($Strict -and $decision -ne "PASS") {
    exit 1
  }
}
finally {
  Pop-Location
}
