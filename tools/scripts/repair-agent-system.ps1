[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [ValidateSet("Plan", "Apply", "Verify")]
  [string]$Mode = "Plan",

  [string]$Branch = "abbas",

  [int]$RulesetId = 18292744,

  [switch]$CommitAndPush,

  [switch]$ApplyLiveRuleset,

  [switch]$WaitForCi,

  [switch]$RunFullVerification,

  [ValidateRange(5, 180)]
  [int]$CiTimeoutMinutes = 45
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$Repository = "bthwani2-boop/bthwani-suite-next"
$ExpectedRemote = "https://github.com/bthwani2-boop/bthwani-suite-next.git"
$RequiredCheck = "BThwani CI result"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$Changes = [System.Collections.Generic.List[string]]::new()
$Notes = [System.Collections.Generic.List[string]]::new()
$InitialHead = ""
$InitialRemoteHead = ""

function Invoke-External {
  param(
    [Parameter(Mandatory)] [string]$FilePath,
    [string[]]$Arguments = @(),
    [switch]$Capture,
    [switch]$AllowFailure
  )

  if ($Capture) {
    $output = & $FilePath @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    $text = ($output | Out-String).Trim()
    if (-not $AllowFailure -and $exitCode -ne 0) {
      throw "Command failed ($exitCode): $FilePath $($Arguments -join ' ')`n$text"
    }
    return [pscustomobject]@{ ExitCode = $exitCode; Output = $text }
  }

  & $FilePath @Arguments
  $exitCode = $LASTEXITCODE
  if (-not $AllowFailure -and $exitCode -ne 0) {
    throw "Command failed ($exitCode): $FilePath $($Arguments -join ' ')"
  }
  return $exitCode
}

function Get-CommandPath {
  param([Parameter(Mandatory)] [string]$Name)
  return (Get-Command $Name -ErrorAction Stop | Select-Object -First 1).Source
}

function Get-GitOutput {
  param([Parameter(Mandatory)] [string[]]$Arguments)
  $git = Get-CommandPath "git"
  return (Invoke-External -FilePath $git -Arguments $Arguments -Capture).Output
}

function Set-ObjectProperty {
  param(
    [Parameter(Mandatory)] [object]$Object,
    [Parameter(Mandatory)] [string]$Name,
    [Parameter(Mandatory)] [AllowNull()] [object]$Value
  )

  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) {
    $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
  }
  else {
    $property.Value = $Value
  }
}

function Remove-ObjectProperty {
  param(
    [Parameter(Mandatory)] [object]$Object,
    [Parameter(Mandatory)] [string]$Name
  )
  if ($null -ne $Object.PSObject.Properties[$Name]) {
    $Object.PSObject.Properties.Remove($Name)
  }
}

function Read-Text {
  param([Parameter(Mandatory)] [string]$RelativePath)
  $path = Join-Path $Root $RelativePath
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Required file missing: $RelativePath"
  }
  return Get-Content -LiteralPath $path -Raw
}

function Read-Json {
  param([Parameter(Mandatory)] [string]$RelativePath)
  return (Read-Text $RelativePath | ConvertFrom-Json)
}

function Normalize-Newlines {
  param([Parameter(Mandatory)] [string]$Text)
  return (($Text -replace "`r`n", "`n") -replace "`r", "`n")
}

function Write-TextIfChanged {
  param(
    [Parameter(Mandatory)] [string]$RelativePath,
    [Parameter(Mandatory)] [string]$Content
  )

  $path = Join-Path $Root $RelativePath
  $normalized = (Normalize-Newlines $Content).TrimEnd() + "`n"
  $current = if (Test-Path -LiteralPath $path -PathType Leaf) {
    (Normalize-Newlines (Get-Content -LiteralPath $path -Raw)).TrimEnd() + "`n"
  }
  else { "" }

  if ($current -eq $normalized) { return $false }
  $Changes.Add($RelativePath)

  if ($Mode -eq "Apply") {
    $parent = Split-Path -Parent $path
    if (-not (Test-Path -LiteralPath $parent)) {
      New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    [System.IO.File]::WriteAllText($path, $normalized, [System.Text.UTF8Encoding]::new($false))
  }
  return $true
}

function Write-JsonIfChanged {
  param(
    [Parameter(Mandatory)] [string]$RelativePath,
    [Parameter(Mandatory)] [object]$Value
  )
  $json = $Value | ConvertTo-Json -Depth 100
  return Write-TextIfChanged -RelativePath $RelativePath -Content $json
}

function Replace-Required {
  param(
    [Parameter(Mandatory)] [string]$RelativePath,
    [Parameter(Mandatory)] [string]$Pattern,
    [Parameter(Mandatory)] [string]$Replacement,
    [switch]$Regex
  )

  $content = Read-Text $RelativePath
  if ($Regex) {
    if ($content -notmatch $Pattern) {
      throw "Required pattern missing in $RelativePath: $Pattern"
    }
    $updated = [regex]::Replace($content, $Pattern, $Replacement)
  }
  else {
    if (-not $content.Contains($Pattern)) {
      throw "Required text missing in $RelativePath."
    }
    $updated = $content.Replace($Pattern, $Replacement)
  }
  [void](Write-TextIfChanged -RelativePath $RelativePath -Content $updated)
}

function Add-OrUpdateGuardEntry {
  param(
    [Parameter(Mandatory)] [object]$Registry,
    [Parameter(Mandatory)] [string]$Id,
    [Parameter(Mandatory)] [string]$Name,
    [Parameter(Mandatory)] [string]$Script,
    [Parameter(Mandatory)] [string]$Description,
    [Parameter(Mandatory)] [string]$SourceFile
  )

  $entry = @($Registry.entries | Where-Object { $_.id -eq $Id }) | Select-Object -First 1
  if ($null -eq $entry) {
    $entry = [pscustomobject][ordered]@{
      id = $Id
      name = $Name
      script = $Script
      exit_level = "fail"
      description = $Description
      source_file = $SourceFile
    }
    $Registry.entries = @($Registry.entries) + @($entry)
  }
  else {
    Set-ObjectProperty $entry "name" $Name
    Set-ObjectProperty $entry "script" $Script
    Set-ObjectProperty $entry "exit_level" "fail"
    Set-ObjectProperty $entry "description" $Description
    Set-ObjectProperty $entry "source_file" $SourceFile
  }
}

function Assert-RepositoryState {
  Push-Location $Root
  try {
    [void](Get-CommandPath "git")
    [void](Get-CommandPath "node")
    [void](Get-CommandPath "pnpm")

    if (-not (Test-Path -LiteralPath ".git")) {
      throw "Not a Git repository: $Root"
    }

    $currentBranch = Get-GitOutput @("branch", "--show-current")
    if ($currentBranch -ne $Branch) {
      throw "Wrong branch. Expected '$Branch', found '$currentBranch'."
    }

    $origin = Get-GitOutput @("remote", "get-url", "origin")
    $normalizedOrigin = $origin -replace "^git@github.com:", "https://github.com/"
    if ($normalizedOrigin -notmatch "bthwani2-boop/bthwani-suite-next(?:\.git)?$") {
      throw "Wrong origin remote: $origin"
    }

    $scriptStatus = Get-GitOutput @("status", "--porcelain=v1", "--untracked-files=all")
    if ($Mode -in @("Apply", "Verify") -and $scriptStatus) {
      throw "Working tree must be clean before $Mode.`n$scriptStatus"
    }

    [void](Invoke-External -FilePath (Get-CommandPath "git") -Arguments @("fetch", "--prune", "origin", $Branch))
    $script:InitialHead = Get-GitOutput @("rev-parse", "HEAD")
    $script:InitialRemoteHead = Get-GitOutput @("rev-parse", "origin/$Branch")
    if ($InitialHead -ne $InitialRemoteHead) {
      throw "Local HEAD is not equal to origin/$Branch. Run a fast-forward pull first. local=$InitialHead remote=$InitialRemoteHead"
    }
  }
  finally {
    Pop-Location
  }
}

function Update-OpenCodeAdapter {
  $config = Read-Json "opencode.json"
  Set-ObjectProperty $config "instructions" @("AGENTS.md")
  [void](Write-JsonIfChanged "opencode.json" $config)
}

function Update-ToolAuthority {
  $decisions = Read-Json "tools/toolchain/tool-decisions.json"
  foreach ($property in @($decisions.decisions.PSObject.Properties)) {
    $decision = $property.Value
    if ($null -eq $decision.PSObject.Properties["action"] -and $null -ne $decision.PSObject.Properties["decision"]) {
      Set-ObjectProperty $decision "action" ([string]$decision.decision)
    }
    Remove-ObjectProperty $decision "decision"
    if ([string]::IsNullOrWhiteSpace([string]$decision.action)) {
      throw "Tool decision action is missing: $($property.Name)"
    }
  }
  [void](Write-JsonIfChanged "tools/toolchain/tool-decisions.json" $decisions)

  $catalog = Read-Json "tools/toolchain/tool-catalog.v5.json"
  $baseline = (Read-Json "tools/toolchain/tool-activation-baseline.json").baseline
  $failureByActivation = @{
    active = "fail"
    partial = "warn"
    optional = "manual"
    missing = "manual"
    disabled = "manual"
  }

  foreach ($entry in @($catalog.entries)) {
    $id = [string]$entry.id
    $baselineProperty = $baseline.PSObject.Properties[$id]
    $decisionProperty = $decisions.decisions.PSObject.Properties[$id]
    if ($null -eq $baselineProperty) { throw "Missing activation baseline for tool: $id" }
    if ($null -eq $decisionProperty) { throw "Missing decision for tool: $id" }

    $activation = [string]$baselineProperty.Value
    $action = [string]$decisionProperty.Value.action
    Set-ObjectProperty $entry "activation" $activation
    Set-ObjectProperty $entry "decision" $action
    if ($failureByActivation.ContainsKey($activation)) {
      Set-ObjectProperty $entry "failure_policy" $failureByActivation[$activation]
    }
  }
  [void](Write-JsonIfChanged "tools/toolchain/tool-catalog.v5.json" $catalog)
}

function Update-AgentIndexAuthorityLanguage {
  $content = Read-Text ".agents/INDEX.md"
  $old = @"
Canonical sources:

- `AGENTS.md`
- `governance/skills/skills-registry.json`
- `governance/tools/agent-tool-registry.json`
"@
  $new = @"
Routing inputs:

- `AGENTS.md` — canonical repository-agent execution policy.
- `governance/skills/skills-registry.json` — machine-readable governed skill lifecycle contract.
- `governance/tools/agent-tool-registry.json` — derived conditional tool-routing inventory; it owns no authority.
"@
  if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
  }
  elseif ($content -match "Canonical sources:[\s\S]*?agent-tool-registry\.json") {
    throw ".agents/INDEX.md authority wording changed unexpectedly; refusing an unsafe replacement."
  }
  [void](Write-TextIfChanged ".agents/INDEX.md" $content)
}

function Update-PackageScripts {
  $package = Read-Json "package.json"
  if ($null -eq $package.scripts) {
    $package | Add-Member -NotePropertyName scripts -NotePropertyValue ([pscustomobject]@{})
  }

  $desired = [ordered]@{
    "guard:adapter-trigger-coverage" = "node tools/guards/adapter-trigger-coverage-gate.mjs"
    "guard:local-evidence-sha" = "node tools/guards/same-commit-evidence-gate.mjs"
    "verify:github-ci-sha" = "node tools/scripts/verify-github-ci-for-sha.mjs"
    "guard:ai-toolchain-environment" = "node tools/guards/ai-toolchain-environment-gate.mjs"
    "guard:agent-system-all" = "pnpm run guard:governance-schema && pnpm run guard:document-authority-conflicts && pnpm run guard:agent-governance && pnpm run guard:adapter-trigger-coverage && pnpm run guard:tool-catalog-coverage && pnpm run guard:toolchain-activation && pnpm run guard:oss-toolchain-policy && pnpm run guard:guard-registry && pnpm run guard:required-command-integrity"
    "guard:agent-system-closure" = "pnpm run guard:agent-system-all && pnpm run guard:local-evidence-sha && pnpm run guard:workflow-lint && pnpm run guard:workflow-security && pnpm run guard:actions-pin"
    "guard:markdown-governance" = "node tools/scripts/run-affected-markdownlint.mjs"
    "guard:markdown-governance:full" = "pnpm exec markdownlint-cli2 \"governance/**/*.md\" \"AGENTS.md\" \"CLAUDE.md\" \"GEMINI.md\" \"LEAN-CTX.md\" \".agents/**/*.md\" \".github/**/*.md\""
    "guard:governance-all" = "pnpm run guard:agent-system-all && pnpm run guard:authority-separation && pnpm run guard:sdlc && pnpm run guard:cleanup-policy && pnpm run guard:markdown-governance"
  }

  foreach ($entry in $desired.GetEnumerator()) {
    Set-ObjectProperty $package.scripts $entry.Key $entry.Value
  }
  [void](Write-JsonIfChanged "package.json" $package)
}

function Update-GuardManifestAndRegistry {
  $manifest = Read-Json "tools/guards/guard-manifest.json"
  $agentSystem = @(
    "governance-schema",
    "document-authority-conflicts",
    "agent-governance",
    "adapter-trigger-coverage",
    "tool-catalog-coverage",
    "toolchain-activation",
    "oss-toolchain-policy",
    "guard-registry",
    "required-command-integrity"
  )
  Set-ObjectProperty $manifest.guardSets "agentSystem" $agentSystem
  [void](Write-JsonIfChanged "tools/guards/guard-manifest.json" $manifest)

  $registry = Read-Json "governance/guards/guard-registry.json"
  Add-OrUpdateGuardEntry $registry "adapter-trigger-coverage" "Agent Adapter Trigger Coverage Gate" "guard:adapter-trigger-coverage" "Verifies every governed agent adapter and optional tool configuration path triggers contextual governance CI and is classified as governance policy input." "tools/guards/adapter-trigger-coverage-gate.mjs"
  Add-OrUpdateGuardEntry $registry "same-commit-evidence" "Local Evidence SHA Gate" "guard:local-evidence-sha" "Validates only explicitly named local evidence manifests against the clean current HEAD. GitHub CI completion is verified separately by verify:github-ci-sha and enforced by the live master ruleset." "tools/guards/same-commit-evidence-gate.mjs"
  Add-OrUpdateGuardEntry $registry "ai-toolchain-environment" "AI Toolchain Environment Gate" "guard:ai-toolchain-environment" "Reports executable-level readiness for optional agent tools without treating wrapper-file presence as installation and fails only for explicitly required tools." "tools/guards/ai-toolchain-environment-gate.mjs"
  [void](Write-JsonIfChanged "governance/guards/guard-registry.json" $registry)
}

function Write-AdapterTriggerGuard {
  $content = @'
import fs from "node:fs";
import path from "node:path";
import { classifyFiles } from "../scripts/detect-ci-context.mjs";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "adapter-trigger-coverage-gate";
const violations = [];
const ciPath = path.join(repoRoot, ".github/workflows/ci.yml");
const ci = fs.existsSync(ciPath) ? fs.readFileSync(ciPath, "utf8") : "";

const governedInputs = [
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "LEAN-CTX.md",
  "opencode.json",
  ".lean-ctx.toml",
  ".graphifyignore",
  ".opencodereview/rule.json",
  ".github/copilot-instructions.md",
];

for (const file of governedInputs) {
  const result = classifyFiles([file]);
  if (!result.governance_policy) {
    violations.push({ file: "tools/scripts/detect-ci-context.mjs", line: 0, message: `ADAPTER_NOT_CLASSIFIED_AS_GOVERNANCE ${file}` });
  }
}

const requiredPathMarkers = [
  '"AGENTS.md"',
  '"CLAUDE.md"',
  '"GEMINI.md"',
  '"LEAN-CTX.md"',
  '"opencode.json"',
  '".lean-ctx.toml"',
  '".graphifyignore"',
  '".opencodereview/**"',
];

for (const marker of requiredPathMarkers) {
  const count = ci.split(marker).length - 1;
  if (count < 2) {
    violations.push({ file: ".github/workflows/ci.yml", line: 0, message: `ADAPTER_PATH_NOT_COVERED_BY_PUSH_AND_PR ${marker}` });
  }
}

fail(guardId, violations);
'@
  [void](Write-TextIfChanged "tools/guards/adapter-trigger-coverage-gate.mjs" $content)
}

function Write-AffectedMarkdownRunner {
  $content = @'
import { execFileSync, spawnSync } from "node:child_process";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function changedFiles() {
  const base = String(process.env.CI_BASE_SHA || "").trim();
  const head = String(process.env.CI_HEAD_SHA || "").trim() || "HEAD";
  const validBase = base && !/^0+$/.test(base) && base !== head;
  const committed = validBase
    ? git(["diff", "--name-only", "--diff-filter=ACMRTUXB", base, head, "--"])
    : git(["diff", "--name-only", "--diff-filter=ACMRTUXB", "HEAD~1", "HEAD", "--"]);
  const working = git(["diff", "--name-only", "--diff-filter=ACMRTUXB", "--"]);
  const staged = git(["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB", "--"]);
  return [...new Set([committed, working, staged].join("\n").split(/\r?\n/).map((v) => v.trim()).filter(Boolean))];
}

const files = changedFiles().filter((file) => {
  if (!file.endsWith(".md")) return false;
  return file === "AGENTS.md" || file === "CLAUDE.md" || file === "GEMINI.md" || file === "LEAN-CTX.md" ||
    file.startsWith("governance/") || file.startsWith(".agents/") || file.startsWith(".github/");
});

if (files.length === 0) {
  console.log("affected markdown: no governed markdown files changed");
  process.exit(0);
}

console.log(`affected markdown: ${files.length} file(s)`);
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(command, ["exec", "markdownlint-cli2", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);
'@
  [void](Write-TextIfChanged "tools/scripts/run-affected-markdownlint.mjs" $content)
}

function Write-AiEnvironmentGuard {
  $content = @'
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "ai-toolchain-environment-gate";
const violations = [];
const registryPath = path.join(repoRoot, "governance/tools/agent-tool-registry.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const explicitlyRequired = new Set(String(process.env.BTHWANI_REQUIRED_AI_TOOLS || "").split(",").map((v) => v.trim()).filter(Boolean));

const commands = {
  graphify: ["graphify"],
  leanctx: ["lean-ctx", "lean-ctx.exe", "lean-ctx.cmd"],
  "open-code-review": ["ocr", "ocr.exe", "ocr.cmd"],
};

function probe(candidates) {
  for (const command of candidates) {
    try {
      const output = execFileSync(command, ["--version"], { encoding: "utf8", timeout: 10000, windowsHide: true }).trim();
      return { state: "VERIFIED_AVAILABLE", command, version: output.split(/\r?\n/)[0] || "unknown" };
    } catch {
      // Try the next platform-specific executable name.
    }
  }
  return { state: "VERIFIED_UNAVAILABLE" };
}

const report = {
  schemaVersion: 2,
  sourceSha: (() => { try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(); } catch { return null; } })(),
  required: [...explicitlyRequired].sort(),
  tools: {},
};

for (const tool of registry.entries || []) {
  const status = probe(commands[tool.id] || [tool.id]);
  report.tools[tool.id] = status;
  if (explicitlyRequired.has(tool.id) && status.state !== "VERIFIED_AVAILABLE") {
    violations.push({ file: "environment", line: 0, message: `REQUIRED_AI_TOOL_UNAVAILABLE ${tool.id}` });
  }
}

for (const core of ["node", "pnpm"]) {
  const status = probe([core, process.platform === "win32" ? `${core}.cmd` : core]);
  report.tools[core] = status;
  if (status.state !== "VERIFIED_AVAILABLE") {
    violations.push({ file: "environment", line: 0, message: `REQUIRED_CORE_TOOL_UNAVAILABLE ${core}` });
  }
}

console.log(JSON.stringify(report, null, 2));
fail(guardId, violations);
'@
  [void](Write-TextIfChanged "tools/guards/ai-toolchain-environment-gate.mjs" $content)
}

function Write-AiVerificationScript {
  $content = @'
[CmdletBinding()]
param(
  [ValidateSet("Verify", "Full")]
  [string]$Mode = "Verify",
  [string[]]$Require = @()
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Push-Location $root
try {
  $startHead = (& git rev-parse HEAD).Trim()
  $startStatus = (& git status --porcelain=v1 --untracked-files=all | Out-String)
  $env:BTHWANI_REQUIRED_AI_TOOLS = ($Require -join ",")
  try {
    & node tools/guards/ai-toolchain-environment-gate.mjs
    if ($LASTEXITCODE -ne 0) { throw "AI environment guard failed." }

    if ($Mode -eq "Full") {
      foreach ($tool in $Require) {
        switch ($tool) {
          "graphify" { & (Join-Path $PSScriptRoot "invoke-graphify-toolchain.ps1") -Mode Verify }
          "leanctx" { & (Join-Path $PSScriptRoot "invoke-leanctx-toolchain.ps1") -Mode Verify }
          "open-code-review" { & (Join-Path $PSScriptRoot "invoke-open-code-review-toolchain.ps1") -Mode Verify }
          default { throw "Unknown required AI tool: $tool" }
        }
        if ($LASTEXITCODE -ne 0) { throw "Required AI tool verification failed: $tool" }
      }
    }
  }
  finally {
    Remove-Item Env:BTHWANI_REQUIRED_AI_TOOLS -ErrorAction SilentlyContinue
  }

  $endHead = (& git rev-parse HEAD).Trim()
  $endStatus = (& git status --porcelain=v1 --untracked-files=all | Out-String)
  if ($startHead -ne $endHead) { throw "HEAD changed during AI tool verification." }
  if ($startStatus -ne $endStatus) { throw "Working tree changed during AI tool verification." }
  Write-Output "verified_sha=$endHead"
  Write-Output "decision=PASS"
}
finally {
  Pop-Location
}
'@
  [void](Write-TextIfChanged "tools/scripts/verify-ai-toolchain.ps1" $content)
}

function Write-GraphifyWrapper {
  $content = @'
[CmdletBinding()]
param(
  [ValidateSet("Verify", "Repair", "Full")]
  [string]$Mode = "Verify"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$stampPath = "graphify-out/.bthwani-source.json"
Push-Location $root
try {
  $command = Get-Command graphify -ErrorAction Stop
  $version = (& $command.Source --version 2>&1 | Out-String).Trim()
  if (-not $version) { throw "Graphify returned an empty version." }
  $head = (& git rev-parse HEAD).Trim()

  $ignore = Get-Content -LiteralPath ".graphifyignore" -Raw
  if ($ignore -match '(?m)^apps/control-panel/runtime/\s*$') {
    throw ".graphifyignore excludes the complete control-panel runtime source."
  }
  & git check-ignore -q graphify-out/graph.json
  if ($LASTEXITCODE -ne 0) { throw "graphify-out is not ignored by Git." }

  if ($Mode -in @("Repair", "Full")) {
    & $command.Source extract . --code-only --force
    if ($LASTEXITCODE -ne 0) { throw "Graphify extraction failed." }
    New-Item -ItemType Directory -Path "graphify-out" -Force | Out-Null
    [ordered]@{
      schemaVersion = 1
      sourceSha = $head
      generatedAt = (Get-Date).ToUniversalTime().ToString("o")
      coverage = "APPLICATION_CODE_GRAPH"
      graphifyVersion = $version
    } | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $stampPath -Encoding utf8NoBOM
  }

  if (-not (Test-Path -LiteralPath "graphify-out/graph.json" -PathType Leaf)) {
    throw "Required Graphify output missing. Run with -Mode Repair or -Mode Full."
  }
  if (-not (Test-Path -LiteralPath $stampPath -PathType Leaf)) {
    throw "Graphify source stamp missing. Rebuild with -Mode Repair or -Mode Full."
  }
  $stamp = Get-Content -LiteralPath $stampPath -Raw | ConvertFrom-Json
  if ([string]$stamp.sourceSha -ne $head) {
    throw "Graphify graph is stale. graph=$($stamp.sourceSha) head=$head"
  }

  Write-Output "graphify_version=$version"
  Write-Output "graph_source_sha=$head"
  Write-Output "coverage=application-code"
  Write-Output "decision=PASS"
}
finally {
  Pop-Location
}
'@
  [void](Write-TextIfChanged "tools/scripts/invoke-graphify-toolchain.ps1" $content)
}

function Write-LocalEvidenceGuard {
  $content = @'
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "same-commit-evidence-gate";
const violations = [];

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function manifests(root, found = []) {
  if (!fs.existsSync(root)) return found;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) manifests(full, found);
    else if (entry.name === "manifest.json") found.push(full);
  }
  return found;
}

let head;
try { head = git(["rev-parse", "HEAD"]); }
catch { violations.push({ file: ".git", line: 0, message: "HEAD_SHA_UNRESOLVED" }); }

const files = [
  ...manifests(path.join(repoRoot, ".diagnostics")),
  ...manifests(path.join(repoRoot, ".artifacts", "diagnostics")),
];

if (files.length === 0) {
  console.log("local evidence sha: no explicit manifest.json files present");
} else {
  const dirty = git(["status", "--porcelain=v1", "--untracked-files=all"]);
  if (dirty) violations.push({ file: "worktree", line: 0, message: "WORKTREE_DIRTY_LOCAL_EVIDENCE_INVALID" });
  for (const file of files) {
    const relative = path.relative(repoRoot, file).replaceAll("\\", "/");
    let value;
    try { value = JSON.parse(fs.readFileSync(file, "utf8")); }
    catch (error) { violations.push({ file: relative, line: 0, message: `INVALID_JSON ${error.message}` }); continue; }
    const sourceSha = value.sourceSha || value.sha || value.commit;
    if (!sourceSha) violations.push({ file: relative, line: 0, message: "MANIFEST_MISSING_SOURCE_SHA" });
    else if (sourceSha !== head) violations.push({ file: relative, line: 0, message: `LOCAL_EVIDENCE_NOT_ON_CURRENT_HEAD manifest=${sourceSha} head=${head}` });
  }
}

fail(guardId, violations);
'@
  [void](Write-TextIfChanged "tools/guards/same-commit-evidence-gate.mjs" $content)
}

function Write-GitHubCiVerifier {
  $content = @'
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    repo: { type: "string", default: "bthwani2-boop/bthwani-suite-next" },
    sha: { type: "string" },
    check: { type: "string", default: "BThwani CI result" },
    wait: { type: "boolean", default: false },
    "timeout-minutes": { type: "string", default: "45" },
  },
});

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}
function gh(args) {
  return JSON.parse(execFileSync("gh", args, { encoding: "utf8" }));
}

const sha = values.sha || git(["rev-parse", "HEAD"]);
const deadline = Date.now() + Number(values["timeout-minutes"]) * 60_000;

while (true) {
  const result = gh(["api", `repos/${values.repo}/commits/${sha}/check-runs`, "-H", "Accept: application/vnd.github+json"]);
  const matches = (result.check_runs || []).filter((run) => run.name === values.check);
  const success = matches.find((run) => run.status === "completed" && run.conclusion === "success");
  if (success) {
    console.log(JSON.stringify({ decision: "PASS", sha, check: values.check, runId: success.id, conclusion: success.conclusion }, null, 2));
    process.exit(0);
  }
  const completedFailure = matches.find((run) => run.status === "completed" && run.conclusion !== "success");
  if (completedFailure) {
    console.error(JSON.stringify({ decision: "FIX_REQUIRED", sha, check: values.check, runId: completedFailure.id, conclusion: completedFailure.conclusion }, null, 2));
    process.exit(1);
  }
  if (!values.wait || Date.now() >= deadline) {
    console.error(JSON.stringify({ decision: "NEEDS_EVIDENCE", sha, check: values.check, observedRuns: matches.map((run) => ({ id: run.id, status: run.status, conclusion: run.conclusion })) }, null, 2));
    process.exit(2);
  }
  await new Promise((resolve) => setTimeout(resolve, 15_000));
}
'@
  [void](Write-TextIfChanged "tools/scripts/verify-github-ci-for-sha.mjs" $content)
}

function Write-ToolCatalogCoverageGuard {
  $content = @'
import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "tool-catalog-coverage-gate";
const violations = [];
function readJson(rel) {
  const file = path.join(repoRoot, rel);
  if (!fs.existsSync(file)) { violations.push({ file: rel, line: 0, message: "MISSING_FILE" }); return undefined; }
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { violations.push({ file: rel, line: 0, message: `INVALID_JSON ${error.message}` }); return undefined; }
}

const catalog = readJson("tools/toolchain/tool-catalog.v5.json");
const expected = readJson("tools/toolchain/expected-tool-ids.v5.json");
const decisions = readJson("tools/toolchain/tool-decisions.json");
const owners = readJson("tools/toolchain/tool-owners.json");
const baseline = readJson("tools/toolchain/tool-activation-baseline.json");
const agentRegistry = readJson("governance/tools/agent-tool-registry.json");
const pkg = readJson("package.json");
const requiredKeys = ["id", "category", "priority", "oss_free", "decision", "activation", "failure_policy"];
const allowedActivation = new Set(["active", "partial", "optional", "missing", "disabled"]);
const expectedFailure = { active: "fail", partial: "warn", optional: "manual", missing: "manual", disabled: "manual" };
const seen = new Set();
const agentToolIds = new Set((agentRegistry?.entries || []).map((entry) => entry.id));

for (const [id, decision] of Object.entries(decisions?.decisions || {})) {
  if (!decision || typeof decision.action !== "string" || !decision.action.trim()) {
    violations.push({ file: "tools/toolchain/tool-decisions.json", line: 0, message: `INVALID_DECISION_ACTION ${id}` });
  }
  if (Object.prototype.hasOwnProperty.call(decision || {}, "decision")) {
    violations.push({ file: "tools/toolchain/tool-decisions.json", line: 0, message: `LEGACY_DECISION_FIELD_FORBIDDEN ${id}` });
  }
}

for (const entry of catalog?.entries || []) {
  if (!entry.id) { violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: "MALFORMED_ENTRY: missing id" }); continue; }
  if (seen.has(entry.id)) violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: `DUPLICATE_TOOL_ID ${entry.id}` });
  seen.add(entry.id);
  for (const key of requiredKeys) if (entry[key] === undefined) violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: `MISSING_PROPERTY ${entry.id}.${key}` });
  if (!allowedActivation.has(entry.activation)) violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: `INVALID_ACTIVATION ${entry.id}=${entry.activation}` });

  const sourceDecision = decisions?.decisions?.[entry.id]?.action;
  const sourceActivation = baseline?.baseline?.[entry.id];
  if (!sourceDecision) violations.push({ file: "tools/toolchain/tool-decisions.json", line: 0, message: `MISSING_DECISION ${entry.id}` });
  else if (entry.decision !== sourceDecision) violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: `DECISION_PROJECTION_DRIFT ${entry.id}: catalog=${entry.decision} source=${sourceDecision}` });
  if (!sourceActivation) violations.push({ file: "tools/toolchain/tool-activation-baseline.json", line: 0, message: `MISSING_BASELINE ${entry.id}` });
  else if (entry.activation !== sourceActivation) violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: `ACTIVATION_PROJECTION_DRIFT ${entry.id}: catalog=${entry.activation} source=${sourceActivation}` });
  if (sourceActivation && entry.failure_policy !== expectedFailure[sourceActivation]) violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: `FAILURE_POLICY_PROJECTION_DRIFT ${entry.id}` });
  if (!owners?.owners?.[entry.id]) violations.push({ file: "tools/toolchain/tool-owners.json", line: 0, message: `MISSING_OWNER ${entry.id}` });
}

for (const id of expected?.expected_tools || []) if (!seen.has(id)) violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: `EXPECTED_TOOL_MISSING ${id}` });
for (const id of seen) if (!(expected?.expected_tools || []).includes(id)) violations.push({ file: "tools/toolchain/expected-tool-ids.v5.json", line: 0, message: `CATALOG_TOOL_NOT_EXPECTED ${id}` });
for (const id of agentToolIds) if (!seen.has(id)) violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: `AGENT_TOOL_MISSING_IN_CATALOG ${id}` });

const prefixes = { graphify: "graphify", leanctx: "leanctx", ocr: "open-code-review" };
for (const script of Object.keys(pkg?.scripts || {})) {
  for (const [prefix, id] of Object.entries(prefixes)) {
    if ((script === prefix || script.startsWith(`${prefix}:`)) && !agentToolIds.has(id)) {
      violations.push({ file: "package.json", line: 0, message: `UNREGISTERED_AGENT_TOOL_COMMAND ${script}->${id}` });
    }
  }
}

fail(guardId, violations);
'@
  [void](Write-TextIfChanged "tools/guards/tool-catalog-coverage-gate.mjs" $content)
}

function Update-GuardRegistryGate {
  $content = Read-Text "tools/guards/guard-registry-gate.mjs"
  foreach ($script in @("guard:agent-system-all", "guard:agent-system-closure", "guard:markdown-governance:full")) {
    if ($content -notmatch [regex]::Escape("  `"$script`",")) {
      $anchor = '  "guard:governance-all",'
      if (-not $content.Contains($anchor)) { throw "Aggregate script anchor missing." }
      $content = $content.Replace($anchor, "$anchor`n  `"$script`",")
    }
  }
  $old = 'const manifestGuardIds = new Set([...(manifest?.guardSets?.foundation ?? []), ...(manifest?.guardSets?.journey ?? []), ...(manifest?.guardSets?.governance ?? [])]);'
  $new = 'const manifestGuardIds = new Set(Object.values(manifest?.guardSets ?? {}).flatMap((value) => Array.isArray(value) ? value : []));'
  if ($content.Contains($old)) { $content = $content.Replace($old, $new) }
  elseif (-not $content.Contains($new)) { throw "Guard manifest aggregation logic changed unexpectedly." }
  [void](Write-TextIfChanged "tools/guards/guard-registry-gate.mjs" $content)
}

function Update-DocumentAuthorityGuard {
  $content = Read-Text "tools/guards/document-authority-conflicts-gate.mjs"
  $marker = "INDEX_MUST_NOT_PROMOTE_DERIVED_TOOL_REGISTRY"
  if (-not $content.Contains($marker)) {
    $insert = @'

if (/Canonical sources:[\s\S]*?governance\/tools\/agent-tool-registry\.json/i.test(index)) {
  violations.push({ file: ".agents/INDEX.md", line: 0, message: "INDEX_MUST_NOT_PROMOTE_DERIVED_TOOL_REGISTRY" });
}
'@
    $anchor = "// LeanCTX text conflict checks"
    if (-not $content.Contains($anchor)) { throw "Document authority guard anchor missing." }
    $content = $content.Replace($anchor, $insert + "`n" + $anchor)
  }
  [void](Write-TextIfChanged "tools/guards/document-authority-conflicts-gate.mjs" $content)
}

function Update-CiRouting {
  $ciPath = ".github/workflows/ci.yml"
  $ci = Read-Text $ciPath
  $markers = @(
    '      - "CLAUDE.md"',
    '      - "LEAN-CTX.md"',
    '      - "opencode.json"',
    '      - ".lean-ctx.toml"',
    '      - ".graphifyignore"',
    '      - ".opencodereview/**"'
  )
  foreach ($marker in $markers) {
    $count = $ci.Split($marker).Count - 1
    while ($count -lt 2) {
      $anchor = '      - "GEMINI.md"'
      $index = $ci.IndexOf($anchor)
      if ($index -lt 0) { throw "CI path anchor missing." }
      if ($count -eq 1) {
        $index = $ci.IndexOf($anchor, $index + $anchor.Length)
        if ($index -lt 0) { throw "Second CI path anchor missing." }
      }
      $insertAt = $index + $anchor.Length
      $ci = $ci.Insert($insertAt, "`n$marker")
      $count += 1
    }
  }
  [void](Write-TextIfChanged $ciPath $ci)

  $routerPath = "tools/scripts/detect-ci-context.mjs"
  $router = Read-Text $routerPath
  $old = '  const governance = full || mobileTooling || equals("AGENTS.md", "GEMINI.md") || starts(".agents/", "governance/") || has((file) =>'
  $new = '  const governance = full || mobileTooling || equals("AGENTS.md", "CLAUDE.md", "GEMINI.md", "LEAN-CTX.md", "opencode.json", ".lean-ctx.toml", ".graphifyignore") || starts(".agents/", ".opencodereview/", "governance/") || has((file) =>'
  if ($router.Contains($old)) { $router = $router.Replace($old, $new) }
  elseif (-not $router.Contains($new)) { throw "CI classifier governance expression changed unexpectedly." }
  [void](Write-TextIfChanged $routerPath $router)

  $testPath = "tools/scripts/detect-ci-context.test.mjs"
  $tests = Read-Text $testPath
  if (-not $tests.Contains('test("agent adapters and tool configs route through governance policy"')) {
    $tests += @'


test("agent adapters and tool configs route through governance policy", () => {
  for (const file of [
    "CLAUDE.md",
    "LEAN-CTX.md",
    "opencode.json",
    ".lean-ctx.toml",
    ".graphifyignore",
    ".opencodereview/rule.json",
    ".github/copilot-instructions.md",
  ]) {
    const result = classifyFiles([file]);
    assert.equal(result.governance_policy, true, file);
  }
});
'@
  }
  [void](Write-TextIfChanged $testPath $tests)
}

function Update-CiPolicy {
  $path = ".github/workflows/ci-policy.yml"
  $content = Read-Text $path
  $anchor = @'
      - name: Verify agent governance
        if: ${{ inputs.governance_policy == 'true' }}
        run: pnpm run guard:agent-governance
'@
  $addition = @'

      - name: Verify document authority projections
        if: ${{ inputs.governance_policy == 'true' }}
        run: pnpm run guard:document-authority-conflicts

      - name: Verify agent adapter CI routing
        if: ${{ inputs.governance_policy == 'true' }}
        run: pnpm run guard:adapter-trigger-coverage

      - name: Verify tool catalog projections
        if: ${{ inputs.governance_policy == 'true' }}
        run: pnpm run guard:tool-catalog-coverage

      - name: Verify tool activation projections
        if: ${{ inputs.governance_policy == 'true' }}
        run: pnpm run guard:toolchain-activation

      - name: Verify OSS tool policy
        if: ${{ inputs.governance_policy == 'true' }}
        run: pnpm run guard:oss-toolchain-policy
'@
  if (-not $content.Contains("Verify agent adapter CI routing")) {
    if (-not $content.Contains($anchor)) { throw "CI policy agent-governance anchor missing." }
    $content = $content.Replace($anchor, $anchor + $addition)
  }
  [void](Write-TextIfChanged $path $content)
}

function Write-SafeRulesetApplier {
  $content = @'
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";

const { values } = parseArgs({
  options: {
    "ruleset-id": { type: "string" },
    payload: { type: "string" },
    apply: { type: "boolean", default: false },
    repo: { type: "string", default: "bthwani2-boop/bthwani-suite-next" },
  },
});
if (!values["ruleset-id"] || !values.payload) {
  console.error("Usage: node apply-repository-ruleset.mjs --ruleset-id <id> --payload <file> [--apply]");
  process.exit(1);
}
if (!fs.existsSync(values.payload)) {
  console.error(`Payload file not found: ${values.payload}`);
  process.exit(1);
}

function gh(args) {
  return JSON.parse(execFileSync("gh", args, { encoding: "utf8" }));
}
function normalize(value) {
  return {
    name: value.name,
    target: value.target,
    enforcement: value.enforcement,
    conditions: value.conditions,
    rules: value.rules,
    bypass_actors: value.bypass_actors || [],
  };
}

const endpoint = `repos/${values.repo}/rulesets/${values["ruleset-id"]}`;
const live = gh(["api", endpoint]);
const desired = JSON.parse(fs.readFileSync(values.payload, "utf8"));
const before = normalize(live);
const target = normalize(desired);
const same = JSON.stringify(before) === JSON.stringify(target);
console.log(JSON.stringify({ mode: values.apply ? "apply" : "plan", same, before, target }, null, 2));
if (same) process.exit(0);
if (!values.apply) {
  console.error("Ruleset differs. Re-run with --apply only after reviewing the plan above.");
  process.exit(2);
}

const backupDir = path.join(".artifacts", "rulesets");
fs.mkdirSync(backupDir, { recursive: true });
const backup = path.join(backupDir, `ruleset-${values["ruleset-id"]}-before-${Date.now()}.json`);
fs.writeFileSync(backup, JSON.stringify(live, null, 2) + "\n");
execFileSync("gh", ["api", "-X", "PUT", endpoint, "--input", values.payload], { stdio: "inherit" });
const after = normalize(gh(["api", endpoint]));
if (JSON.stringify(after) !== JSON.stringify(target)) {
  console.error(JSON.stringify({ decision: "FAILED_VERIFICATION", backup, after, target }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ decision: "PASS", backup, applied: after }, null, 2));
'@
  [void](Write-TextIfChanged "tools/scripts/apply-repository-ruleset.mjs" $content)
}

function Update-RepositoryEnforcementProjection {
  $projection = Read-Json "governance/github/repository-enforcement.json"
  Set-ObjectProperty $projection "observedAt" $null
  Set-ObjectProperty $projection "intendedRulesetFile" "governance/github/master-protection.ruleset.json"
  Set-ObjectProperty $projection "liveRulesetId" $RulesetId
  Set-ObjectProperty $projection "requiredCheckNames" @($RequiredCheck)
  if ($null -ne $projection.requiredPullRequestPolicy) {
    Set-ObjectProperty $projection.requiredPullRequestPolicy "requireLastPushApprovalByDifferentActor" $false
    Set-ObjectProperty $projection.requiredPullRequestPolicy "requireLinearHistory" $true
  }
  if ($null -ne $projection.observed) {
    Set-ObjectProperty $projection.observed "branchProtectionState" "REQUIRES_LIVE_VERIFICATION"
    Set-ObjectProperty $projection.observed "requiredChecksState" "REQUIRES_LIVE_VERIFICATION"
    Set-ObjectProperty $projection.observed "sameCommitWorkflowRunsState" "REQUIRES_LIVE_VERIFICATION"
  }
  Set-ObjectProperty $projection "decision" "NEEDS_LIVE_VERIFICATION"
  [void](Write-JsonIfChanged "governance/github/repository-enforcement.json" $projection)
}

function Invoke-RepositoryRepairs {
  Update-OpenCodeAdapter
  Update-ToolAuthority
  Update-AgentIndexAuthorityLanguage
  Update-PackageScripts
  Update-GuardManifestAndRegistry
  Write-AdapterTriggerGuard
  Write-AffectedMarkdownRunner
  Write-AiEnvironmentGuard
  Write-AiVerificationScript
  Write-GraphifyWrapper
  Write-LocalEvidenceGuard
  Write-GitHubCiVerifier
  Write-ToolCatalogCoverageGuard
  Update-GuardRegistryGate
  Update-DocumentAuthorityGuard
  Update-CiRouting
  Update-CiPolicy
  Write-SafeRulesetApplier
  Update-RepositoryEnforcementProjection
}

function Invoke-FocusedVerification {
  Push-Location $Root
  try {
    [void](Invoke-External -FilePath (Get-CommandPath "node") -Arguments @("--test", "tools/scripts/detect-ci-context.test.mjs"))
    [void](Invoke-External -FilePath (Get-CommandPath "pnpm") -Arguments @("run", "guard:agent-system-all"))
    [void](Invoke-External -FilePath (Get-CommandPath "git") -Arguments @("diff", "--check"))
    if ($RunFullVerification) {
      [void](Invoke-External -FilePath (Get-CommandPath "pnpm") -Arguments @("run", "guard:agent-system-closure"))
    }
  }
  finally {
    Pop-Location
  }
}

function Commit-And-PushChanges {
  Push-Location $Root
  try {
    $status = Get-GitOutput @("status", "--porcelain=v1", "--untracked-files=all")
    if (-not $status) {
      $Notes.Add("No repository changes remained to commit.")
      return
    }

    [void](Invoke-External -FilePath (Get-CommandPath "git") -Arguments @("fetch", "--prune", "origin", $Branch))
    $remoteBeforePush = Get-GitOutput @("rev-parse", "origin/$Branch")
    if ($remoteBeforePush -ne $InitialRemoteHead) {
      throw "origin/$Branch moved during remediation. Refusing stale-SHA push. before=$InitialRemoteHead now=$remoteBeforePush"
    }

    [void](Invoke-External -FilePath (Get-CommandPath "git") -Arguments @("add", "--", "."))
    [void](Invoke-External -FilePath (Get-CommandPath "git") -Arguments @("commit", "-m", "fix(agent-system): converge fast accurate governed execution"))
    $newHead = Get-GitOutput @("rev-parse", "HEAD")
    [void](Invoke-External -FilePath (Get-CommandPath "git") -Arguments @("push", "origin", "HEAD:refs/heads/$Branch"))
    [void](Invoke-External -FilePath (Get-CommandPath "git") -Arguments @("fetch", "origin", $Branch))
    $remoteAfterPush = Get-GitOutput @("rev-parse", "origin/$Branch")
    if ($remoteAfterPush -ne $newHead) {
      throw "Remote head mismatch after push. local=$newHead remote=$remoteAfterPush"
    }
    $Notes.Add("Pushed $newHead to origin/$Branch.")
  }
  finally {
    Pop-Location
  }
}

function Invoke-LiveRulesetApplication {
  Push-Location $Root
  try {
    [void](Get-CommandPath "gh")
    $args = @(
      "tools/scripts/apply-repository-ruleset.mjs",
      "--ruleset-id", [string]$RulesetId,
      "--payload", "governance/github/master-protection.ruleset.json",
      "--repo", $Repository,
      "--apply"
    )
    [void](Invoke-External -FilePath (Get-CommandPath "node") -Arguments $args)
  }
  finally {
    Pop-Location
  }
}

function Wait-ForSameCommitCi {
  Push-Location $Root
  try {
    [void](Get-CommandPath "gh")
    $head = Get-GitOutput @("rev-parse", "HEAD")
    [void](Invoke-External -FilePath (Get-CommandPath "node") -Arguments @(
      "tools/scripts/verify-github-ci-for-sha.mjs",
      "--repo", $Repository,
      "--sha", $head,
      "--check", $RequiredCheck,
      "--wait",
      "--timeout-minutes", [string]$CiTimeoutMinutes
    ))
  }
  finally {
    Pop-Location
  }
}

Assert-RepositoryState
Push-Location $Root
try {
  Invoke-RepositoryRepairs

  if ($Mode -eq "Plan") {
    Write-Output "mode=PLAN"
    Write-Output "branch=$Branch"
    Write-Output "source_sha=$InitialHead"
    Write-Output "planned_change_count=$($Changes.Count)"
    $Changes | Sort-Object -Unique | ForEach-Object { Write-Output "planned_change=$_" }
    Write-Output "decision=$(if ($Changes.Count -gt 0) { 'FIX_REQUIRED' } else { 'PASS' })"
    exit 0
  }

  if ($Mode -eq "Verify") {
    if ($Changes.Count -gt 0) {
      Write-Error "Remediation drift remains in $($Changes.Count) path(s): $((@($Changes | Sort-Object -Unique)) -join ', ')"
      exit 1
    }
    Invoke-FocusedVerification
    Write-Output "mode=VERIFY"
    Write-Output "verified_sha=$InitialHead"
    Write-Output "decision=PASS"
    exit 0
  }

  Invoke-FocusedVerification
  if ($CommitAndPush) { Commit-And-PushChanges }
  if ($WaitForCi) {
    if (-not $CommitAndPush) { throw "-WaitForCi requires -CommitAndPush so the verified SHA exists on GitHub." }
    Wait-ForSameCommitCi
  }
  if ($ApplyLiveRuleset) {
    if (-not $CommitAndPush) { throw "-ApplyLiveRuleset requires -CommitAndPush." }
    Invoke-LiveRulesetApplication
  }

  Write-Output "mode=APPLY"
  Write-Output "branch=$Branch"
  Write-Output "source_sha=$InitialHead"
  Write-Output "changed_path_count=$($Changes.Count)"
  $Changes | Sort-Object -Unique | ForEach-Object { Write-Output "changed_path=$_" }
  $Notes | ForEach-Object { Write-Output "note=$_" }
  Write-Output "decision=PASS"
}
finally {
  Pop-Location
}
