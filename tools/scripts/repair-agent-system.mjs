import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    mode: { type: "string", default: "plan" },
    branch: { type: "string", default: "abbas" },
    "commit-push": { type: "boolean", default: false },
    "wait-ci": { type: "boolean", default: false },
    "apply-live-ruleset": { type: "boolean", default: false },
    full: { type: "boolean", default: false },
    "ci-timeout-minutes": { type: "string", default: "45" },
    "ruleset-id": { type: "string", default: "18292744" },
  },
});

const mode = String(values.mode).toLowerCase();
if (!new Set(["plan", "apply", "verify"]).has(mode)) {
  throw new Error("--mode must be plan, apply, or verify");
}

const repository = "bthwani2-boop/bthwani-suite-next";
const requiredCheck = "BThwani CI result";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const NL = String.fromCharCode(10);
const changes = new Set();
const notes = [];
let initialHead = "";
let initialRemoteHead = "";

function command(name, args = [], options = {}) {
  const result = spawnSync(name, args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    stdio: options.capture === false ? "inherit" : "pipe",
    env: { ...process.env, ...(options.env || {}) },
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0 && !options.allowFailure) {
    const output = [result.stdout, result.stderr].filter(Boolean).join(NL).trim();
    throw new Error("Command failed (" + result.status + "): " + name + " " + args.join(" ") + (output ? NL + output : ""));
  }
  return {
    status: result.status ?? 1,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim(),
  };
}

function git(args, options = {}) {
  return command("git", args, options);
}

function read(relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error("Required file missing: " + relative);
  }
  return fs.readFileSync(file, "utf8");
}

function readJson(relative) {
  try {
    return JSON.parse(read(relative));
  } catch (error) {
    throw new Error("Invalid JSON in " + relative + ": " + error.message);
  }
}

function normalizeText(text) {
  return String(text).replaceAll("\r\n", "\n").replaceAll("\r", "\n").trimEnd() + NL;
}

function write(relative, content) {
  const file = path.join(root, relative);
  const next = normalizeText(content);
  const current = fs.existsSync(file) ? normalizeText(fs.readFileSync(file, "utf8")) : "";
  if (current === next) return false;
  changes.add(relative);
  if (mode === "apply") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, next, "utf8");
  }
  return true;
}

function writeJson(relative, value) {
  return write(relative, JSON.stringify(value, null, 2));
}

function assertRepositoryState() {
  if (!fs.existsSync(path.join(root, ".git"))) throw new Error("Not a Git repository: " + root);
  const currentBranch = git(["branch", "--show-current"]).stdout;
  if (currentBranch !== values.branch) {
    throw new Error("Wrong branch. Expected " + values.branch + ", found " + currentBranch);
  }
  const origin = git(["remote", "get-url", "origin"]).stdout.replace(/^git@github\.com:/, "https://github.com/");
  if (!/bthwani2-boop\/bthwani-suite-next(?:\.git)?$/.test(origin)) {
    throw new Error("Wrong origin remote: " + origin);
  }
  const status = git(["status", "--porcelain=v1", "--untracked-files=all"]).stdout;
  if (status) throw new Error("Working tree must be clean before remediation." + NL + status);
  git(["fetch", "--prune", "origin", values.branch], { capture: false });
  initialHead = git(["rev-parse", "HEAD"]).stdout;
  initialRemoteHead = git(["rev-parse", "origin/" + values.branch]).stdout;
  if (initialHead !== initialRemoteHead) {
    throw new Error("Local HEAD must equal origin/" + values.branch + ". local=" + initialHead + " remote=" + initialRemoteHead);
  }
}

function replaceOnce(relative, before, after) {
  const content = read(relative);
  if (content.includes(after)) return;
  if (!content.includes(before)) throw new Error("Expected text not found in " + relative);
  write(relative, content.replace(before, after));
}

function addOrUpdateGuard(registry, entry) {
  const index = registry.entries.findIndex((item) => item.id === entry.id);
  if (index === -1) registry.entries.push(entry);
  else registry.entries[index] = { ...registry.entries[index], ...entry };
}

function updateOpenCode() {
  const config = readJson("opencode.json");
  config.instructions = ["AGENTS.md"];
  writeJson("opencode.json", config);
}

function updateToolAuthority() {
  const decisions = readJson("tools/toolchain/tool-decisions.json");
  for (const [id, decision] of Object.entries(decisions.decisions || {})) {
    if (!decision.action && decision.decision) decision.action = decision.decision;
    delete decision.decision;
    if (!decision.action || typeof decision.action !== "string") {
      throw new Error("Tool decision action missing: " + id);
    }
  }
  writeJson("tools/toolchain/tool-decisions.json", decisions);

  const catalog = readJson("tools/toolchain/tool-catalog.v5.json");
  const baseline = readJson("tools/toolchain/tool-activation-baseline.json").baseline || {};
  const failure = { active: "fail", partial: "warn", optional: "manual", missing: "manual", disabled: "manual" };
  for (const entry of catalog.entries || []) {
    const decision = decisions.decisions?.[entry.id]?.action;
    const activation = baseline[entry.id];
    if (!decision) throw new Error("Missing decision for tool: " + entry.id);
    if (!activation) throw new Error("Missing activation baseline for tool: " + entry.id);
    entry.decision = decision;
    entry.activation = activation;
    entry.failure_policy = failure[activation] || "manual";
  }
  writeJson("tools/toolchain/tool-catalog.v5.json", catalog);
}

function updateIndexAuthority() {
  const before = [
    "Canonical sources:",
    "",
    "- `AGENTS.md`",
    "- `governance/skills/skills-registry.json`",
    "- `governance/tools/agent-tool-registry.json`",
  ].join(NL);
  const after = [
    "Routing inputs:",
    "",
    "- `AGENTS.md` — canonical repository-agent execution policy.",
    "- `governance/skills/skills-registry.json` — machine-readable governed skill lifecycle contract.",
    "- `governance/tools/agent-tool-registry.json` — derived conditional tool-routing inventory; it owns no authority.",
  ].join(NL);
  replaceOnce(".agents/INDEX.md", before, after);
}

function updatePackageScripts() {
  const pkg = readJson("package.json");
  pkg.scripts ||= {};
  Object.assign(pkg.scripts, {
    "guard:adapter-trigger-coverage": "node tools/guards/adapter-trigger-coverage-gate.mjs",
    "verify:github-ci-sha": "node tools/scripts/verify-github-ci-for-sha.mjs",
    "guard:ai-toolchain-environment": "node tools/guards/ai-toolchain-environment-gate.mjs",
    "guard:agent-system-all": "pnpm run guard:governance-schema && pnpm run guard:document-authority-conflicts && pnpm run guard:agent-governance && pnpm run guard:adapter-trigger-coverage && pnpm run guard:tool-catalog-coverage && pnpm run guard:toolchain-activation && pnpm run guard:oss-toolchain-policy && pnpm run guard:guard-registry && pnpm run guard:required-command-integrity",
    "guard:agent-system-closure": "pnpm run guard:agent-system-all && pnpm run guard:same-commit-evidence && pnpm run guard:workflow-lint && pnpm run guard:workflow-security && pnpm run guard:actions-pin",
    "guard:markdown-governance": "node tools/scripts/run-affected-markdownlint.mjs",
    "guard:markdown-governance:full": "pnpm exec markdownlint-cli2 \"governance/**/*.md\" \"AGENTS.md\" \"CLAUDE.md\" \"GEMINI.md\" \"LEAN-CTX.md\" \".agents/**/*.md\" \".github/**/*.md\"",
    "guard:governance-all": "pnpm run guard:agent-system-all && pnpm run guard:authority-separation && pnpm run guard:sdlc && pnpm run guard:cleanup-policy && pnpm run guard:markdown-governance",
  });
  writeJson("package.json", pkg);
}

function updateGuardContracts() {
  const manifest = readJson("tools/guards/guard-manifest.json");
  manifest.guardSets ||= {};
  manifest.guardSets.agentSystem = [
    "governance-schema",
    "document-authority-conflicts",
    "agent-governance",
    "adapter-trigger-coverage",
    "tool-catalog-coverage",
    "toolchain-activation",
    "oss-toolchain-policy",
    "guard-registry",
    "required-command-integrity",
  ];
  writeJson("tools/guards/guard-manifest.json", manifest);

  const registry = readJson("governance/guards/guard-registry.json");
  addOrUpdateGuard(registry, {
    id: "adapter-trigger-coverage",
    name: "Agent Adapter Trigger Coverage Gate",
    script: "guard:adapter-trigger-coverage",
    exit_level: "fail",
    description: "Verifies every governed adapter and tool configuration path triggers contextual governance CI and is classified as governance input.",
    source_file: "tools/guards/adapter-trigger-coverage-gate.mjs",
  });
  addOrUpdateGuard(registry, {
    id: "same-commit-evidence",
    name: "Local Evidence SHA Gate",
    script: "guard:same-commit-evidence",
    exit_level: "fail",
    description: "Validates explicit local evidence manifests against clean HEAD. GitHub CI completion is verified separately by verify:github-ci-sha and enforced by the live ruleset.",
    source_file: "tools/guards/same-commit-evidence-gate.mjs",
  });
  addOrUpdateGuard(registry, {
    id: "ai-toolchain-environment",
    name: "AI Toolchain Environment Gate",
    script: "guard:ai-toolchain-environment",
    exit_level: "fail",
    description: "Reports executable-level readiness for optional agent tools and fails only when an optional tool is explicitly required.",
    source_file: "tools/guards/ai-toolchain-environment-gate.mjs",
  });
  writeJson("governance/guards/guard-registry.json", registry);
}

const adapterTriggerGuard = String.raw`import fs from "node:fs";
import path from "node:path";
import { classifyFiles } from "../scripts/detect-ci-context.mjs";
import { fail, repoRoot } from "./_guard-utils.mjs";

const violations = [];
const ciPath = path.join(repoRoot, ".github/workflows/ci.yml");
const ci = fs.existsSync(ciPath) ? fs.readFileSync(ciPath, "utf8") : "";
const governed = ["AGENTS.md", "CLAUDE.md", "GEMINI.md", "LEAN-CTX.md", "opencode.json", ".lean-ctx.toml", ".graphifyignore", ".opencodereview/rule.json", ".github/copilot-instructions.md"];
for (const file of governed) {
  if (!classifyFiles([file]).governance_policy) violations.push({ file: "tools/scripts/detect-ci-context.mjs", line: 0, message: "ADAPTER_NOT_GOVERNANCE " + file });
}
const markers = ['"AGENTS.md"', '"CLAUDE.md"', '"GEMINI.md"', '"LEAN-CTX.md"', '"opencode.json"', '".lean-ctx.toml"', '".graphifyignore"', '".opencodereview/**"'];
for (const marker of markers) {
  const count = ci.split(marker).length - 1;
  if (count < 2) violations.push({ file: ".github/workflows/ci.yml", line: 0, message: "PATH_NOT_COVERED_BY_PUSH_AND_PR " + marker });
}
fail("adapter-trigger-coverage-gate", violations);`;

const affectedMarkdown = String.raw`import { execFileSync, spawnSync } from "node:child_process";
function git(args) { return execFileSync("git", args, { encoding: "utf8" }).trim(); }
const base = String(process.env.CI_BASE_SHA || "").trim();
const head = String(process.env.CI_HEAD_SHA || "").trim() || "HEAD";
const validBase = base && !/^0+$/.test(base) && base !== head;
const committed = validBase ? git(["diff", "--name-only", "--diff-filter=ACMRTUXB", base, head, "--"]) : git(["diff", "--name-only", "--diff-filter=ACMRTUXB", "HEAD~1", "HEAD", "--"]);
const working = git(["diff", "--name-only", "--diff-filter=ACMRTUXB", "--"]);
const staged = git(["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB", "--"]);
const files = [...new Set([committed, working, staged].join(String.fromCharCode(10)).split(/\r?\n/).map((v) => v.trim()).filter(Boolean))].filter((file) => file.endsWith(".md") && (file === "AGENTS.md" || file === "CLAUDE.md" || file === "GEMINI.md" || file === "LEAN-CTX.md" || file.startsWith("governance/") || file.startsWith(".agents/") || file.startsWith(".github/")));
if (files.length === 0) { console.log("affected markdown: no governed markdown files changed"); process.exit(0); }
const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(executable, ["exec", "markdownlint-cli2", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);`;

const aiEnvironmentGuard = String.raw`import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";
const violations = [];
const registry = JSON.parse(fs.readFileSync(path.join(repoRoot, "governance/tools/agent-tool-registry.json"), "utf8"));
const required = new Set(String(process.env.BTHWANI_REQUIRED_AI_TOOLS || "").split(",").map((v) => v.trim()).filter(Boolean));
const commands = { graphify: ["graphify"], leanctx: ["lean-ctx", "lean-ctx.exe", "lean-ctx.cmd"], "open-code-review": ["ocr", "ocr.exe", "ocr.cmd"] };
function probe(candidates) {
  for (const executable of candidates) {
    try {
      const output = execFileSync(executable, ["--version"], { encoding: "utf8", timeout: 10000, windowsHide: true }).trim();
      return { state: "VERIFIED_AVAILABLE", executable, version: output.split(/\r?\n/)[0] || "unknown" };
    } catch {}
  }
  return { state: "VERIFIED_UNAVAILABLE" };
}
const report = { schemaVersion: 2, required: [...required].sort(), tools: {} };
for (const tool of registry.entries || []) {
  const status = probe(commands[tool.id] || [tool.id]);
  report.tools[tool.id] = status;
  if (required.has(tool.id) && status.state !== "VERIFIED_AVAILABLE") violations.push({ file: "environment", line: 0, message: "REQUIRED_AI_TOOL_UNAVAILABLE " + tool.id });
}
for (const core of ["node", "pnpm"]) {
  const status = probe(process.platform === "win32" ? [core + ".exe", core + ".cmd", core] : [core]);
  report.tools[core] = status;
  if (status.state !== "VERIFIED_AVAILABLE") violations.push({ file: "environment", line: 0, message: "REQUIRED_CORE_TOOL_UNAVAILABLE " + core });
}
console.log(JSON.stringify(report, null, 2));
fail("ai-toolchain-environment-gate", violations);`;

const localEvidenceGuard = String.raw`import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fail, repoRoot } from "./_guard-utils.mjs";
const violations = [];
function git(args) { return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim(); }
function collect(root, found = []) {
  if (!fs.existsSync(root)) return found;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) collect(full, found);
    else if (entry.name === "manifest.json") found.push(full);
  }
  return found;
}
let head = "";
try { head = git(["rev-parse", "HEAD"]); } catch { violations.push({ file: ".git", line: 0, message: "HEAD_SHA_UNRESOLVED" }); }
const files = [...collect(path.join(repoRoot, ".diagnostics")), ...collect(path.join(repoRoot, ".artifacts", "diagnostics"))];
if (files.length === 0) console.log("local evidence sha: no explicit manifest.json files present");
else {
  if (git(["status", "--porcelain=v1", "--untracked-files=all"])) violations.push({ file: "worktree", line: 0, message: "WORKTREE_DIRTY_LOCAL_EVIDENCE_INVALID" });
  for (const file of files) {
    const relative = path.relative(repoRoot, file).replaceAll("\\", "/");
    let value;
    try { value = JSON.parse(fs.readFileSync(file, "utf8")); } catch (error) { violations.push({ file: relative, line: 0, message: "INVALID_JSON " + error.message }); continue; }
    const sourceSha = value.sourceSha || value.sha || value.commit;
    if (!sourceSha) violations.push({ file: relative, line: 0, message: "MANIFEST_MISSING_SOURCE_SHA" });
    else if (sourceSha !== head) violations.push({ file: relative, line: 0, message: "LOCAL_EVIDENCE_NOT_ON_HEAD manifest=" + sourceSha + " head=" + head });
  }
}
fail("same-commit-evidence-gate", violations);`;

const githubCiVerifier = String.raw`import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
const { values } = parseArgs({ options: { repo: { type: "string", default: "bthwani2-boop/bthwani-suite-next" }, sha: { type: "string" }, check: { type: "string", default: "BThwani CI result" }, wait: { type: "boolean", default: false }, "timeout-minutes": { type: "string", default: "45" } } });
function git(args) { return execFileSync("git", args, { encoding: "utf8" }).trim(); }
function gh(args) { return JSON.parse(execFileSync("gh", args, { encoding: "utf8" })); }
const sha = values.sha || git(["rev-parse", "HEAD"]);
const deadline = Date.now() + Number(values["timeout-minutes"]) * 60000;
while (true) {
  const result = gh(["api", "repos/" + values.repo + "/commits/" + sha + "/check-runs", "-H", "Accept: application/vnd.github+json"]);
  const matches = (result.check_runs || []).filter((run) => run.name === values.check);
  const success = matches.find((run) => run.status === "completed" && run.conclusion === "success");
  if (success) { console.log(JSON.stringify({ decision: "PASS", sha, check: values.check, runId: success.id }, null, 2)); process.exit(0); }
  const failed = matches.find((run) => run.status === "completed" && run.conclusion !== "success");
  if (failed) { console.error(JSON.stringify({ decision: "FIX_REQUIRED", sha, check: values.check, runId: failed.id, conclusion: failed.conclusion }, null, 2)); process.exit(1); }
  if (!values.wait || Date.now() >= deadline) { console.error(JSON.stringify({ decision: "NEEDS_EVIDENCE", sha, check: values.check, observedRuns: matches }, null, 2)); process.exit(2); }
  await new Promise((resolve) => setTimeout(resolve, 15000));
}`;

const toolCatalogGuard = String.raw`import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";
const violations = [];
function readJson(relative) { try { return JSON.parse(fs.readFileSync(path.join(repoRoot, relative), "utf8")); } catch (error) { violations.push({ file: relative, line: 0, message: "INVALID_OR_MISSING_JSON " + error.message }); return {}; } }
const catalog = readJson("tools/toolchain/tool-catalog.v5.json");
const expected = readJson("tools/toolchain/expected-tool-ids.v5.json");
const decisions = readJson("tools/toolchain/tool-decisions.json");
const owners = readJson("tools/toolchain/tool-owners.json");
const baseline = readJson("tools/toolchain/tool-activation-baseline.json");
const agentRegistry = readJson("governance/tools/agent-tool-registry.json");
const pkg = readJson("package.json");
const requiredKeys = ["id", "category", "priority", "oss_free", "decision", "activation", "failure_policy"];
const expectedFailure = { active: "fail", partial: "warn", optional: "manual", missing: "manual", disabled: "manual" };
const seen = new Set();
for (const [id, decision] of Object.entries(decisions.decisions || {})) {
  if (!decision.action || typeof decision.action !== "string") violations.push({ file: "tools/toolchain/tool-decisions.json", line: 0, message: "INVALID_DECISION_ACTION " + id });
  if (Object.hasOwn(decision, "decision")) violations.push({ file: "tools/toolchain/tool-decisions.json", line: 0, message: "LEGACY_DECISION_FIELD " + id });
}
for (const entry of catalog.entries || []) {
  if (!entry.id) { violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: "MISSING_ID" }); continue; }
  if (seen.has(entry.id)) violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: "DUPLICATE_TOOL_ID " + entry.id });
  seen.add(entry.id);
  for (const key of requiredKeys) if (entry[key] === undefined) violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: "MISSING_PROPERTY " + entry.id + "." + key });
  const sourceDecision = decisions.decisions?.[entry.id]?.action;
  const sourceActivation = baseline.baseline?.[entry.id];
  if (!sourceDecision || entry.decision !== sourceDecision) violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: "DECISION_PROJECTION_DRIFT " + entry.id });
  if (!sourceActivation || entry.activation !== sourceActivation) violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: "ACTIVATION_PROJECTION_DRIFT " + entry.id });
  if (sourceActivation && entry.failure_policy !== expectedFailure[sourceActivation]) violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: "FAILURE_POLICY_DRIFT " + entry.id });
  if (!owners.owners?.[entry.id]) violations.push({ file: "tools/toolchain/tool-owners.json", line: 0, message: "MISSING_OWNER " + entry.id });
}
for (const id of expected.expected_tools || []) if (!seen.has(id)) violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: "EXPECTED_TOOL_MISSING " + id });
for (const id of seen) if (!(expected.expected_tools || []).includes(id)) violations.push({ file: "tools/toolchain/expected-tool-ids.v5.json", line: 0, message: "UNEXPECTED_TOOL " + id });
const agentIds = new Set((agentRegistry.entries || []).map((entry) => entry.id));
for (const id of agentIds) if (!seen.has(id)) violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: "AGENT_TOOL_MISSING " + id });
const prefixes = { graphify: "graphify", leanctx: "leanctx", ocr: "open-code-review" };
for (const script of Object.keys(pkg.scripts || {})) for (const [prefix, id] of Object.entries(prefixes)) if ((script === prefix || script.startsWith(prefix + ":")) && !agentIds.has(id)) violations.push({ file: "package.json", line: 0, message: "UNREGISTERED_AGENT_TOOL_COMMAND " + script });
fail("tool-catalog-coverage-gate", violations);`;

const safeRulesetApplier = String.raw`import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";
const { values } = parseArgs({ options: { "ruleset-id": { type: "string" }, payload: { type: "string" }, apply: { type: "boolean", default: false }, repo: { type: "string", default: "bthwani2-boop/bthwani-suite-next" } } });
if (!values["ruleset-id"] || !values.payload) { console.error("Usage: node apply-repository-ruleset.mjs --ruleset-id <id> --payload <file> [--apply]"); process.exit(1); }
function gh(args) { return JSON.parse(execFileSync("gh", args, { encoding: "utf8" })); }
function project(actual, template) {
  if (Array.isArray(template)) return template.map((item, index) => project(actual?.[index], item));
  if (template && typeof template === "object") return Object.fromEntries(Object.keys(template).map((key) => [key, project(actual?.[key], template[key])]));
  return actual;
}
const endpoint = "repos/" + values.repo + "/rulesets/" + values["ruleset-id"];
const live = gh(["api", endpoint]);
const desired = JSON.parse(fs.readFileSync(values.payload, "utf8"));
const observed = project(live, desired);
const same = JSON.stringify(observed) === JSON.stringify(desired);
console.log(JSON.stringify({ mode: values.apply ? "apply" : "plan", same, observed, desired }, null, 2));
if (same) process.exit(0);
if (!values.apply) process.exit(2);
const backupDir = path.join(".artifacts", "rulesets");
fs.mkdirSync(backupDir, { recursive: true });
const backup = path.join(backupDir, "ruleset-" + values["ruleset-id"] + "-before-" + Date.now() + ".json");
fs.writeFileSync(backup, JSON.stringify(live, null, 2) + String.fromCharCode(10));
execFileSync("gh", ["api", "-X", "PUT", endpoint, "--input", values.payload], { stdio: "inherit" });
const after = project(gh(["api", endpoint]), desired);
if (JSON.stringify(after) !== JSON.stringify(desired)) { console.error(JSON.stringify({ decision: "FAILED_VERIFICATION", backup, after, desired }, null, 2)); process.exit(1); }
console.log(JSON.stringify({ decision: "PASS", backup, applied: after }, null, 2));`;

const verifyAiToolchainPs1 = String.raw`[CmdletBinding()]
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
  } finally { Remove-Item Env:BTHWANI_REQUIRED_AI_TOOLS -ErrorAction SilentlyContinue }
  if ($startHead -ne (& git rev-parse HEAD).Trim()) { throw "HEAD changed during verification." }
  if ($startStatus -ne (& git status --porcelain=v1 --untracked-files=all | Out-String)) { throw "Working tree changed during verification." }
  Write-Output "verified_sha=$startHead"
  Write-Output "decision=PASS"
} finally { Pop-Location }`;

const graphifyWrapperPs1 = String.raw`[CmdletBinding()]
param([ValidateSet("Verify", "Repair", "Full")][string]$Mode = "Verify")
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
  & git check-ignore -q graphify-out/graph.json
  if ($LASTEXITCODE -ne 0) { throw "graphify-out is not ignored by Git." }
  if ($Mode -in @("Repair", "Full")) {
    & $command.Source extract . --code-only --force
    if ($LASTEXITCODE -ne 0) { throw "Graphify extraction failed." }
    New-Item -ItemType Directory -Path "graphify-out" -Force | Out-Null
    [ordered]@{ schemaVersion = 1; sourceSha = $head; generatedAt = (Get-Date).ToUniversalTime().ToString("o"); coverage = "APPLICATION_CODE_GRAPH"; graphifyVersion = $version } | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $stampPath -Encoding utf8NoBOM
  }
  if (-not (Test-Path -LiteralPath "graphify-out/graph.json" -PathType Leaf)) { throw "Graphify output missing. Rebuild it." }
  if (-not (Test-Path -LiteralPath $stampPath -PathType Leaf)) { throw "Graphify source stamp missing. Rebuild it." }
  $stamp = Get-Content -LiteralPath $stampPath -Raw | ConvertFrom-Json
  if ([string]$stamp.sourceSha -ne $head) { throw "Graphify graph is stale. graph=$($stamp.sourceSha) head=$head" }
  Write-Output "graph_source_sha=$head"
  Write-Output "decision=PASS"
} finally { Pop-Location }`;

function writeGeneratedFiles() {
  const files = {
    "tools/guards/adapter-trigger-coverage-gate.mjs": adapterTriggerGuard,
    "tools/scripts/run-affected-markdownlint.mjs": affectedMarkdown,
    "tools/guards/ai-toolchain-environment-gate.mjs": aiEnvironmentGuard,
    "tools/scripts/verify-ai-toolchain.ps1": verifyAiToolchainPs1,
    "tools/scripts/invoke-graphify-toolchain.ps1": graphifyWrapperPs1,
    "tools/guards/same-commit-evidence-gate.mjs": localEvidenceGuard,
    "tools/scripts/verify-github-ci-for-sha.mjs": githubCiVerifier,
    "tools/guards/tool-catalog-coverage-gate.mjs": toolCatalogGuard,
    "tools/scripts/apply-repository-ruleset.mjs": safeRulesetApplier,
  };
  for (const [relative, content] of Object.entries(files)) write(relative, content);
}

function updateGuardRegistryGate() {
  let content = read("tools/guards/guard-registry-gate.mjs");
  for (const script of ["guard:agent-system-all", "guard:agent-system-closure", "guard:markdown-governance:full"]) {
    const marker = '  "' + script + '",';
    if (!content.includes(marker)) {
      const anchor = '  "guard:governance-all",';
      if (!content.includes(anchor)) throw new Error("Aggregate script anchor missing");
      content = content.replace(anchor, anchor + NL + marker);
    }
  }
  const before = "const manifestGuardIds = new Set([...(manifest?.guardSets?.foundation ?? []), ...(manifest?.guardSets?.journey ?? []), ...(manifest?.guardSets?.governance ?? [])]);";
  const after = "const manifestGuardIds = new Set(Object.values(manifest?.guardSets ?? {}).flatMap((value) => Array.isArray(value) ? value : []));";
  if (content.includes(before)) content = content.replace(before, after);
  else if (!content.includes(after)) throw new Error("Manifest guard-set aggregation changed unexpectedly");
  write("tools/guards/guard-registry-gate.mjs", content);
}

function updateDocumentAuthorityGuard() {
  let content = read("tools/guards/document-authority-conflicts-gate.mjs");
  const marker = "INDEX_MUST_NOT_PROMOTE_DERIVED_TOOL_REGISTRY";
  if (!content.includes(marker)) {
    const anchor = "// LeanCTX text conflict checks";
    if (!content.includes(anchor)) throw new Error("Document authority guard anchor missing");
    const addition = [
      'if (/Canonical sources:[\\s\\S]*?governance\\/tools\\/agent-tool-registry\\.json/i.test(index)) {',
      '  violations.push({ file: ".agents/INDEX.md", line: 0, message: "INDEX_MUST_NOT_PROMOTE_DERIVED_TOOL_REGISTRY" });',
      '}',
      "",
    ].join(NL);
    content = content.replace(anchor, addition + anchor);
  }
  write("tools/guards/document-authority-conflicts-gate.mjs", content);
}

function updateCiRouting() {
  let ci = read(".github/workflows/ci.yml");
  const additions = ['      - "CLAUDE.md"', '      - "LEAN-CTX.md"', '      - "opencode.json"', '      - ".lean-ctx.toml"', '      - ".graphifyignore"', '      - ".opencodereview/**"'];
  for (const addition of additions) {
    const count = ci.split(addition).length - 1;
    if (count >= 2) continue;
    const anchor = '      - "GEMINI.md"';
    const parts = ci.split(anchor);
    if (parts.length !== 3) throw new Error("Expected two GEMINI.md CI path anchors");
    ci = parts[0] + anchor + NL + addition + parts[1] + anchor + NL + addition + parts[2];
  }
  write(".github/workflows/ci.yml", ci);

  const routerPath = "tools/scripts/detect-ci-context.mjs";
  let router = read(routerPath);
  const before = '  const governance = full || mobileTooling || equals("AGENTS.md", "GEMINI.md") || starts(".agents/", "governance/") || has((file) =>';
  const after = '  const governance = full || mobileTooling || equals("AGENTS.md", "CLAUDE.md", "GEMINI.md", "LEAN-CTX.md", "opencode.json", ".lean-ctx.toml", ".graphifyignore") || starts(".agents/", ".opencodereview/", "governance/") || has((file) =>';
  if (router.includes(before)) router = router.replace(before, after);
  else if (!router.includes(after)) throw new Error("CI context governance expression changed unexpectedly");
  write(routerPath, router);

  const testPath = "tools/scripts/detect-ci-context.test.mjs";
  let tests = read(testPath);
  if (!tests.includes('test("agent adapters and tool configs route through governance policy"')) {
    tests += NL + [
      'test("agent adapters and tool configs route through governance policy", () => {',
      '  for (const file of ["CLAUDE.md", "LEAN-CTX.md", "opencode.json", ".lean-ctx.toml", ".graphifyignore", ".opencodereview/rule.json", ".github/copilot-instructions.md"]) {',
      '    assert.equal(classifyFiles([file]).governance_policy, true, file);',
      '  }',
      '});',
    ].join(NL);
  }
  write(testPath, tests);
}

function updateCiPolicy() {
  let content = read(".github/workflows/ci-policy.yml");
  if (content.includes("Verify agent adapter CI routing")) return;
  const anchor = [
    "      - name: Verify agent governance",
    "        if: ${{ inputs.governance_policy == 'true' }}",
    "        run: pnpm run guard:agent-governance",
  ].join(NL);
  if (!content.includes(anchor)) throw new Error("CI policy agent-governance anchor missing");
  const addition = [
    "",
    "      - name: Verify document authority projections",
    "        if: ${{ inputs.governance_policy == 'true' }}",
    "        run: pnpm run guard:document-authority-conflicts",
    "",
    "      - name: Verify agent adapter CI routing",
    "        if: ${{ inputs.governance_policy == 'true' }}",
    "        run: pnpm run guard:adapter-trigger-coverage",
    "",
    "      - name: Verify tool catalog projections",
    "        if: ${{ inputs.governance_policy == 'true' }}",
    "        run: pnpm run guard:tool-catalog-coverage",
    "",
    "      - name: Verify tool activation projections",
    "        if: ${{ inputs.governance_policy == 'true' }}",
    "        run: pnpm run guard:toolchain-activation",
    "",
    "      - name: Verify OSS tool policy",
    "        if: ${{ inputs.governance_policy == 'true' }}",
    "        run: pnpm run guard:oss-toolchain-policy",
  ].join(NL);
  content = content.replace(anchor, anchor + addition);
  write(".github/workflows/ci-policy.yml", content);
}

function updateRepositoryEnforcement() {
  const projection = readJson("governance/github/repository-enforcement.json");
  projection.observedAt = null;
  projection.intendedRulesetFile = "governance/github/master-protection.ruleset.json";
  projection.liveRulesetId = Number(values["ruleset-id"]);
  projection.requiredCheckNames = [requiredCheck];
  projection.requiredPullRequestPolicy ||= {};
  projection.requiredPullRequestPolicy.requireLastPushApprovalByDifferentActor = false;
  projection.requiredPullRequestPolicy.requireLinearHistory = true;
  projection.observed ||= {};
  projection.observed.branchProtectionState = "REQUIRES_LIVE_VERIFICATION";
  projection.observed.requiredChecksState = "REQUIRES_LIVE_VERIFICATION";
  projection.observed.sameCommitWorkflowRunsState = "REQUIRES_LIVE_VERIFICATION";
  projection.decision = "NEEDS_LIVE_VERIFICATION";
  writeJson("governance/github/repository-enforcement.json", projection);
}

function applyRepairs() {
  updateOpenCode();
  updateToolAuthority();
  updateIndexAuthority();
  updatePackageScripts();
  updateGuardContracts();
  writeGeneratedFiles();
  updateGuardRegistryGate();
  updateDocumentAuthorityGuard();
  updateCiRouting();
  updateCiPolicy();
  updateRepositoryEnforcement();
}

function focusedVerification() {
  command("node", ["--test", "tools/scripts/detect-ci-context.test.mjs"], { capture: false });
  command(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["run", "guard:agent-system-all"], { capture: false });
  git(["diff", "--check"], { capture: false });
  if (values.full) command(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["run", "guard:agent-system-closure"], { capture: false });
}

function commitAndPush() {
  const status = git(["status", "--porcelain=v1", "--untracked-files=all"]).stdout;
  if (!status) { notes.push("No changes remained to commit."); return git(["rev-parse", "HEAD"]).stdout; }
  git(["fetch", "--prune", "origin", values.branch], { capture: false });
  const remote = git(["rev-parse", "origin/" + values.branch]).stdout;
  if (remote !== initialRemoteHead) throw new Error("Remote branch moved during remediation. Refusing stale-SHA push.");
  git(["add", "--", ...[...changes].sort()], { capture: false });
  git(["commit", "-m", "fix(agent-system): converge fast accurate governed execution"], { capture: false });
  const head = git(["rev-parse", "HEAD"]).stdout;
  git(["push", "origin", "HEAD:refs/heads/" + values.branch], { capture: false });
  git(["fetch", "origin", values.branch], { capture: false });
  if (git(["rev-parse", "origin/" + values.branch]).stdout !== head) throw new Error("Remote head mismatch after push");
  notes.push("Pushed " + head + " to origin/" + values.branch);
  return head;
}

function waitForCi(head) {
  command("gh", ["--version"]);
  command("node", ["tools/scripts/verify-github-ci-for-sha.mjs", "--repo", repository, "--sha", head, "--check", requiredCheck, "--wait", "--timeout-minutes", values["ci-timeout-minutes"]], { capture: false });
}

function applyLiveRuleset() {
  command("gh", ["--version"]);
  command("node", ["tools/scripts/apply-repository-ruleset.mjs", "--ruleset-id", values["ruleset-id"], "--payload", "governance/github/master-protection.ruleset.json", "--repo", repository, "--apply"], { capture: false });
}

assertRepositoryState();
applyRepairs();

if (mode === "plan") {
  console.log(JSON.stringify({ mode: "PLAN", branch: values.branch, sourceSha: initialHead, plannedChanges: [...changes].sort(), decision: changes.size ? "FIX_REQUIRED" : "PASS" }, null, 2));
  process.exit(0);
}

if (mode === "verify") {
  if (changes.size) {
    console.error(JSON.stringify({ mode: "VERIFY", decision: "FIX_REQUIRED", drift: [...changes].sort() }, null, 2));
    process.exit(1);
  }
  focusedVerification();
  console.log(JSON.stringify({ mode: "VERIFY", verifiedSha: initialHead, decision: "PASS" }, null, 2));
  process.exit(0);
}

focusedVerification();
let finalHead = git(["rev-parse", "HEAD"]).stdout;
if (values["commit-push"]) finalHead = commitAndPush();
if (values["wait-ci"]) {
  if (!values["commit-push"]) throw new Error("--wait-ci requires --commit-push");
  waitForCi(finalHead);
}
if (values["apply-live-ruleset"]) {
  if (!values["commit-push"]) throw new Error("--apply-live-ruleset requires --commit-push");
  applyLiveRuleset();
}
console.log(JSON.stringify({ mode: "APPLY", branch: values.branch, sourceSha: initialHead, finalHead, changedPaths: [...changes].sort(), notes, decision: "PASS" }, null, 2));
