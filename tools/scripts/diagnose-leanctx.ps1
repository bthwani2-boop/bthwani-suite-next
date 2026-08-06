[CmdletBinding()]
param(
  [string]$RepositoryRoot,
  [string]$OutputDirectory = ".artifacts/diagnostics/leanctx",
  [ValidateRange(5, 300)][int]$TimeoutSeconds = 90,
  [switch]$NoUserConfig,
  [switch]$Strict
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Findings = [System.Collections.Generic.List[object]]::new()
$Probes = [System.Collections.Generic.List[object]]::new()
$Integrations = [System.Collections.Generic.List[object]]::new()
$root = if ($RepositoryRoot) { (Resolve-Path $RepositoryRoot).Path } else { (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path }
$outputPath = if ([IO.Path]::IsPathRooted($OutputDirectory)) { $OutputDirectory } else { Join-Path $root $OutputDirectory }

function Add-Finding {
  param(
    [string]$Id,
    [ValidateSet("INFO", "NEEDS_EVIDENCE", "FIX_REQUIRED", "BLOCKED_EXTERNAL")][string]$Severity,
    [string]$Summary,
    [string[]]$Evidence = @(),
    [string]$Recommendation = ""
  )
  $Findings.Add([pscustomobject]@{
    id = $Id; severity = $Severity; summary = $Summary
    evidence = @($Evidence); recommendation = $Recommendation
  })
}

function Get-PropertyValue {
  param([AllowNull()]$Object, [string]$Name)
  if ($null -eq $Object) { return $null }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) { return $null }
  return $property.Value
}

function Protect-Text {
  param([AllowNull()][string]$Text, [int]$Limit = 20000)
  if ($null -eq $Text) { return "" }
  $value = $Text `
    -replace '(?i)(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,"'']+', '$1=[REDACTED]' `
    -replace 'github_pat_[A-Za-z0-9_]+', '[REDACTED]' `
    -replace 'sk-[A-Za-z0-9_-]{12,}', '[REDACTED]'
  if ($value.Length -gt $Limit) { return $value.Substring(0, $Limit) + "`n...[truncated]" }
  return $value
}

function Invoke-Probe {
  param([string]$Name, [string]$Command, [string[]]$Arguments = @(), [int]$Timeout = $TimeoutSeconds)
  $resolved = Get-Command $Command -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $resolved) {
    $probe = [pscustomobject]@{
      name=$Name; command=$Command; args=@($Arguments); received_args=@()
      installed=$false; exit_code=$null; timed_out=$false; duration_ms=0
      output=""; error="$Command was not found on PATH."
    }
    $Probes.Add($probe); return $probe
  }

  $serialized = ConvertTo-Json -Compress -InputObject @($Arguments)
  $started = Get-Date
  $job = Start-Job -ScriptBlock {
    param($Executable, $SerializedArguments, $WorkingDirectory)
    Set-Location -LiteralPath $WorkingDirectory
    $ProbeArguments = @()
    if ($SerializedArguments) {
      $decoded = ConvertFrom-Json $SerializedArguments
      $ProbeArguments = if ($decoded -is [System.Array]) { @($decoded | ForEach-Object { [string]$_ }) } else { @([string]$decoded) }
    }
    try {
      $output = (& $Executable @ProbeArguments 2>&1 | Out-String)
      $code = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
      [pscustomobject]@{ output=$output; exit_code=$code; error=""; received_args=@($ProbeArguments) }
    } catch {
      [pscustomobject]@{ output=""; exit_code=1; error=$_.Exception.Message; received_args=@($ProbeArguments) }
    }
  } -ArgumentList @($resolved.Source, $serialized, $root)

  if (-not (Wait-Job $job -Timeout $Timeout)) {
    Stop-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -Force -ErrorAction SilentlyContinue
    $probe = [pscustomobject]@{
      name=$Name; command=$resolved.Source; args=@($Arguments); received_args=@()
      installed=$true; exit_code=$null; timed_out=$true
      duration_ms=[int]((Get-Date)-$started).TotalMilliseconds
      output=""; error="Timed out after $Timeout seconds."
    }
    $Probes.Add($probe); return $probe
  }

  $result = Receive-Job $job
  Remove-Job $job -Force -ErrorAction SilentlyContinue
  $probe = [pscustomobject]@{
    name=$Name; command=$resolved.Source; args=@($Arguments); received_args=@($result.received_args)
    installed=$true; exit_code=[int]$result.exit_code; timed_out=$false
    duration_ms=[int]((Get-Date)-$started).TotalMilliseconds
    output=(Protect-Text $result.output); error=(Protect-Text $result.error)
  }
  $Probes.Add($probe)
  return $probe
}

function Read-Json {
  param([string]$Path, [switch]$RepositoryRelative)
  $resolvedPath = if ($RepositoryRelative) { Join-Path $root $Path } else { $Path }
  if (-not (Test-Path -LiteralPath $resolvedPath -PathType Leaf)) { return $null }
  try { return Get-Content -LiteralPath $resolvedPath -Raw | ConvertFrom-Json -Depth 100 }
  catch {
    Add-Finding "INVALID_JSON:$Path" FIX_REQUIRED "$Path is invalid JSON." @($_.Exception.Message) "Repair the JSON."
    return $null
  }
}

function Get-LeanServer {
  param([AllowNull()]$Json)
  foreach ($containerName in @("mcpServers", "servers")) {
    $container = Get-PropertyValue $Json $containerName
    if ($null -eq $container) { continue }
    foreach ($serverName in @("lean-ctx", "lean_ctx")) {
      $server = Get-PropertyValue $container $serverName
      if ($null -ne $server) { return $server }
    }
  }
  return $null
}

function Inspect-JsonIntegration {
  param([string]$Path, [string]$Owner, [ValidateSet("repository", "user")][string]$Scope)
  $json = Read-Json $Path -RepositoryRelative:($Scope -eq "repository")
  $exists = if ($Scope -eq "repository") { Test-Path -LiteralPath (Join-Path $root $Path) } else { Test-Path -LiteralPath $Path }
  $server = Get-LeanServer $json
  $trust = Get-PropertyValue $server "trust"
  $Integrations.Add([pscustomobject]@{
    owner=$Owner; path=$Path; scope=$Scope; exists=$exists
    leanctx_present=($null -ne $server); trust=$trust
    command=(Get-PropertyValue $server "command")
  })
  if ($trust -eq $true) {
    Add-Finding "UNSAFE_TRUST:$Path" FIX_REQUIRED "$Owner enables LeanCTX with trust=true." @($Path) "Remove blanket trust."
  }
}

function Inspect-TomlIntegration {
  param([string]$Path, [string]$Owner, [ValidateSet("repository", "user")][string]$Scope)
  $exists = Test-Path -LiteralPath $Path -PathType Leaf
  $present = $false
  if ($exists) {
    $present = (Get-Content -LiteralPath $Path -Raw) -match '(?im)^\s*\[mcp_servers\.(?:"?lean[-_]?ctx"?)\]\s*$'
  }
  $Integrations.Add([pscustomobject]@{
    owner=$Owner; path=$Path; scope=$Scope; exists=$exists; leanctx_present=$present
  })
}

if (-not (Test-Path -LiteralPath (Join-Path $root ".git"))) { throw "Not a Git repository: $root" }

Push-Location $root
try {
  $branch = (git branch --show-current).Trim()
  $sha = (git rev-parse HEAD).Trim()
  $gitStatus = (git status --porcelain=v1 | Out-String).Trim()
  $dirty = [bool]$gitStatus
  if ($dirty) {
    Add-Finding WORKTREE_DIRTY NEEDS_EVIDENCE "The worktree contains uncommitted changes." @($gitStatus) "Account for or preserve them before same-SHA closure."
  }

  $requiredFiles = @(
    ".lean-ctx.toml",
    ".agents/tools/leanctx.md",
    "LEAN-CTX.md",
    "docs/AI/LEANCTX_USAGE.md",
    "governance/tools/agent-tool-registry.json",
    "tools/scripts/invoke-leanctx-toolchain.ps1",
    "tools/scripts/repair-leanctx-local.ps1"
  )
  foreach ($file in $requiredFiles) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
      Add-Finding "MISSING:$file" FIX_REQUIRED "Required LeanCTX file is missing." @($file) "Restore or intentionally retire it."
    }
  }

  $config = if (Test-Path ".lean-ctx.toml") { Get-Content ".lean-ctx.toml" -Raw } else { "" }
  foreach ($marker in @(
    'shell_activation\s*=\s*"agents-only"',
    'cache_policy\s*=\s*"safe"',
    'tool_profile\s*=\s*"lean"',
    'shadow_mode\s*=\s*false',
    'auto_capture\s*=\s*false',
    'journal_enabled\s*=\s*false',
    'enable_wakeup_ctx\s*=\s*false',
    'contribute_enabled\s*=\s*false'
  )) {
    if ($config -notmatch $marker) {
      Add-Finding "CONFIG_MARKER:$marker" FIX_REQUIRED "Required project policy marker is missing." @($marker) "Restore the validated safe value."
    }
  }
  if ($config -match '(?m)^\s*tool_profile\s*=\s*"power"\s*$') {
    Add-Finding TOOL_PROFILE_POWER FIX_REQUIRED "The full power tool surface is enabled." @('tool_profile="power"') "Use the lean lazy core."
  }
  if ($config -match '(?m)^\s*shadow_mode\s*=\s*true\s*$') {
    Add-Finding SHADOW_MODE_ACTIVE FIX_REQUIRED "Native tools are forcibly intercepted." @('shadow_mode=true') "Keep shadow_mode=false."
  }

  $registry = Read-Json "governance/tools/agent-tool-registry.json" -RepositoryRelative
  if ($registry) {
    $entries = @($registry.entries | Where-Object id -eq "leanctx")
    if ($entries.Count -ne 1 -or $entries[0].status -ne "conditional" -or @($entries[0].authority).Count -gt 0) {
      Add-Finding REGISTRY_POLICY FIX_REQUIRED "LeanCTX registry entry is not uniquely conditional and non-authoritative." @("count=$($entries.Count)") "Keep one conditional entry with empty authority."
    }
  }

  Inspect-JsonIntegration ".github/mcp.json" "GitHub MCP discovery" repository
  Inspect-JsonIntegration ".vscode/mcp.json" "VS Code MCP" repository
  Inspect-JsonIntegration ".claude/settings.json" "Claude Code settings" repository
  Inspect-JsonIntegration ".gemini/settings.json" "Gemini CLI" repository
  if (-not $NoUserConfig) {
    Inspect-JsonIntegration (Join-Path $HOME ".claude.json") "Claude Code" user
    Inspect-JsonIntegration (Join-Path $HOME ".gemini/settings.json") "Gemini CLI" user
    Inspect-JsonIntegration (Join-Path $HOME ".gemini/antigravity/mcp_config.json") "Antigravity IDE" user
    Inspect-JsonIntegration (Join-Path $HOME ".gemini/antigravity-cli/mcp_config.json") "Antigravity CLI" user
    Inspect-TomlIntegration (Join-Path $HOME ".codex/config.toml") "Codex" user
  }

  $version = Invoke-Probe "LeanCTX version" "lean-ctx" @("--version")
  if (-not $version.installed) {
    Add-Finding LEANCTX_NOT_INSTALLED BLOCKED_EXTERNAL "lean-ctx is unavailable on PATH." @() "Install or repair it in the agent environment."
  } else {
    $validate = Invoke-Probe "LeanCTX config validate" "lean-ctx" @("config", "validate")
    if ($validate.exit_code -ne 0 -or $validate.output -notmatch '(?m)\[OK\]\s+All\s+\d+\s+keys\s+validated\s+successfully') {
      Add-Finding LEANCTX_CONFIG_INVALID FIX_REQUIRED "LeanCTX did not validate the effective configuration." @($validate.output, $validate.error) "Correct only rejected keys."
    }

    $tools = Invoke-Probe "LeanCTX tools show" "lean-ctx" @("tools", "show")
    if ($tools.exit_code -ne 0 -or $tools.output -notmatch '(?im)Tool Profile:\s*lean\b') {
      Add-Finding LEANCTX_PROFILE_NOT_LEAN FIX_REQUIRED "The effective tool profile is not lean." @($tools.output, $tools.error) "Use the lean lazy core."
    }

    [void](Invoke-Probe "LeanCTX tools health" "lean-ctx" @("tools", "health", "--json"))
    $doctor = Invoke-Probe "LeanCTX doctor" "lean-ctx" @("doctor")
    if ($doctor.exit_code -ne 0) {
      Add-Finding LEANCTX_DOCTOR_FAILED FIX_REQUIRED "LeanCTX doctor failed." @($doctor.output, $doctor.error) "Repair LeanCTX."
    }
    if ($doctor.output -match '(?im)Shadow mode\s+active') {
      Add-Finding LEANCTX_SHADOW_EFFECTIVE FIX_REQUIRED "Shadow mode remains active effectively." @($doctor.output) "Set project shadow_mode=false and restart agents."
    }

    $integrationProbe = Invoke-Probe "LeanCTX doctor integrations" "lean-ctx" @("doctor", "integrations")
    if ($integrationProbe.exit_code -ne 0 -or $integrationProbe.output -match '(?im)stale binary|hook wrappers\s+.*(?:stale|failed)') {
      Add-Finding LEANCTX_INTEGRATIONS_NEED_REPAIR FIX_REQUIRED "Integration health reports a repairable failure." @($integrationProbe.output, $integrationProbe.error) "Run repair-leanctx-local.ps1 -Apply."
    }
    [void](Invoke-Probe "LeanCTX status json" "lean-ctx" @("status", "--json"))
  }

  $scan = Invoke-Probe "Repository LeanCTX reference scan" "git" @("grep","-n","-I","-E","lean-ctx|LeanCTX|ctx_[A-Za-z0-9_]+","--",".")
  if ($scan.exit_code -notin @(0,1)) {
    Add-Finding REFERENCE_SCAN_FAILED NEEDS_EVIDENCE "Repository reference scan failed." @($scan.output, $scan.error) "Run git grep manually."
  }

  $decision = if ($Findings.severity -contains "BLOCKED_EXTERNAL") { "BLOCKED_EXTERNAL" }
    elseif ($Findings.severity -contains "FIX_REQUIRED") { "FIX_REQUIRED" }
    elseif ($Findings.severity -contains "NEEDS_EVIDENCE") { "NEEDS_EVIDENCE" }
    else { "PASS" }

  New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
  $report = [ordered]@{
    schema_version=2; generated_at=(Get-Date).ToUniversalTime().ToString("o")
    repository_root=$root; branch=$branch; sha=$sha; dirty=$dirty; decision=$decision
    findings=@($Findings); integrations=@($Integrations); probes=@($Probes)
  }
  $jsonPath = Join-Path $outputPath "leanctx-diagnostic-latest.json"
  $markdownPath = Join-Path $outputPath "leanctx-diagnostic-latest.md"
  $report | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $jsonPath -Encoding utf8NoBOM

  $md = [System.Collections.Generic.List[string]]::new()
  @(
    "# LeanCTX Deep Diagnostic","",
    "- Generated: $($report.generated_at)",
    "- Branch: $branch","- SHA: $sha","- Dirty: $dirty","- Decision: **$decision**","",
    "## Findings",""
  ) | ForEach-Object { $md.Add($_) }
  if ($Findings.Count -eq 0) { $md.Add("No findings.") }
  foreach ($finding in $Findings) {
    $md.Add("### [$($finding.severity)] $($finding.id)"); $md.Add(""); $md.Add($finding.summary); $md.Add("")
    if (@($finding.evidence).Count) {
      $md.Add("Evidence:")
      foreach ($evidence in @($finding.evidence)) {
        if ($evidence) { $md.Add("- " + (([string]$evidence) -replace "`r?`n"," ")) }
      }
      $md.Add("")
    }
    if ($finding.recommendation) { $md.Add("Recommendation: $($finding.recommendation)"); $md.Add("") }
  }
  $md.Add("## Boundaries"); $md.Add("")
  $md.Add("- The script is read-only except for reports under .artifacts.")
  $md.Add("- MCP configuration does not prove active-session exposure.")
  $md.Add("- Compressed context is navigation, not final evidence.")
  $md.Add("- A dirty worktree prevents same-SHA closure claims.")
  $md | Set-Content -LiteralPath $markdownPath -Encoding utf8NoBOM

  Write-Output "leanctx_diagnostic_decision=$decision"
  Write-Output "leanctx_diagnostic_json=$jsonPath"
  Write-Output "leanctx_diagnostic_markdown=$markdownPath"
  if ($Strict -and $decision -ne "PASS") { exit 1 }
} finally {
  Pop-Location
}
