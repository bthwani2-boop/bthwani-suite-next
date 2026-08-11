import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

const TOOL_ID = "gemini-implementer";
const MAX_BRIEF_BYTES = 128 * 1024;
const MAX_CAPTURE_BYTES = 16 * 1024 * 1024;
const WORK_UNIT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const MODEL_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const DURATION_RE = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/;
const SELF_PROTECTED = [
  "AGENTS.md",
  "GEMINI.md",
  ".gemini",
  ".agents",
  "governance/agents",
  "governance/skills",
  "governance/tools",
  "tools/scripts/invoke-gemini-implementer.mjs",
  "tools/scripts/gemini-implementer-hook.mjs",
  "tools/scripts/gemini-implementer-hook.test.mjs",
];

function fail(message, detail) {
  if (detail !== undefined) console.error(detail);
  console.error(`[${TOOL_ID.toUpperCase()} FAIL] ${message} decision=FIX_REQUIRED`);
  process.exit(1);
}

function usage() {
  console.log(`Usage:
  node tools/scripts/invoke-gemini-implementer.mjs --diagnostic-only
  node tools/scripts/invoke-gemini-implementer.mjs \\
    --work-unit <id> \\
    --brief <file> \\
    --expected-branch <branch> \\
    --allow-write <repo-relative-prefix> [--allow-write <prefix> ...] \\
    [--forbid-write <repo-relative-prefix> ...] \\
    [--model <model>] [--timeout 45m]`);
}

function parseArgs(argv) {
  const out = {
    diagnosticOnly: false,
    allowWrite: [],
    forbidWrite: [],
    timeout: "45m",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--diagnostic-only") out.diagnosticOnly = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
    else if (["--work-unit", "--brief", "--expected-branch", "--allow-write", "--forbid-write", "--model", "--timeout"].includes(arg)) {
      const value = argv[++i];
      if (!value || value.startsWith("--")) fail(`Missing value for ${arg}.`);
      if (arg === "--allow-write") out.allowWrite.push(value);
      else if (arg === "--forbid-write") out.forbidWrite.push(value);
      else {
        const key = {
          "--work-unit": "workUnit",
          "--brief": "brief",
          "--expected-branch": "expectedBranch",
          "--model": "model",
          "--timeout": "timeout",
        }[arg];
        out[key] = value;
      }
    } else fail(`Unknown argument: ${arg}`);
  }
  return out;
}

function durationMs(value) {
  const match = DURATION_RE.exec(value || "");
  if (!match || !match[0] || !match.slice(1).some(Boolean)) fail(`Invalid timeout '${value}'. Use values such as 30m, 1h, or 1h15m.`);
  return ((Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0)) * 1000;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
    ...options,
  });
  if (result.error || result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(" ")}`, String(result.stderr || result.error?.message || ""));
  }
  return String(result.stdout || "").trim();
}

function resolveGemini() {
  const locator = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(locator, ["gemini"], { encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0) return null;
  const candidates = String(result.stdout || "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  if (process.platform === "win32") {
    return candidates.find((value) => /\.exe$/i.test(value))
      || candidates.find((value) => /\.cmd$/i.test(value))
      || candidates.find((value) => /\.bat$/i.test(value))
      || candidates[0]
      || null;
  }
  return candidates[0] || null;
}

function versionProbe(executable) {
  if (!executable) return null;
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(executable)) {
    const comspec = process.env.ComSpec || process.env.COMSPEC || "cmd.exe";
    const result = spawnSync(comspec, ["/d", "/s", "/c", "gemini --version"], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 10_000,
      windowsHide: true,
    });
    if (result.error || result.status !== 0) return null;
    return String(result.stdout || result.stderr || "").trim().split(/\r?\n/)[0] || "unknown";
  }
  const result = spawnSync(executable, ["--version"], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 10_000,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) return null;
  return String(result.stdout || result.stderr || "").trim().split(/\r?\n/)[0] || "unknown";
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
    if (!fs.existsSync(cursor)) continue;
    if (fs.lstatSync(cursor).isSymbolicLink()) fail(`${label} traverses a symbolic link: ${rel}`);
  }
}

function statusPaths() {
  const raw = run("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
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

function acquireLock() {
  const key = crypto.createHash("sha256").update(path.resolve(repoRoot)).digest("hex").slice(0, 20);
  const lockPath = path.join(os.tmpdir(), `bthwani-gemini-implementer-${key}.lock`);
  const tryCreate = () => {
    const fd = fs.openSync(lockPath, "wx");
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, repoRoot, createdAt: new Date().toISOString() }));
    fs.closeSync(fd);
    return lockPath;
  };
  try {
    return tryCreate();
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  try {
    const current = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    if (Number.isInteger(current.pid) && current.pid > 0) {
      try {
        process.kill(current.pid, 0);
        fail(`Another Gemini implementation delegation is active (pid=${current.pid}).`);
      } catch (error) {
        if (error?.code !== "ESRCH") throw error;
      }
    }
    fs.unlinkSync(lockPath);
    return tryCreate();
  } catch (error) {
    if (error?.message?.includes("Another Gemini")) throw error;
    fail(`Cannot safely acquire delegation lock: ${error.message}`);
  }
}

function quoteHookCommand(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function parseGeminiJson(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function scopeViolations(changedPaths, allowed, forbidden) {
  const allowedAbs = allowed.map((entry) => entry.absolute);
  const forbiddenAbs = forbidden.map((entry) => entry.absolute);
  const violations = [];
  for (const rel of changedPaths) {
    const absolute = path.resolve(repoRoot, rel);
    if (!insideOrEqual(repoRoot, absolute)) {
      violations.push({ path: rel, reason: "OUTSIDE_REPOSITORY" });
      continue;
    }
    if (forbiddenAbs.some((prefix) => insideOrEqual(prefix, absolute))) {
      violations.push({ path: rel, reason: "FORBIDDEN_PATH" });
      continue;
    }
    if (!allowedAbs.some((prefix) => insideOrEqual(prefix, absolute))) {
      violations.push({ path: rel, reason: "OUTSIDE_ALLOWED_WRITE_SCOPE" });
    }
  }
  return violations;
}

async function spawnGemini(executable, args, env, prompt, timeoutMsValue) {
  const windowsShim = process.platform === "win32" && /\.(cmd|bat)$/i.test(executable);
  const command = windowsShim ? (process.env.ComSpec || process.env.COMSPEC || "cmd.exe") : executable;
  const commandArgs = windowsShim ? ["/d", "/s", "/c", `gemini ${args.join(" ")}`] : args;
  const child = spawn(command, commandArgs, {
    cwd: repoRoot,
    env,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });

  let stdout = "";
  let stderr = "";
  let overflow = false;
  const append = (current, chunk) => {
    if (Buffer.byteLength(current) + chunk.length > MAX_CAPTURE_BYTES) {
      overflow = true;
      return current;
    }
    return current + chunk.toString("utf8");
  };
  child.stdout.on("data", (chunk) => { stdout = append(stdout, chunk); });
  child.stderr.on("data", (chunk) => { stderr = append(stderr, chunk); });
  child.stdin.end(prompt, "utf8");

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } else {
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2000).unref();
    }
  }, timeoutMsValue);
  timer.unref();

  const outcome = await new Promise((resolve) => {
    child.on("error", (error) => resolve({ exitCode: null, signal: null, error: error.message }));
    child.on("exit", (code, signal) => resolve({ exitCode: code, signal, error: null }));
  });
  clearTimeout(timer);
  return { ...outcome, stdout, stderr, timedOut, overflow };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const executable = resolveGemini();
  const geminiVersion = versionProbe(executable);
  if (!executable || !geminiVersion) fail("Gemini CLI is not installed, not on PATH, or failed its version probe.");
  if (args.diagnosticOnly) {
    console.log(JSON.stringify({ tool: TOOL_ID, state: "VERIFIED_AVAILABLE", executable, version: geminiVersion }, null, 2));
    return;
  }

  if (!args.workUnit || !WORK_UNIT_RE.test(args.workUnit)) fail("A safe --work-unit id is required.");
  if (!args.brief) fail("--brief is required.");
  if (!args.expectedBranch || /[\r\n\0]/.test(args.expectedBranch)) fail("--expected-branch is required and must be a single branch name.");
  if (!args.allowWrite.length) fail("At least one --allow-write prefix is required.");
  if (args.model && !MODEL_RE.test(args.model)) fail("Unsafe --model token.");
  const timeoutMsValue = durationMs(args.timeout);

  const briefPath = path.resolve(process.cwd(), args.brief);
  if (!fs.existsSync(briefPath) || !fs.statSync(briefPath).isFile()) fail(`Brief file not found: ${args.brief}`);
  const briefStat = fs.statSync(briefPath);
  if (briefStat.size > MAX_BRIEF_BYTES) fail(`Brief exceeds ${MAX_BRIEF_BYTES} bytes.`);
  const brief = fs.readFileSync(briefPath, "utf8").trim();
  if (!brief) fail("Brief is empty.");

  const allowed = args.allowWrite.map((value) => normalizeRelativePrefix(value, "--allow-write"));
  const explicitForbidden = args.forbidWrite.map((value) => normalizeRelativePrefix(value, "--forbid-write"));
  const protectedForbidden = SELF_PROTECTED.map((value) => normalizeRelativePrefix(value, "protected path"));
  const forbiddenMap = new Map();
  for (const entry of [...explicitForbidden, ...protectedForbidden]) forbiddenMap.set(entry.absolute, entry);
  const forbidden = [...forbiddenMap.values()];

  for (const entry of [...allowed, ...forbidden]) ensureNoSymlinkPrefix(entry.absolute, "Declared scope");
  for (const allow of allowed) {
    if (forbidden.some((deny) => insideOrEqual(deny.absolute, allow.absolute))) {
      fail(`Allowed write scope is entirely inside a protected/forbidden path: ${allow.relative}`);
    }
  }

  const branchBefore = run("git", ["branch", "--show-current"]);
  const headBefore = run("git", ["rev-parse", "HEAD"]);
  if (branchBefore !== args.expectedBranch) fail(`Branch mismatch: expected '${args.expectedBranch}', found '${branchBefore}'.`);
  const dirtyBefore = statusPaths();
  if (dirtyBefore.length) fail("Working tree must be clean before delegation.", JSON.stringify(dirtyBefore, null, 2));

  const lockPath = acquireLock();
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), `bthwani-${TOOL_ID}-${args.workUnit}-`));
  const resultPath = path.join(runDir, "result.json");
  const settingsPath = path.join(runDir, "system-settings.json");
  const hookPath = path.join(repoRoot, "tools", "scripts", "gemini-implementer-hook.mjs");
  const hookCommand = `${quoteHookCommand(process.execPath)} ${quoteHookCommand(hookPath)}`;

  const settings = {
    hooksConfig: {
      enabled: true,
      notifications: false,
    },
    skills: {
      enabled: false,
    },
    hooks: {
      BeforeTool: [
        {
          matcher: ".*",
          hooks: [
            {
              name: "bthwani-gemini-implementer-scope",
              type: "command",
              command: hookCommand,
              timeout: 5000,
            },
          ],
        },
      ],
    },
  };
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

  const prompt = [
    "You are the Gemini Implementer for one bounded BThwani work unit.",
    "Implement the brief below in the current repository.",
    "Do not commit, push, merge, release, approve, or expand scope.",
    "Do not attempt shell, web, MCP, skill activation, or interactive-user tools; the system hook denies them.",
    "If the required implementation cannot be completed within the declared write scope, stop and report the exact missing scope instead of changing other paths.",
    "Do not claim verification that you did not execute. Codex will run repository gates after your implementation.",
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

  const geminiArgs = [
    "--output-format", "json",
    "--approval-mode", "auto_edit",
    "-e", "none",
    "--allowed-mcp-server-names", "__bthwani_none__",
  ];
  if (args.model) geminiArgs.push("--model", args.model);

  const childEnv = {
    ...process.env,
    GEMINI_CLI_SYSTEM_SETTINGS_PATH: settingsPath,
    BTHWANI_GEMINI_REPO_ROOT: repoRoot,
    BTHWANI_GEMINI_ALLOWED_WRITE: JSON.stringify(allowed.map((entry) => entry.absolute)),
    BTHWANI_GEMINI_FORBIDDEN_WRITE: JSON.stringify(forbidden.map((entry) => entry.absolute)),
  };

  let execution;
  try {
    execution = await spawnGemini(executable, geminiArgs, childEnv, prompt, timeoutMsValue);
  } finally {
    try { fs.unlinkSync(lockPath); } catch {}
  }

  const branchAfter = run("git", ["branch", "--show-current"]);
  const headAfter = run("git", ["rev-parse", "HEAD"]);
  const changedPaths = statusPaths();
  const violations = scopeViolations(changedPaths, allowed, forbidden);
  const diffCheck = spawnSync("git", ["diff", "--check"], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  const diffCheckPassed = !diffCheck.error && diffCheck.status === 0;
  const parsed = parseGeminiJson(execution.stdout);

  const invariantFailures = [];
  if (branchAfter !== branchBefore) invariantFailures.push("BRANCH_CHANGED");
  if (headAfter !== headBefore) invariantFailures.push("HEAD_CHANGED");
  if (violations.length) invariantFailures.push("WRITE_SCOPE_VIOLATION");
  if (!diffCheckPassed) invariantFailures.push("GIT_DIFF_CHECK_FAILED");
  if (execution.overflow) invariantFailures.push("OUTPUT_CAPTURE_LIMIT_EXCEEDED");
  if (execution.timedOut) invariantFailures.push("TIMEOUT");
  if (execution.error) invariantFailures.push("PROCESS_ERROR");
  if (execution.exitCode !== 0) invariantFailures.push("GEMINI_NONZERO_EXIT");
  if (!parsed || typeof parsed !== "object") invariantFailures.push("INVALID_GEMINI_JSON");

  const result = {
    schemaVersion: 1,
    tool: TOOL_ID,
    workUnitId: args.workUnit,
    status: invariantFailures.length ? "failed" : "success",
    geminiVersion,
    modelRequested: args.model || null,
    branchBefore,
    branchAfter,
    headBefore,
    headAfter,
    exitCode: execution.exitCode,
    signal: execution.signal,
    timedOut: execution.timedOut,
    changedPaths,
    scopeViolations: violations,
    diffCheckPassed,
    invariantFailures,
    response: parsed?.response ?? null,
    stats: parsed?.stats ?? null,
    stderr: execution.stderr.slice(0, 64 * 1024),
    rawOutputCaptured: Boolean(execution.stdout),
    runDir,
  };
  fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ resultPath, status: result.status, changedPaths, invariantFailures }, null, 2));
  if (result.status !== "success") process.exitCode = 1;
}

main().catch((error) => fail(error.message, error.stack));
