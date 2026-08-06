[CmdletBinding()]
param(
  [string]$RepositoryRoot,
  [string]$OutputDirectory = ".artifacts/diagnostics/leanctx",
  [ValidateRange(5, 300)][int]$TimeoutSeconds = 45,
  [switch]$NoUserConfig,
  [switch]$SkipAgentProbes,
  [switch]$Strict
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$script:Findings = [System.Collections.Generic.List[object]]::new()
$script:Probes = [System.Collections.Generic.List[object]]::new()
$script:Files = [System.Collections.Generic.List[object]]::new()
$script:Integrations = [System.Collections.Generic.List[object]]::new()
$scriptDirectory = Split-Path -Parent $PSCommandPath
$root = if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) {
  (Resolve-Path (Join-Path $scriptDirectory "../..")).Path
} else {
  (Resolve-Path $RepositoryRoot).Path
}
$outputPath = if ([IO.Path]::IsPathRooted($OutputDirectory)) { $OutputDirectory } else { Join-Path $root $OutputDirectory }

function Add-Finding {
  param([string]$Id, [ValidateSet("INFO", "NEEDS_EVIDENCE", "FIX_REQUIRED", "BLOCKED_EXTERNAL")][string]$Severity,
        [string]$Summary, [string[]]$Evidence = @(), [string]$Recommendation = "")
  $script:Findings.Add([pscustomobject]@{ id=$Id; severity=$Severity; summary=$Summary; evidence=$Evidence; recommendation=$Recommendation })
}

function Protect-Text([string]$Text, [int]$MaxLength = 16000) {
  if ($null -eq $Text) { return "" }
  $value = $Text
  $value = $value -replace '(?i)(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,"'']+', '$1=[REDACTED]'
  $value = $value -replace 'github_pat_[A-Za-z0-9_]+', '[REDACTED]'
  $value = $value -replace 'sk-[A-Za-z0-9_-]{12,}', '[REDACTED]'
  if ($value.Length -gt $MaxLength) { return $value.Substring(0, $MaxLength) + "`n...[truncated]" }
  return $value
}

function Invoke-DiagnosticProbe {
  param([string]$Name, [string]$Command, [string[]]$Arguments = @(), [int]$Timeout = $TimeoutSeconds)
  $resolved = Get-Command $Command -ErrorAction SilentlyContinue
  if (-not $resolved) {
    $probe = [pscustomobject]@{ name=$Name; command=$Command; args=$Arguments; installed=$false; exit_code=$null; timed_out=$false; duration_ms=0; output=""; error="$Command was not found on PATH." }
    $script:Probes.Add($probe); return $probe
  }
  $started = Get-Date
  $job = Start-Job -ScriptBlock {
    param($Executable, $Args, $WorkingDirectory)
    Set-Location $WorkingDirectory
    $output = (& $Executable @Args 2>&1 | Out-String)
    [pscustomobject]@{ output=$output; exit_code=$LASTEXITCODE }
  } -ArgumentList $resolved.Source, $Arguments, $root
  $completed = Wait-Job -Job $job -Timeout $Timeout
  if (-not $completed) {
    Stop-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -Force -ErrorAction SilentlyContinue
    $probe = [pscustomobject]@{ name=$Name; command=$resolved.Source; args=$Arguments; installed=$true; exit_code=$null; timed_out=$true; duration_ms=[int]((Get-Date)-$started).TotalMilliseconds; output=""; error="Timed out after $Timeout seconds." }
    $script:Probes.Add($probe); return $probe
  }
  $result = Receive-Job $job
  Remove-Job $job -Force
  $probe = [pscustomobject]@{ name=$Name; command=$resolved.Source; args=$Arguments; installed=$true; exit_code=$result.exit_code; timed_out=$false; duration_ms=[int]((Get-Date)-$started).TotalMilliseconds; output=(Protect-Text $result.output); error="" }
  $script:Probes.Add($probe); return $probe
}

function Read-TrackedFile([string]$RelativePath) {
  $absolute = Join-Path $root $RelativePath
  if (-not (Test-Path -LiteralPath $absolute -PathType Leaf)) {
    $script:Files.Add([pscustomobject]@{ path=$RelativePath; exists=$false; bytes=0; sha256=$null; parse_status="MISSING" }); return $null
  }
  $content = Get-Content -LiteralPath $absolute -Raw
  $hash = (Get-FileHash -LiteralPath $absolute -Algorithm SHA256).Hash.ToLowerInvariant()
  $script:Files.Add([pscustomobject]@{ path=$RelativePath; exists=$true; bytes=(Get-Item $absolute).Length; sha256=$hash; parse_status="READ" })
  return $content
}

function Read-JsonFile([string]$RelativePath) {
  $content = Read-TrackedFile $RelativePath
  if ($null -eq $content) { return $null }
  try { return ($content | ConvertFrom-Json -Depth 100) }
  catch { Add-Finding "INVALID_JSON:$RelativePath" FIX_REQUIRED "$RelativePath is invalid JSON." @($_.Exception.Message) "Repair this JSON before relying on the integration."; return $null }
}

function Get-LeanServer($Json) {
  if ($null -eq $Json) { return $null }
  if ($Json.PSObject.Properties.Name -contains "mcpServers") { return $Json.mcpServers.'lean-ctx' }
  if ($Json.PSObject.Properties.Name -contains "servers") { return $Json.servers.'lean-ctx' }
  return $null
}

function Inspect-JsonIntegration([string]$Path, [string]$Owner) {
  $json = Read-JsonFile $Path
  $server = Get-LeanServer $json
  $script:Integrations.Add([pscustomobject]@{ owner=$Owner; path=$Path; scope="repository"; exists=($null -ne $json); leanctx_present=($null -ne $server); trust=$(if($server){$server.trust}else{$null}); command=$(if($server){$server.command}else{$null}) })
  if ($server -and $server.trust -eq $true) { Add-Finding "UNSAFE_TRUST:$Path" FIX_REQUIRED "$Owner enables LeanCTX with trust=true." @($Path) "Remove blanket trust so shell or write-capable tools still require confirmation." }
}

function Inspect-UserJson([string]$Path, [string]$Owner) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { $script:Integrations.Add([pscustomobject]@{owner=$Owner;path=$Path;scope="user";exists=$false;leanctx_present=$false}); return }
  try { $json = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -Depth 100; $server = Get-LeanServer $json; $script:Integrations.Add([pscustomobject]@{owner=$Owner;path=$Path;scope="user";exists=$true;leanctx_present=($null-ne$server);trust=$(if($server){$server.trust}else{$null});command=$(if($server){$server.command}else{$null})}) }
  catch { $script:Integrations.Add([pscustomobject]@{owner=$Owner;path=$Path;scope="user";exists=$true;leanctx_present=$false;parse_error=$_.Exception.Message}) }
}

function Inspect-TomlIntegration([string]$Path, [string]$Owner, [string]$Scope) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { $script:Integrations.Add([pscustomobject]@{owner=$Owner;path=$Path;scope=$Scope;exists=$false;leanctx_present=$false}); return }
  $content = Get-Content -LiteralPath $Path -Raw
  $present = $content -match '(?im)^\s*\[mcp_servers\.(?:"?lean[-_]?ctx"?)\]\s*$'
  $script:Integrations.Add([pscustomobject]@{owner=$Owner;path=$Path;scope=$Scope;exists=$true;leanctx_present=$present})
}

if (-not (Test-Path (Join-Path $root ".git"))) { throw "Not a Git repository: $root" }
Push-Location $root
try {
  $gitBranch = (git branch --show-current).Trim()
  $gitSha = (git rev-parse HEAD).Trim()
  $gitStatus = (git status --porcelain=v1 | Out-String).Trim()

  $required = @('.lean-ctx.toml','.agents/tools/leanctx.md','LEAN-CTX.md','docs/AI/LEANCTX_USAGE.md','governance/tools/agent-tool-registry.json','tools/scripts/invoke-leanctx-toolchain.ps1')
  $contentByPath = @{}
  foreach ($file in $required) { $contentByPath[$file] = Read-TrackedFile $file; if ($null -eq $contentByPath[$file]) { Add-Finding "MISSING:$file" FIX_REQUIRED "Required LeanCTX file is missing: $file" @() "Restore it or intentionally retire it through the canonical registry." } }

  $config = $contentByPath['.lean-ctx.toml']
  if ($config) {
    $requiredMarkers = @('shell_activation\s*=\s*"agents-only"','cache_policy\s*=\s*"safe"','auto_capture\s*=\s*false','journal_enabled\s*=\s*false','enable_wakeup_ctx\s*=\s*false','contribute_enabled\s*=\s*false')
    foreach ($marker in $requiredMarkers) { if ($config -notmatch $marker) { Add-Finding "CONFIG_MARKER:$marker" FIX_REQUIRED "Required safe LeanCTX marker is missing." @($marker) "Confirm the installed schema, then restore the safe project-local value." } }
    if ($config -match 'tool_profile\s*=\s*"power"') { Add-Finding TOOL_PROFILE_POWER NEEDS_EVIDENCE 'LeanCTX exposes the full power tool surface.' @('tool_profile="power"') 'Measure tools health and prefer standard or a proven smaller supported surface when possible.' }
  }

  $registry = Read-JsonFile 'governance/tools/agent-tool-registry.json'
  if ($registry) { $entry = @($registry.entries | Where-Object id -eq 'leanctx'); if ($entry.Count -ne 1) { Add-Finding REGISTRY_ENTRY FIX_REQUIRED 'LeanCTX must have exactly one registry entry.' @("count=$($entry.Count)") 'Keep one conditional, non-authoritative entry.' } elseif ($entry[0].status -ne 'conditional' -or @($entry[0].authority).Count -gt 0) { Add-Finding REGISTRY_POLICY FIX_REQUIRED 'LeanCTX registry authority/status is invalid.' @("status=$($entry[0].status)") 'Keep status conditional and authority empty.' } }
  if ($contentByPath['tools/scripts/invoke-leanctx-toolchain.ps1'] -match 'tool_profile\s*=\s*["'']power["'']') { Add-Finding VERIFY_HARDCODES_POWER NEEDS_EVIDENCE 'The existing verifier hard-codes the power profile.' @() 'Replace literal enforcement only after validating the installed schema and desired tool surface.' }

  Inspect-JsonIntegration '.github/mcp.json' 'GitHub MCP discovery'
  Inspect-JsonIntegration '.vscode/mcp.json' 'VS Code MCP'
  Inspect-JsonIntegration '.claude/settings.json' 'Claude Code settings'
  Inspect-JsonIntegration '.gemini/settings.json' 'Gemini CLI'
  if (Test-Path '.mcp.json') { Inspect-JsonIntegration '.mcp.json' 'Claude Code project MCP' } else { $script:Integrations.Add([pscustomobject]@{owner='Claude Code project MCP';path='.mcp.json';scope='repository';exists=$false;leanctx_present=$false}) }
  Inspect-TomlIntegration (Join-Path $root '.codex/config.toml') 'Codex' 'repository'

  if (-not $NoUserConfig) {
    Inspect-UserJson (Join-Path $HOME '.claude.json') 'Claude Code'
    Inspect-UserJson (Join-Path $HOME '.claude/settings.json') 'Claude Code'
    Inspect-UserJson (Join-Path $HOME '.gemini/settings.json') 'Gemini CLI'
    Inspect-TomlIntegration (Join-Path $HOME '.codex/config.toml') 'Codex' 'user'
    Inspect-TomlIntegration (Join-Path $HOME '.config/lean-ctx/config.toml') 'LeanCTX' 'user'
  }

  $leanVersion = Invoke-DiagnosticProbe 'LeanCTX version' 'lean-ctx' @('--version')
  if (-not $leanVersion.installed) { Add-Finding LEANCTX_NOT_INSTALLED BLOCKED_EXTERNAL 'lean-ctx is unavailable on PATH.' @() 'Install or repair it in the same environment used by the agents, then rerun.' }
  else {
    foreach ($probe in @(
      @('config path',@('config','path')),@('config validate',@('config','validate')),@('config show',@('config','show')),
      @('tools show',@('tools','show')),@('tools health',@('tools','health')),@('status json',@('status','--json')),
      @('doctor',@('doctor')),@('doctor integrations',@('doctor','integrations')),@('trust status',@('trust','status'))
    )) { $result = Invoke-DiagnosticProbe "lean-ctx $($probe[0])" 'lean-ctx' $probe[1] 90; if ($probe[0] -eq 'config validate' -and $result.exit_code -ne 0) { Add-Finding LEANCTX_CONFIG_INVALID FIX_REQUIRED 'LeanCTX rejected the effective configuration.' @($result.output) 'Correct only keys rejected by the installed schema.' } }
  }

  if (-not $SkipAgentProbes) {
    foreach ($agent in @(
      @{name='Claude Code';cmd='claude';list=@('mcp','list');get=@('mcp','get','lean-ctx')},
      @{name='Codex';cmd='codex';list=@('mcp','list','--json');get=@('mcp','get','lean-ctx')},
      @{name='Gemini CLI';cmd='gemini';list=@('mcp','list');get=$null}
    )) {
      $version = Invoke-DiagnosticProbe "$($agent.name) version" $agent.cmd @('--version')
      if (-not $version.installed) { Add-Finding (($agent.name -replace '\W','_').ToUpper()+'_NOT_INSTALLED') INFO "$($agent.name) is not installed on PATH." @() 'Treat it as NOT_INSTALLED, not PASS.'; continue }
      $list = Invoke-DiagnosticProbe "$($agent.name) MCP list" $agent.cmd $agent.list 90
      if ($list.exit_code -ne 0 -and $agent.name -eq 'Codex') { $list = Invoke-DiagnosticProbe 'Codex MCP list fallback' 'codex' @('mcp','list') 90 }
      if ($list.exit_code -ne 0) { Add-Finding (($agent.name -replace '\W','_').ToUpper()+'_MCP_LIST_FAILED') NEEDS_EVIDENCE "$($agent.name) MCP listing failed." @($list.output) 'Repair CLI trust/configuration and rerun from the repository root.' }
      elseif ($list.output -notmatch '(?i)lean[-_]?ctx') { Add-Finding (($agent.name -replace '\W','_').ToUpper()+'_LEANCTX_MISSING') FIX_REQUIRED "$($agent.name) does not list LeanCTX." @($list.output) 'Add or repair the project-scoped MCP registration without blanket trust.' }
      elseif ($list.output -match '(?i)lean[-_]?ctx.*(disconnected|failed|disabled|error)') { Add-Finding (($agent.name -replace '\W','_').ToUpper()+'_LEANCTX_NOT_CONNECTED') FIX_REQUIRED "$($agent.name) lists LeanCTX but it is not connected/enabled." @($list.output) 'Repair executable resolution, project trust, or MCP configuration.' }
      if ($agent.get) { [void](Invoke-DiagnosticProbe "$($agent.name) MCP get LeanCTX" $agent.cmd $agent.get 60) }
    }
  }

  [void](Invoke-DiagnosticProbe 'Repository LeanCTX reference scan' 'git' @('grep','-n','-I','-E','lean-ctx|LeanCTX|ctx_[A-Za-z0-9_]+','--','.') 90)

  $decision = if ($script:Findings.severity -contains 'BLOCKED_EXTERNAL') {'BLOCKED_EXTERNAL'} elseif ($script:Findings.severity -contains 'FIX_REQUIRED') {'FIX_REQUIRED'} elseif ($script:Findings.severity -contains 'NEEDS_EVIDENCE') {'NEEDS_EVIDENCE'} else {'PASS'}
  $report = [ordered]@{ schema_version=1; generated_at=(Get-Date).ToUniversalTime().ToString('o'); repository_root=$root; branch=$gitBranch; sha=$gitSha; dirty=[bool]$gitStatus; decision=$decision; findings=$script:Findings; files=$script:Files; integrations=$script:Integrations; probes=$script:Probes }
  New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
  $json = $report | ConvertTo-Json -Depth 100
  $jsonFile = Join-Path $outputPath 'leanctx-diagnostic-latest.json'
  $mdFile = Join-Path $outputPath 'leanctx-diagnostic-latest.md'
  Set-Content -LiteralPath $jsonFile -Value $json -Encoding utf8
  $md = @("# LeanCTX Deep Diagnostic","","- Generated: $($report.generated_at)","- Branch: $gitBranch","- SHA: $gitSha","- Dirty: $([bool]$gitStatus)","- Decision: **$decision**","","## Findings","")
  foreach ($finding in $script:Findings) { $md += "### [$($finding.severity)] $($finding.id)"; $md += ""; $md += $finding.summary; if ($finding.evidence.Count) { $md += ""; $md += 'Evidence:'; foreach ($e in $finding.evidence) { $md += ('- '+(($e -replace '\r?\n',' ') | Select-Object -First 1)) } }; if ($finding.recommendation) { $md += ""; $md += ('Recommendation: '+$finding.recommendation) }; $md += "" }
  $md += @("## Boundaries","","- The script is read-only except for reports under .artifacts.","- Configured MCP entries do not prove active-session tool exposure.","- LeanCTX compressed output is navigation, not final correctness evidence.")
  Set-Content -LiteralPath $mdFile -Value ($md -join "`n") -Encoding utf8
  Write-Host "leanctx_diagnostic_decision=$decision"
  Write-Host "leanctx_diagnostic_json=$jsonFile"
  Write-Host "leanctx_diagnostic_markdown=$mdFile"
  if ($Strict) { if ($decision -eq 'BLOCKED_EXTERNAL') { exit 3 }; if ($decision -eq 'FIX_REQUIRED') { exit 2 }; if ($decision -eq 'NEEDS_EVIDENCE') { exit 1 } }
}
finally { Pop-Location }
