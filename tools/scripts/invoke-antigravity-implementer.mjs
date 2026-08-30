import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../guards/_guard-utils.mjs";

const TOOL_ID = "antigravity-implementer";
const MAX_BRIEF_BYTES = 12 * 1024;
const MAX_CAPTURE_BYTES = 16 * 1024 * 1024;
const WORK_UNIT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const DURATION_RE = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/;
export const NON_READ_HOOK_MATCHER = "^(?!view_file$|list_dir$|grep_search$|find_by_name$).+";
const SELF_PROTECTED = [
  "AGENTS.md",
  "GEMINI.md",
  "CLAUDE.md",
  "LEAN-CTX.md",
  ".agents",
  ".gemini",
  ".claude",
  "governance",
  "tools/scripts/invoke-antigravity-implementer.mjs",
  "tools/scripts/invoke-antigravity-implementer.test.mjs",
  "tools/scripts/invoke-claude-antigravity-implementer.mjs",
  "tools/scripts/invoke-claude-antigravity-implementer.test.mjs",
  "tools/scripts/antigravity-implementer-hook.mjs",
  "tools/scripts/antigravity-implementer-hook.test.mjs",
];

class ToolFailure extends Error {
  constructor(message, detail) {
    super(message);
    this.name = "ToolFailure";
    this.detail = detail;
  }
}

function fail(message, detail) {
  throw new ToolFailure(message, detail);
}

export function parseArgs(argv) {
  const out = { diagnosticOnly: false, allowRead: [], allowWrite: [], forbidWrite: [], timeout: "45m" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--diagnostic-only") out.diagnosticOnly = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
    else if (["--orchestrator", "--work-unit", "--brief", "--expected-branch", "--expected-head", "--allow-read", "--allow-write", "--forbid-write", "--model", "--timeout"].includes(arg)) {
      const value = argv[++i];
      if (!value || value.startsWith("--")) fail(`Missing value for ${arg}.`);
      if (arg === "--allow-read") out.allowRead.push(value);
      else if (arg === "--allow-write") out.allowWrite.push(value);
      else if (arg === "--forbid-write") out.forbidWrite.push(value);
      else out[{ "--orchestrator": "orchestrator", "--work-unit": "workUnit", "--brief": "brief", "--expected-branch": "expectedBranch", "--expected-head": "expectedHead", "--model": "model", "--timeout": "timeout" }[arg]] = value;
    } else fail(`Unknown argument: ${arg}`);
  }
  return out;
}

function usage() {
  console.log(`Usage:\n  node tools/scripts/invoke-antigravity-implementer.mjs --diagnostic-only\n  node tools/scripts/invoke-antigravity-implementer.mjs \\\n    --work-unit <id> \\\n    --brief <file> \\\n    --expected-branch <branch> \\\n    --expected-head <40-char-sha> \\\n    --allow-read <repo-relative-prefix> [--allow-read <prefix> ...] \\\n    --allow-write <repo-relative-prefix> [--allow-write <prefix> ...] \\\n    [--forbid-write <repo-relative-prefix> ...] \\\n    --model <gemini-model> [--timeout 45m]`);
}

export function durationMs(value) {
  const match = DURATION_RE.exec(value || "");
  if (!match || !match[0] || !match.slice(1).some(Boolean)) fail(`Invalid timeout '${value}'. Use values such as 30m, 1h, or 1h15m.`);
  return ((Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0)) * 1000;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: "utf8", windowsHide: true, ...options });
  if (result.error || result.status !== 0) fail(`Command failed: ${command} ${args.join(" ")}`, String(result.stderr || result.error?.message || ""));
  return String(result.stdout || "").trim();
}

function regularFile(pathname) {
  try { return fs.statSync(pathname).isFile(); } catch { return false; }
}

export function resolveAntigravity() {
  const locator = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(locator, ["agy"], { encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0) return null;
  const candidates = String(result.stdout || "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  if (process.platform === "win32") {
    const native = candidates.find((value) => /\.exe$/i.test(value) && regularFile(value));
    return native ? { command: native, displayExecutable: native } : null;
  }
  const executable = candidates.find(regularFile) || candidates[0];
  return executable ? { command: executable, displayExecutable: executable } : null;
}

function probe(launcher, args, timeout = 15_000) {
  if (!launcher) return null;
  const result = spawnSync(launcher.command, args, { cwd: repoRoot, encoding: "utf8", timeout, windowsHide: true });
  if (result.error || result.status !== 0) return null;
  return String(result.stdout || result.stderr || "").trim();
}

function normalizeRelativePrefix(raw, label) {
  if (typeof raw !== "string" || !raw.trim()) fail(`${label} must not be empty.`);
  if (path.isAbsolute(raw)) fail(`${label} must be repository-relative: ${raw}`);
  const normalized = path.normalize(raw.trim());
  if (normalized === "." || normalized === "") fail(`${label} may not be repository root.`);
  if (normalized === ".." || normalized.startsWith(`..${path.sep}`)) fail(`${label} escapes repository: ${raw}`);
  const absolute = path.resolve(repoRoot, normalized);
  const rel = path.relative(repoRoot, absolute);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) fail(`${label} escapes repository: ${raw}`);
  return { relative: rel.split(path.sep).join("/"), absolute };
}

function insideOrEqual(root, target) {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function ensureNoSymlinkPrefix(absolute, label) {
  const rel = path.relative(repoRoot, absolute);
  let cursor = repoRoot;
  for (const segment of rel.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    try {
      if (fs.lstatSync(cursor).isSymbolicLink()) fail(`${label} traverses a symbolic link: ${rel}`);
    } catch (error) {
      if (error instanceof ToolFailure) throw error;
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

export function statusPaths() {
  const raw = run("git", ["status", "--porcelain=v1", "-z", "--untracked-files=normal"]);
  if (!raw) return [];
  const fields = raw.split("\0");
  const paths = [];
  for (let i = 0; i < fields.length; i += 1) {
    const record = fields[i];
    if (!record) continue;
    if (record.length < 4) fail(`Unexpected git status record: ${record}`);
    const status = record.slice(0, 2);
    paths.push(record.slice(3));
    if (/[RC]/.test(status) && fields[i + 1]) paths.push(fields[++i]);
  }
  return [...new Set(paths.map((value) => value.split("\\").join("/")))].sort();
}

export function fingerprintPaths(paths, root) {
  const fingerprints = new Map();
  for (const rel of paths) {
    const absolute = path.resolve(root, rel);
    let mark;
    try {
      const stat = fs.lstatSync(absolute);
      if (stat.isDirectory()) mark = `dir:${Math.round(stat.mtimeMs)}`;
      else if (stat.isSymbolicLink()) mark = `link:${Math.round(stat.mtimeMs)}`;
      else mark = `file:${stat.size}:${Math.round(stat.mtimeMs)}`;
    } catch {
      mark = "absent";
    }
    fingerprints.set(rel, mark);
  }
  return fingerprints;
}

export function fingerprintDelta(before, after) {
  const changed = new Set();
  for (const [rel, mark] of after) if (before.get(rel) !== mark) changed.add(rel);
  for (const rel of before.keys()) if (!after.has(rel)) changed.add(rel);
  return [...changed].sort();
}

function gitPrivateRoot() {
  const commonDir = run("git", ["rev-parse", "--git-common-dir"]);
  const privateRoot = path.join(path.resolve(repoRoot, commonDir), "bthwani", TOOL_ID);
  fs.mkdirSync(privateRoot, { recursive: true, mode: 0o700 });
  return privateRoot;
}

function acquireLock(privateRoot) {
  const lockPath = path.join(privateRoot, "delegation.lock");
  let fd;
  try {
    fd = fs.openSync(lockPath, "wx", 0o600);
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, repoRoot, createdAt: new Date().toISOString() }));
    return lockPath;
  } catch (error) {
    if (error?.code === "EEXIST") fail(`Delegation lock already exists at ${lockPath}. Confirm no Antigravity delegation is running before clearing a stale lock.`);
    throw error;
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch {}
  }
}

function releaseLock(lockPath) {
  try { fs.unlinkSync(lockPath); } catch (error) { if (error?.code !== "ENOENT") throw error; }
}

function createRunDirectory(privateRoot, workUnit) {
  return fs.mkdtempSync(path.join(privateRoot, `run-${workUnit}-`));
}

function readBrief(filename) {
  const resolved = path.resolve(process.cwd(), filename);
  let fd;
  try {
    const noFollow = process.platform === "win32" ? 0 : (fs.constants.O_NOFOLLOW || 0);
    fd = fs.openSync(resolved, fs.constants.O_RDONLY | noFollow);
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) fail(`Brief is not a regular file: ${filename}`);
    if (stat.size > MAX_BRIEF_BYTES) fail(`Brief exceeds ${MAX_BRIEF_BYTES} bytes; keep delegated work units bounded.`);
    const brief = fs.readFileSync(fd, "utf8").trim();
    if (!brief) fail("Brief is empty.");
    return brief;
  } catch (error) {
    if (error instanceof ToolFailure) throw error;
    if (["ENOENT", "ENOTDIR", "ELOOP"].includes(error?.code)) fail(`Brief file not found or not safely readable: ${filename}`);
    throw error;
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch {}
  }
}

function quoteCommand(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function scopeViolations(changedPaths, allowed, forbidden) {
  const violations = [];
  for (const rel of changedPaths) {
    const absolute = path.resolve(repoRoot, rel);
    if (!insideOrEqual(repoRoot, absolute)) violations.push({ path: rel, reason: "OUTSIDE_REPOSITORY" });
    else if (forbidden.some((entry) => insideOrEqual(entry.absolute, absolute))) violations.push({ path: rel, reason: "FORBIDDEN_PATH" });
    else if (!allowed.some((entry) => insideOrEqual(entry.absolute, absolute))) violations.push({ path: rel, reason: "OUTSIDE_ALLOWED_WRITE_SCOPE" });
  }
  return violations;
}

function parseJson(stdout) {
  try { return JSON.parse(stdout.trim()); } catch { return null; }
}

async function spawnAntigravity(launcher, args, env, timeoutMsValue) {
  const child = spawn(launcher.command, args, { cwd: repoRoot, env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  let stdout = "";
  let stderr = "";
  let overflow = false;
  const append = (current, chunk) => {
    if (Buffer.byteLength(current) + chunk.length > MAX_CAPTURE_BYTES) { overflow = true; return current; }
    return current + chunk.toString("utf8");
  };
  child.stdout.on("data", (chunk) => { stdout = append(stdout, chunk); });
  child.stderr.on("data", (chunk) => { stderr = append(stderr, chunk); });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    else { child.kill("SIGTERM"); setTimeout(() => child.kill("SIGKILL"), 2000).unref(); }
  }, timeoutMsValue);
  timer.unref();
  const outcome = await new Promise((resolve) => {
    child.on("error", (error) => resolve({ exitCode: null, signal: null, error: error.message }));
    child.on("exit", (code, signal) => resolve({ exitCode: code, signal, error: null }));
  });
  clearTimeout(timer);
  return { ...outcome, stdout, stderr, overflow, timedOut };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) { usage(); return 0; }
  const launcher = resolveAntigravity();
  const version = probe(launcher, ["--version"], 10_000)?.split(/\r?\n/)[0] || null;
  if (!launcher || !version) fail("Antigravity CLI (agy) is not installed, not on PATH, or failed its direct version probe.");

  if (args.diagnosticOnly) {
    const modelsOutput = probe(launcher, ["models"], 20_000);
    if (!modelsOutput) fail("Antigravity CLI is installed but 'agy models' failed. Authenticate the local subscription session and retry.");
    console.log(JSON.stringify({ tool: TOOL_ID, state: "VERIFIED_AVAILABLE", executable: launcher.displayExecutable, version, authenticationProbe: "agy models PASS" }, null, 2));
    return 0;
  }

  if (!["codex", "claude"].includes(args.orchestrator)) fail("--orchestrator must be exactly codex or claude.");
  if (!args.workUnit || !WORK_UNIT_RE.test(args.workUnit)) fail("A safe --work-unit id is required.");
  if (!args.brief) fail("--brief is required.");
  if (!args.expectedBranch || /[\r\n\0]/.test(args.expectedBranch)) fail("--expected-branch is required and must be a single branch name.");
  if (!args.expectedHead || !/^[0-9a-fA-F]{40}$/.test(args.expectedHead)) fail("--expected-head is required and must be an exact 40-character commit SHA.");
  if (!args.allowRead.length) fail("At least one --allow-read prefix is required.");
  if (!args.allowWrite.length) fail("At least one --allow-write prefix is required.");
  if (!args.model) fail("--model is required.");
  if (args.model.length > 160 || /[\r\n\0]/.test(args.model) || !/^gemini-[A-Za-z0-9._-]+$/i.test(args.model)) fail("--model must be a safe Gemini model identifier.");

  const timeoutMsValue = durationMs(args.timeout);
  const brief = readBrief(args.brief);
  const allowedRead = args.allowRead.map((value) => normalizeRelativePrefix(value, "--allow-read"));
  const allowed = args.allowWrite.map((value) => normalizeRelativePrefix(value, "--allow-write"));
  const explicitForbidden = args.forbidWrite.map((value) => normalizeRelativePrefix(value, "--forbid-write"));
  const protectedForbidden = SELF_PROTECTED.map((value) => normalizeRelativePrefix(value, "protected path"));
  const forbidden = [...new Map([...explicitForbidden, ...protectedForbidden].map((entry) => [entry.absolute, entry])).values()];
  for (const entry of [...allowedRead, ...allowed, ...forbidden]) ensureNoSymlinkPrefix(entry.absolute, "Declared scope");
  for (const allow of allowed) if (forbidden.some((deny) => insideOrEqual(deny.absolute, allow.absolute))) fail(`Allowed write scope is entirely inside a protected/forbidden path: ${allow.relative}`);

  const branchBefore = run("git", ["branch", "--show-current"]);
  const headBefore = run("git", ["rev-parse", "HEAD"]);
  if (branchBefore !== args.expectedBranch) fail(`Branch mismatch: expected '${args.expectedBranch}', found '${branchBefore}'.`);
  if (headBefore.toLowerCase() !== args.expectedHead.toLowerCase()) fail(`HEAD mismatch: expected '${args.expectedHead}', found '${headBefore}'.`);

  const dirtyBefore = statusPaths();
  const dirtyScopeConflicts = dirtyBefore.filter((rel) => {
    const absolute = path.resolve(repoRoot, rel);
    return allowed.some((entry) => insideOrEqual(entry.absolute, absolute)) || allowedRead.some((entry) => insideOrEqual(entry.absolute, absolute));
  });
  if (dirtyScopeConflicts.length) {
    fail(
      "Declared read/write scope overlaps pre-existing working-tree changes. Reconcile or narrow the work unit before delegation.",
      JSON.stringify(dirtyScopeConflicts, null, 2),
    );
  }
  const dirtyStateBefore = fingerprintPaths(dirtyBefore, repoRoot);

  const hooksPath = path.join(repoRoot, ".agents", "hooks.json");
  fs.mkdirSync(path.dirname(hooksPath), { recursive: true });
  const privateRoot = gitPrivateRoot();
  const lockPath = acquireLock(privateRoot);
  let hookExpectedHash = null;
  let hookTampered = false;
  try {
    const runDir = createRunDirectory(privateRoot, args.workUnit);
    const resultPath = path.join(runDir, "result.json");
    const hookPath = path.join(repoRoot, "tools", "scripts", "antigravity-implementer-hook.mjs");
    const hookCommand = `${quoteCommand(process.execPath)} ${quoteCommand(hookPath)}`;
    const hookConfig = {
      "bthwani-antigravity-implementer-scope": {
        PreToolUse: [{ matcher: NON_READ_HOOK_MATCHER, hooks: [{ type: "command", command: hookCommand, timeout: 5 }] }],
      },
    };
    const hookText = `${JSON.stringify(hookConfig, null, 2)}\n`;
    hookExpectedHash = crypto.createHash("sha256").update(hookText).digest("hex");
    try {
      fs.writeFileSync(hooksPath, hookText, { encoding: "utf8", mode: 0o600, flag: "wx" });
    } catch (error) {
      if (error?.code === "EEXIST") {
        fail(".agents/hooks.json already exists. Refusing to overwrite workspace hook configuration.");
      }
      throw error;
    }

    const prompt = [
      `You are the Antigravity CLI Implementer for one bounded BThwani work unit delegated by the ${args.orchestrator === "codex" ? "Codex" : "Claude"} orchestrator.`,
      "Implement only the brief below in the current repository.",
      "Do not commit, push, merge, release, approve, or expand scope.",
      "Do not use shell, web, browser, MCP, permissions, task management, schedules, image generation, interactive questions, or subagents; every non-read tool call is intercepted and denied unless it is an allowed file write.",
      "Keep read/search operations inside the declared read scope and do not scan unrelated repository areas.",
      "If the required implementation cannot be completed within the declared read/write scope, stop and report the exact missing scope instead of changing other paths.",
      `Do not claim verification that you did not execute. ${args.orchestrator === "codex" ? "Codex" : "Claude"} will review the complete diff and run repository gates after you exit.`,
      "",
      "DECLARED ALLOWED READ PREFIXES:",
      ...allowedRead.map((entry) => `- ${entry.relative}`),
      "",
      "DECLARED ALLOWED WRITE PREFIXES:",
      ...allowed.map((entry) => `- ${entry.relative}`),
      "",
      "DECLARED FORBIDDEN WRITE PREFIXES:",
      ...forbidden.map((entry) => `- ${entry.relative}`),
      "",
      "IMPLEMENTATION BRIEF:",
      brief,
      "",
      "FINAL REPORT:",
      "Return a concise implementation report: summary, changed paths, unresolved blockers, assumptions, and checks actually performed.",
    ].join("\n");

    const agyArgs = ["-p", prompt, "--output-format", "json", "--mode=accept-edits", "--model", args.model];
    const childEnv = {
      ...process.env,
      BTHWANI_ANTIGRAVITY_REPO_ROOT: repoRoot,
      BTHWANI_ANTIGRAVITY_ALLOWED_READ: JSON.stringify(allowedRead.map((entry) => entry.absolute)),
      BTHWANI_ANTIGRAVITY_ALLOWED_WRITE: JSON.stringify(allowed.map((entry) => entry.absolute)),
      BTHWANI_ANTIGRAVITY_FORBIDDEN_WRITE: JSON.stringify(forbidden.map((entry) => entry.absolute)),
    };
    const execution = await spawnAntigravity(launcher, agyArgs, childEnv, timeoutMsValue);

    try {
      const currentHook = fs.readFileSync(hooksPath, "utf8");
      hookTampered = crypto.createHash("sha256").update(currentHook).digest("hex") !== hookExpectedHash;
    } catch {
      hookTampered = true;
    }
    try { fs.unlinkSync(hooksPath); } catch (error) { if (error?.code !== "ENOENT") throw error; }

    const branchAfter = run("git", ["branch", "--show-current"]);
    const headAfter = run("git", ["rev-parse", "HEAD"]);
    const dirtyAfter = statusPaths();
    const dirtyStateAfter = fingerprintPaths(dirtyAfter, repoRoot);
    const changedPaths = fingerprintDelta(dirtyStateBefore, dirtyStateAfter);
    const violations = scopeViolations(changedPaths, allowed, forbidden);
    const diffCheck = spawnSync("git", ["diff", "--check", "--", ...allowed.map((entry) => entry.relative)], { cwd: repoRoot, encoding: "utf8", windowsHide: true });
    const diffCheckPassed = !diffCheck.error && diffCheck.status === 0;
    const parsed = parseJson(execution.stdout);
    const invariantFailures = [];
    if (branchAfter !== branchBefore) invariantFailures.push("BRANCH_CHANGED");
    if (headAfter !== headBefore) invariantFailures.push("HEAD_CHANGED");
    if (violations.length) invariantFailures.push("WRITE_SCOPE_VIOLATION");
    if (!changedPaths.length) invariantFailures.push("NO_CHANGES_PRODUCED");
    if (!diffCheckPassed) invariantFailures.push("GIT_DIFF_CHECK_FAILED");
    if (hookTampered) invariantFailures.push("HOOK_CONFIG_TAMPERED");
    if (execution.overflow) invariantFailures.push("OUTPUT_CAPTURE_LIMIT_EXCEEDED");
    if (execution.timedOut) invariantFailures.push("TIMEOUT");
    if (execution.error) invariantFailures.push("PROCESS_ERROR");
    if (execution.exitCode !== 0) invariantFailures.push("ANTIGRAVITY_NONZERO_EXIT");
    if (!parsed || typeof parsed !== "object") invariantFailures.push("INVALID_ANTIGRAVITY_JSON");

    const result = {
      schemaVersion: 2,
      tool: TOOL_ID,
      orchestrator: args.orchestrator,
      workUnitId: args.workUnit,
      status: invariantFailures.length ? "failed" : "success",
      antigravityVersion: version,
      modelRequested: args.model,
      branchBefore,
      branchAfter,
      headBefore,
      headAfter,
      exitCode: execution.exitCode,
      signal: execution.signal,
      timedOut: execution.timedOut,
      changedPaths,
      ignoredDirectoryActivity: [],
      scopeViolations: violations,
      diffCheckPassed,
      hookConfigTampered: hookTampered,
      invariantFailures,
      response: parsed,
      stderr: execution.stderr.slice(0, 64 * 1024),
      runDir,
    };
    fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    console.log(JSON.stringify({ resultPath, status: result.status, changedPaths, invariantFailures }, null, 2));
    return result.status === "success" ? 0 : 1;
  } finally {
    try { fs.unlinkSync(hooksPath); } catch (error) { if (error?.code !== "ENOENT") throw error; }
    releaseLock(lockPath);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main().then((code) => { process.exitCode = code; }).catch((error) => {
    if (error?.detail !== undefined) console.error(error.detail);
    console.error(`[${TOOL_ID.toUpperCase()} FAIL] ${error?.message || String(error)} decision=FIX_REQUIRED`);
    process.exitCode = 1;
  });
}
