#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import {
  buildEvidenceEnvelope,
  buildUnifiedRootGraph,
  summarizeEvidenceConsumption,
} from "./lib/evidence-envelope.mjs";

const SCRIPT_VERSION = "1";
const CANONICAL_CHANGE_CONTEXT = "BThwani / Change Verification";
const CANONICAL_CLOSURE_CONTEXT = "BThwani / Change Closure";
const LEGACY_CHANGE_CONTEXT = "BThwani CI / PR result";
const LEGACY_CLOSURE_CONTEXT = "BThwani / Final Closure";

function usage(exitCode = 0) {
  const text = `BThwani root-closure campaign runner (non-authoritative)

Usage:
  node tools/scripts/run-root-closure-campaign.mjs [options]

Options:
  --mode <audit|verify|remote-change|remote-closure|all>
  --expected-branch <name>     Require an exact existing branch (e.g. imp).
  --base-ref <ref>             Expected canonical base branch/ref (default: GitHub default branch).
  --allow-dirty                Allow local audit/verify with uncommitted changes. Remote modes still refuse dirty trees.
  --include-discovery          Run pnpm assurance:discover.
  --include-diagnostics        Run Knip, jscpd and Madge diagnostics.
  --command <shell command>    Add an independently executable command. Repeatable.
  --command-file <path>        Add commands from UTF-8 text file; one command per line, # comments allowed.
  --evidence-dir <path>        Override ephemeral evidence output directory.
  --require-repository-baseline
                               Treat latest default-branch repository baseline as a required current claim.
  --help

Examples:
  node tools/scripts/run-root-closure-campaign.mjs --mode audit --expected-branch imp
  node tools/scripts/run-root-closure-campaign.mjs --mode verify --expected-branch imp --include-discovery
  node tools/scripts/run-root-closure-campaign.mjs --mode verify --command "pnpm run guard:api-binding"
  node tools/scripts/run-root-closure-campaign.mjs --mode remote-change --expected-branch imp

Semantics:
  * This script orchestrates existing evidence; it is not Product/System truth and cannot declare Repository Closure.
  * It collects all independently executable failures before returning a final non-zero exit code.
  * Remote CodeQL/Sonar/Semgrep remain owned by the trusted GitHub workflows.
  * A PASS means only that the claims actually executed by this invocation passed.
`;
  process.stdout.write(text);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const options = {
    mode: "audit",
    expectedBranch: "",
    baseRef: "",
    allowDirty: false,
    includeDiscovery: false,
    includeDiagnostics: false,
    commands: [],
    commandFiles: [],
    evidenceDir: "",
    requireRepositoryBaseline: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length || argv[i].startsWith("--")) {
        throw new Error(`${arg} requires a value`);
      }
      return argv[i];
    };
    switch (arg) {
      case "--mode": options.mode = next(); break;
      case "--expected-branch": options.expectedBranch = next(); break;
      case "--base-ref": options.baseRef = next(); break;
      case "--allow-dirty": options.allowDirty = true; break;
      case "--include-discovery": options.includeDiscovery = true; break;
      case "--include-diagnostics": options.includeDiagnostics = true; break;
      case "--command": options.commands.push(next()); break;
      case "--command-file": options.commandFiles.push(next()); break;
      case "--evidence-dir": options.evidenceDir = next(); break;
      case "--require-repository-baseline": options.requireRepositoryBaseline = true; break;
      case "--help":
      case "-h": usage(0); break;
      default: throw new Error(`unknown argument: ${arg}`);
    }
  }
  const modes = new Set(["audit", "verify", "remote-change", "remote-closure", "all"]);
  if (!modes.has(options.mode)) throw new Error(`invalid --mode ${options.mode}`);
  return options;
}

function run(executable, args = [], { cwd, allowFailure = false } = {}) {
  const result = spawnSync(executable, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GH_FORCE_TTY: "0", NO_COLOR: "1" },
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  const code = Number.isInteger(result.status) ? result.status : 1;
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  if (!allowFailure && code !== 0) {
    const message = [stderr.trim(), stdout.trim()].filter(Boolean).join("\n");
    throw new Error(`${executable} ${args.join(" ")} failed (${code})${message ? `\n${message}` : ""}`);
  }
  return { code, stdout, stderr };
}

function git(args, cwd, allowFailure = false) { return run("git", args, { cwd, allowFailure }); }
function gh(args, cwd, allowFailure = false) { return run("gh", args, { cwd, allowFailure }); }

function safeJson(text, label) {
  try { return JSON.parse(text); }
  catch (error) { throw new Error(`${label} did not return valid JSON: ${error.message}`); }
}

function sanitizeFileName(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "task";
}

function nowId() { return new Date().toISOString().replace(/[:.]/g, "-"); }

function loadAdditionalCommands(options, repoRoot) {
  const commands = [...options.commands];
  for (const file of options.commandFiles) {
    const full = isAbsolute(file) ? file : resolve(repoRoot, file);
    const source = readFileSync(full, "utf8");
    for (const raw of source.split(/\r?\n/u)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      commands.push(line);
    }
  }
  return commands;
}

function findHealthJobBlock(source) {
  const lines = source.split(/\r?\n/u);
  const start = lines.findIndex((line) => /^  health:\s*$/u.test(line));
  if (start < 0) return "";
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^  [a-zA-Z0-9_-]+:\s*$/u.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start, end).join("\n");
}

function makeProbe(name, status, detail, blocking = true, evidence = undefined) {
  return { name, status, blocking, detail, ...(evidence === undefined ? {} : { evidence }) };
}

function inspectLocalControlPlane(repoRoot) {
  const probes = [];
  const ciPath = join(repoRoot, ".github", "workflows", "ci-check.yml");
  const closurePath = join(repoRoot, ".github", "workflows", "final-closure.yml");
  const baselinePath = join(repoRoot, ".github", "workflows", "repository-baseline.yml");
  const migrationInvokerPath = join(repoRoot, "tools", "scripts", "invoke-service-migrations.ps1");
  const migrationRunnerPath = join(repoRoot, "infra", "docker", "scripts", "schema-migration-runner.ps1");

  for (const required of [ciPath, closurePath, baselinePath, migrationInvokerPath, migrationRunnerPath]) {
    if (!existsSync(required)) probes.push(makeProbe(`required-file:${required.replace(`${repoRoot}/`, "")}`, "FAIL", "required control-plane/source file is missing"));
  }
  if (probes.some((probe) => probe.status === "FAIL")) return probes;

  const ci = readFileSync(ciPath, "utf8");
  const closure = readFileSync(closurePath, "utf8");
  const baseline = readFileSync(baselinePath, "utf8");
  const migrationInvoker = readFileSync(migrationInvokerPath, "utf8");
  const migrationRunner = readFileSync(migrationRunnerPath, "utf8");

  probes.push(ci.includes(CANONICAL_CHANGE_CONTEXT)
    ? makeProbe("workflow-change-context", "PASS", `CI publishes ${CANONICAL_CHANGE_CONTEXT}`)
    : makeProbe("workflow-change-context", "FAIL", `CI does not publish ${CANONICAL_CHANGE_CONTEXT}`));
  probes.push(closure.includes(CANONICAL_CLOSURE_CONTEXT)
    ? makeProbe("workflow-closure-context", "PASS", `closure publishes ${CANONICAL_CLOSURE_CONTEXT}`)
    : makeProbe("workflow-closure-context", "FAIL", `closure does not publish ${CANONICAL_CLOSURE_CONTEXT}`));

  const healthBlock = findHealthJobBlock(baseline);
  const hasHealthToken = /\n\s{4}env:\s*\n(?:\s{6}[^\n]*\n)*\s{6}GH_TOKEN:\s*\$\{\{\s*github\.token\s*\}\}/u.test(`\n${healthBlock}\n`);
  probes.push(hasHealthToken
    ? makeProbe("repository-baseline-gh-token", "PASS", "Repository baseline job exposes GH_TOKEN to gh CLI")
    : makeProbe("repository-baseline-gh-token", "FAIL", "Repository baseline job invokes gh CLI without job-scoped GH_TOKEN; trusted evidence loading/publication cannot complete"));

  const narrowBaselineName = /BThwani\s+Static Repository Baseline/u.test(baseline)
    || /BThwani\s*\/\s*Static Repository Baseline/u.test(baseline)
    || /BThwani\s+Code Quality & Security Baseline/u.test(baseline);
  probes.push(narrowBaselineName
    ? makeProbe("repository-baseline-claim-name", "PASS", "baseline claim is bounded to static/quality/security evidence")
    : makeProbe("repository-baseline-claim-name", "FAIL", "Static Repository Baseline claim overstates CodeQL+Sonar+Semgrep coverage; narrow the claim before treating it as repository-wide health"));

  const timeoutInputsExist = /bthwani_lock_timeout_seconds/u.test(migrationInvoker)
    && /bthwani_statement_timeout_minutes/u.test(migrationInvoker);
  const lockTimeoutApplied = /\bSET\s+(?:LOCAL\s+)?lock_timeout\b/iu.test(migrationRunner);
  const statementTimeoutApplied = /\bSET\s+(?:LOCAL\s+)?statement_timeout\b/iu.test(migrationRunner);
  probes.push(timeoutInputsExist && lockTimeoutApplied && statementTimeoutApplied
    ? makeProbe("migration-timeouts-effective", "PASS", "configured migration lock/statement timeouts are consumed by PostgreSQL session SQL")
    : makeProbe("migration-timeouts-effective", "FAIL", `migration timeout inputs exist=${timeoutInputsExist}; SET lock_timeout=${lockTimeoutApplied}; SET statement_timeout=${statementTimeoutApplied}`));
  return probes;
}

function inspectRuleset(repoRoot, repository, defaultBranch) {
  const list = safeJson(gh(["api", "-H", "X-GitHub-Api-Version: 2022-11-28", `/repos/${repository}/rulesets`], repoRoot).stdout, "ruleset list");
  const details = [];
  for (const item of Array.isArray(list) ? list : []) {
    const detail = safeJson(gh(["api", "-H", "X-GitHub-Api-Version: 2022-11-28", `/repos/${repository}/rulesets/${item.id}`], repoRoot).stdout, `ruleset ${item.id}`);
    const includes = detail?.conditions?.ref_name?.include ?? [];
    if (includes.includes(`refs/heads/${defaultBranch}`)) details.push(detail);
  }
  if (details.length !== 1) return [makeProbe("master-ruleset-identity", "FAIL", `expected exactly one ruleset for refs/heads/${defaultBranch}, found ${details.length}`)];

  const ruleset = details[0];
  const probes = [];
  probes.push(ruleset.enforcement === "active"
    ? makeProbe("master-ruleset-active", "PASS", `${ruleset.name} enforcement=active`)
    : makeProbe("master-ruleset-active", "FAIL", `${ruleset.name} enforcement=${ruleset.enforcement}`));
  probes.push(Array.isArray(ruleset.bypass_actors) && ruleset.bypass_actors.length === 0 && ruleset.current_user_can_bypass === "never"
    ? makeProbe("master-ruleset-no-bypass", "PASS", "no bypass actors and current user cannot bypass")
    : makeProbe("master-ruleset-no-bypass", "FAIL", `bypassActors=${JSON.stringify(ruleset.bypass_actors ?? null)} currentUserCanBypass=${ruleset.current_user_can_bypass ?? "unknown"}`));

  const statusRule = (ruleset.rules ?? []).find((rule) => rule.type === "required_status_checks");
  const contexts = (statusRule?.parameters?.required_status_checks ?? []).map((entry) => entry.context).sort();
  const canonical = [CANONICAL_CHANGE_CONTEXT, CANONICAL_CLOSURE_CONTEXT].sort();
  const matches = JSON.stringify(contexts) === JSON.stringify(canonical);
  probes.push(matches
    ? makeProbe("required-status-contract", "PASS", `ruleset requires ${canonical.join(" + ")}`)
    : makeProbe("required-status-contract", "FAIL", `ruleset contexts=${contexts.join(" + ") || "none"}; canonical workflows publish ${canonical.join(" + ")}. Legacy contexts ${LEGACY_CHANGE_CONTEXT} / ${LEGACY_CLOSURE_CONTEXT} must not remain the mechanical contract after migration.`));
  return probes;
}

function latestRepositoryBaseline(repoRoot, repository, defaultBranch) {
  const query = `/repos/${repository}/actions/workflows/repository-baseline.yml/runs?branch=${encodeURIComponent(defaultBranch)}&per_page=1`;
  const payload = safeJson(gh(["api", "-H", "X-GitHub-Api-Version: 2022-11-28", query], repoRoot).stdout, "repository baseline runs");
  const run = payload?.workflow_runs?.[0];
  if (!run) return makeProbe("latest-repository-baseline", "NOT_COVERED", "no repository baseline run was found", false);
  const detail = `run=${run.id} sha=${run.head_sha} status=${run.status} conclusion=${run.conclusion ?? "null"}`;
  return run.status === "completed" && run.conclusion === "success"
    ? makeProbe("latest-repository-baseline", "PASS", detail, false, { runId: run.id, headSha: run.head_sha })
    : makeProbe("latest-repository-baseline", "FAIL", detail, false, { runId: run.id, headSha: run.head_sha });
}

function buildTasks(options, extraCommands) {
  const tasks = [];
  const add = (phase, name, command) => tasks.push({ phase, name, command });
  const audit = options.mode === "audit" || options.mode === "all";
  const verify = options.mode === "verify" || options.mode === "all";
  const remoteChange = options.mode === "remote-change" || options.mode === "all";
  const remoteClosure = options.mode === "remote-closure";

  if (audit) {
    add("audit", "assurance-self-test", "pnpm run assurance:self-test");
    add("audit", "source-integrity", "pnpm run guard:source-integrity");
    add("audit", "aggregate-ownership", "pnpm run guard:aggregate-ownership");
    add("audit", "service-workspace", "pnpm run guard:service-workspace");
    add("audit", "contract-registry-drift", "pnpm run guard:contract-registry-drift");
    add("audit", "migration-manifest-drift", "pnpm run guard:migration-manifest-drift");
    add("audit", "generated-client-provenance", "pnpm run guard:generated-client-provenance");
    add("audit", "api-binding", "pnpm run guard:api-binding");
    add("audit", "backend-api-binding", "pnpm run guard:backend-api-binding");
  }
  if (verify) {
    add("verify", "contracts-lint", "pnpm run contracts:lint");
    add("verify", "affected-typecheck", "pnpm run affected:typecheck");
    add("verify", "affected-lint", "pnpm run affected:lint");
    add("verify", "affected-test", "pnpm run affected:test");
    add("verify", "affected-build", "pnpm run affected:build");
  }
  if ((audit || verify) && options.includeDiscovery) add("discovery", "deep-discovery", "pnpm run assurance:discover");
  if ((audit || verify) && options.includeDiagnostics) {
    add("diagnostics", "knip", "pnpm run diagnostics:knip");
    add("diagnostics", "jscpd", "pnpm run diagnostics:jscpd");
    add("diagnostics", "madge", "pnpm run diagnostics:madge");
  }
  extraCommands.forEach((command, index) => add("custom", `custom-${index + 1}`, command));
  if (remoteChange) add("remote", "change-verification-dispatch", "pnpm run ci:check");
  if (remoteClosure) add("remote", "change-closure-dispatch", "pnpm run ci:close");
  return tasks;
}

function executeTask(task, repoRoot, evidenceDir, index, candidate) {
  const startedAt = new Date();
  process.stdout.write(`\n[${index}] ${task.phase}/${task.name}\n$ ${task.command}\n`);
  const result = spawnSync(task.command, {
    cwd: repoRoot,
    shell: true,
    encoding: "utf8",
    env: { ...process.env, GH_FORCE_TTY: "0", NO_COLOR: "1" },
    maxBuffer: 128 * 1024 * 1024,
  });
  const finishedAt = new Date();
  const code = result.error ? 1 : (Number.isInteger(result.status) ? result.status : 1);
  const stdout = result.stdout ?? "";
  const stderr = [result.stderr ?? "", result.error ? String(result.error.stack ?? result.error.message ?? result.error) : ""].filter(Boolean).join("\n");
  const logPath = join(evidenceDir, `${String(index).padStart(2, "0")}-${sanitizeFileName(task.phase)}-${sanitizeFileName(task.name)}.log`);
  writeFileSync(logPath, [
    `phase=${task.phase}`, `name=${task.name}`, `command=${task.command}`,
    `startedAt=${startedAt.toISOString()}`, `finishedAt=${finishedAt.toISOString()}`, `exitCode=${code}`,
    "", "===== STDOUT =====", stdout, "", "===== STDERR =====", stderr, "",
  ].join("\n"), "utf8");
  if (stdout) process.stdout.write(stdout.endsWith("\n") ? stdout : `${stdout}\n`);
  if (stderr) process.stderr.write(stderr.endsWith("\n") ? stderr : `${stderr}\n`);
  process.stdout.write(code === 0 ? `[PASS] ${task.name}\n` : `[FAIL] ${task.name} exit=${code}\n`);
  return {
    phase: task.phase, name: task.name, command: task.command, exitCode: code,
    status: code === 0 ? "PASS" : "FAIL", startedAt: startedAt.toISOString(), finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(), logPath,
    envelope: buildEvidenceEnvelope({
      toolId: `campaign:${task.phase}:${task.name}`,
      candidate: {headSha: candidate.headSha, baseSha: candidate.baseSha, identity: candidate.identity},
      status: code === 0 ? "PASS" : "FAIL",
      exitCode: code,
      rawText: [stdout, stderr].filter(Boolean).join("\n"),
      rawPath: logPath,
      claim: `root-closure campaign task: ${task.command}`,
      scope: `candidate ${candidate.headSha}`,
    }),
  };
}

function main() {
  let options;
  try { options = parseArgs(process.argv.slice(2)); }
  catch (error) { process.stderr.write(`root-closure: ${error.message}\n`); usage(2); }

  const repoProbe = git(["rev-parse", "--show-toplevel"], process.cwd(), true);
  if (repoProbe.code !== 0) { process.stderr.write("root-closure: current directory is not inside a Git repository\n"); process.exit(2); }
  const repoRoot = repoProbe.stdout.trim();
  const branch = git(["branch", "--show-current"], repoRoot).stdout.trim();
  const headSha = git(["rev-parse", "HEAD"], repoRoot).stdout.trim();
  const worktree = git(["status", "--porcelain=v1"], repoRoot).stdout.trim();

  const repoInfo = safeJson(gh(["repo", "view", "--json", "nameWithOwner,defaultBranchRef"], repoRoot).stdout, "gh repo view");
  const repository = repoInfo.nameWithOwner;
  const defaultBranch = repoInfo.defaultBranchRef?.name;
  if (!repository || !defaultBranch) throw new Error("unable to resolve repository/default branch from GitHub");
  const baseRef = options.baseRef || defaultBranch;
  const remoteBase = safeJson(gh(["api", "-H", "X-GitHub-Api-Version: 2022-11-28", `/repos/${repository}/branches/${encodeURIComponent(baseRef)}`], repoRoot).stdout, `base branch ${baseRef}`);
  const baseSha = remoteBase?.commit?.sha ?? "";
  const candidate = {headSha, baseSha, identity: headSha};

  const evidenceDir = options.evidenceDir
    ? (isAbsolute(options.evidenceDir) ? options.evidenceDir : resolve(repoRoot, options.evidenceDir))
    : mkdtempSync(join(tmpdir(), "bthwani-root-closure-"));
  mkdirSync(evidenceDir, { recursive: true });

  const probes = [];
  probes.push(branch ? makeProbe("branch-attached", "PASS", `branch=${branch}`) : makeProbe("branch-attached", "FAIL", "detached HEAD is not an authorized mutable candidate"));
  if (options.expectedBranch) probes.push(branch === options.expectedBranch
    ? makeProbe("expected-branch", "PASS", `branch=${branch}`)
    : makeProbe("expected-branch", "FAIL", `expected=${options.expectedBranch} actual=${branch || "detached"}`));
  probes.push(/^[0-9a-f]{40}$/iu.test(headSha) ? makeProbe("exact-head-sha", "PASS", headSha) : makeProbe("exact-head-sha", "FAIL", `invalid head SHA: ${headSha}`));
  probes.push(/^[0-9a-f]{40}$/iu.test(baseSha) ? makeProbe("exact-base-sha", "PASS", `${baseRef}@${baseSha}`) : makeProbe("exact-base-sha", "FAIL", `unable to resolve exact base SHA for ${baseRef}`));

  const ancestor = baseSha ? git(["merge-base", "--is-ancestor", baseSha, headSha], repoRoot, true).code === 0 : false;
  probes.push(ancestor
    ? makeProbe("base-ancestry", "PASS", `${baseSha} is an ancestor of ${headSha}`)
    : makeProbe("base-ancestry", "FAIL", `${baseRef}@${baseSha || "unknown"} is not an ancestor of ${headSha}; re-pin/reconcile before exact-candidate verification`));

  const remoteBranch = branch ? safeJson(gh(["api", "-H", "X-GitHub-Api-Version: 2022-11-28", `/repos/${repository}/branches/${encodeURIComponent(branch)}`], repoRoot).stdout, `branch ${branch}`) : null;
  if (remoteBranch) probes.push(remoteBranch?.commit?.sha === headSha
    ? makeProbe("remote-branch-head", "PASS", `${branch}@${headSha}`)
    : makeProbe("remote-branch-head", "FAIL", `local=${headSha} remote=${remoteBranch?.commit?.sha ?? "unknown"}; reconcile branch movement before claims`));

  const remoteRequested = options.mode === "remote-change" || options.mode === "remote-closure" || options.mode === "all";
  if (!worktree) probes.push(makeProbe("clean-worktree", "PASS", "working tree clean"));
  else if (options.allowDirty && !remoteRequested) probes.push(makeProbe("clean-worktree", "PARTIAL", "working tree dirty but --allow-dirty permits local-only evidence; remote claims remain forbidden", false));
  else probes.push(makeProbe("clean-worktree", "FAIL", "working tree is dirty; commit/discard changes before remote or exact-candidate claims"));

  probes.push(...inspectLocalControlPlane(repoRoot));
  try { probes.push(...inspectRuleset(repoRoot, repository, defaultBranch)); }
  catch (error) { probes.push(makeProbe("master-ruleset-read", "FAIL", error.message)); }

  let baselineProbe;
  try { baselineProbe = latestRepositoryBaseline(repoRoot, repository, defaultBranch); }
  catch (error) { baselineProbe = makeProbe("latest-repository-baseline", "NOT_COVERED", error.message, false); }
  if (options.requireRepositoryBaseline) baselineProbe.blocking = true;
  probes.push(baselineProbe);

  const preflightBlockingFailures = probes.filter((probe) => probe.blocking && probe.status === "FAIL");
  process.stdout.write("\n=== PRE-FLIGHT / STRUCTURAL PROBES ===\n");
  for (const probe of probes) process.stdout.write(`${probe.status.padEnd(11)} ${probe.name}: ${probe.detail}\n`);

  const extraCommands = loadAdditionalCommands(options, repoRoot);
  const tasks = buildTasks(options, extraCommands);
  const taskResults = [];
  const fundamentalIdentityFailure = probes.some((probe) => probe.blocking && probe.status === "FAIL" && [
    "branch-attached", "expected-branch", "exact-head-sha", "exact-base-sha", "base-ancestry", "remote-branch-head", "clean-worktree",
  ].includes(probe.name));

  if (fundamentalIdentityFailure) {
    process.stderr.write("\nroot-closure: candidate identity/precondition failure; command execution is withheld because evidence would be ambiguously bound.\n");
  } else {
    for (let i = 0; i < tasks.length; i += 1) taskResults.push(executeTask(tasks[i], repoRoot, evidenceDir, i + 1, candidate));
  }

  const taskFailures = taskResults.filter((result) => result.status === "FAIL");
  const envelopes = taskResults.map((result) => result.envelope);
  const rootGraph = buildUnifiedRootGraph(envelopes, candidate.identity);
  const evidenceConsumption = summarizeEvidenceConsumption(envelopes, rootGraph);
  writeFileSync(join(evidenceDir, "evidence-envelopes.json"), `${JSON.stringify(envelopes, null, 2)}\n`, "utf8");
  writeFileSync(join(evidenceDir, "root-graph.json"), `${JSON.stringify(rootGraph, null, 2)}\n`, "utf8");
  writeFileSync(join(evidenceDir, "evidence-consumption.json"), `${JSON.stringify({...evidenceConsumption, closureClaim: false}, null, 2)}\n`, "utf8");
  const summary = {
    schema: "bthwani-root-closure-campaign-run/1",
    scriptVersion: SCRIPT_VERSION,
    generatedAt: new Date().toISOString(),
    repository,
    candidate: { branch, headSha, baseRef, baseSha, cleanWorktree: !worktree },
    invocation: {
      mode: options.mode,
      expectedBranch: options.expectedBranch || null,
      includeDiscovery: options.includeDiscovery,
      includeDiagnostics: options.includeDiagnostics,
      requireRepositoryBaseline: options.requireRepositoryBaseline,
      customCommandCount: extraCommands.length,
    },
    probes,
    commands: taskResults,
    counts: {
      blockingProbeFailures: preflightBlockingFailures.length,
      commandFailures: taskFailures.length,
      commandsExecuted: taskResults.length,
      rootQueue: evidenceConsumption.rootQueue,
      unaccountedRawFindings: evidenceConsumption.unaccountedRawFindings,
    },
    verdict: preflightBlockingFailures.length === 0 && taskFailures.length === 0
      && evidenceConsumption.allToolEvidenceConsumed && evidenceConsumption.rootQueue === 0
      ? "PASS_FOR_EXECUTED_CLAIMS"
      : "OPEN",
    evidenceConsumption,
    rootGraph,
    closureClaims: {
      changeVerification: options.mode === "remote-change" || options.mode === "all" ? "DISPATCH_REQUESTED_ONLY" : "NOT_CLAIMED",
      changeClosure: options.mode === "remote-closure" ? "DISPATCH_REQUESTED_ONLY" : "NOT_CLAIMED",
      repositoryBaseline: options.requireRepositoryBaseline && baselineProbe.status === "PASS" ? "OBSERVED_PASS" : "NOT_CLAIMED",
      repositoryClosure: "FORBIDDEN_BY_THIS_SCRIPT",
    },
    evidenceDir,
  };
  const summaryPath = join(evidenceDir, "summary.json");
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  process.stdout.write(`\n=== FINAL ===\nverdict=${summary.verdict}\nsummary=${summaryPath}\n`);
  process.stdout.write(`blockingProbeFailures=${summary.counts.blockingProbeFailures} commandFailures=${summary.counts.commandFailures}\n`);
  process.stdout.write("repositoryClosure=NOT_CLAIMED (this script is an evidence orchestrator, not a closure authority)\n");
  if (summary.verdict !== "PASS_FOR_EXECUTED_CLAIMS") process.exit(1);
}

try { main(); }
catch (error) { process.stderr.write(`root-closure: ${error.stack ?? error.message ?? error}\n`); process.exit(2); }
