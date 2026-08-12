import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { repoRoot } from "../guards/_guard-utils.mjs";

const TOOL_ID = "opencode-implementer";
const MAX_BRIEF_BYTES = 12 * 1024;
const MAX_CAPTURE_BYTES = 16 * 1024 * 1024;
const WORK_UNIT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const DURATION_RE = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/;

export const WORKERS = Object.freeze({
  "bthwani-agent-6": "nvidia/nvidia/nemotron-3-ultra-550b-a55b",
  "bthwani-agent-7": "nvidia/z-ai/glm-5.2",
  "bthwani-agent-8": "nvidia/nvidia/nemotron-3-super-120b-a12b",
});

const SELF_PROTECTED = [
  ".git",
  ".agents",
  ".claude",
  ".gemini",
  ".opencode",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "LEAN-CTX.md",
  "opencode.json",
  "governance",
  "tools/scripts/invoke-opencode-implementer.mjs",
  "tools/scripts/invoke-opencode-implementer.test.mjs",
  "tools/scripts/invoke-claude-opencode-implementer.mjs",
  "tools/scripts/invoke-claude-opencode-implementer.test.mjs",
  "tools/scripts/verify-ai-toolchain.ps1",
  "tools/guards/ai-toolchain-environment-gate.mjs",
];

class ToolFailure extends Error {
  constructor(message, detail = "") {
    super(message);
    this.name = "ToolFailure";
    this.detail = detail;
  }
}

function fail(message, detail = "") {
  throw new ToolFailure(message, detail);
}

export function parseArgs(argv) {
  const out = {
    diagnosticOnly: false,
    allowRead: [],
    allowWrite: [],
    forbidWrite: [],
    timeout: "45m",
  };
  const valued = new Set([
    "--orchestrator",
    "--worker",
    "--work-unit",
    "--brief",
    "--expected-branch",
    "--expected-head",
    "--allow-read",
    "--allow-write",
    "--forbid-write",
    "--timeout",
  ]);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--diagnostic-only") out.diagnosticOnly = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
    else if (valued.has(arg)) {
      const value = argv[++i];
      if (!value || value.startsWith("--")) fail(`Missing value for ${arg}.`);
      if (arg === "--allow-read") out.allowRead.push(value);
      else if (arg === "--allow-write") out.allowWrite.push(value);
      else if (arg === "--forbid-write") out.forbidWrite.push(value);
      else {
        const key = {
          "--orchestrator": "orchestrator",
          "--worker": "worker",
          "--work-unit": "workUnit",
          "--brief": "brief",
          "--expected-branch": "expectedBranch",
          "--expected-head": "expectedHead",
          "--timeout": "timeout",
        }[arg];
        out[key] = value;
      }
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }

  return out;
}

function usage() {
  console.log(`Usage:
  node tools/scripts/invoke-opencode-implementer.mjs --diagnostic-only

  node tools/scripts/invoke-opencode-implementer.mjs \\
    --orchestrator codex|claude \\
    --worker bthwani-agent-6|bthwani-agent-7|bthwani-agent-8 \\
    --work-unit <id> \\
    --brief <file> \\
    --expected-branch <branch> \\
    --expected-head <40-char-sha> \\
    --allow-read <repo-relative-prefix> [--allow-read <prefix> ...] \\
    --allow-write <repo-relative-prefix> [--allow-write <prefix> ...] \\
    [--forbid-write <repo-relative-prefix> ...] \\
    [--timeout 45m]`);
}

export function durationMs(value) {
  const match = DURATION_RE.exec(value || "");
  if (!match || !match[0] || !match.slice(1).some(Boolean)) {
    fail(`Invalid timeout '${value}'. Use values such as 30m, 1h, or 1h15m.`);
  }
  return (
    Number(match[1] || 0) * 3600 +
    Number(match[2] || 0) * 60 +
    Number(match[3] || 0)
  ) * 1000;
}

function git(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
    ...options,
  });
  if (result.error || result.status !== 0) {
    fail(
      `Command failed: git ${args.join(" ")}`,
      String(result.stderr || result.error?.message || ""),
    );
  }
  return String(result.stdout || "").trim();
}

function regularFile(filename) {
  try {
    return fs.statSync(filename).isFile();
  } catch {
    return false;
  }
}

let cachedOpenCodeExecutable;

export function resolveOpenCodeExecutable() {
  if (cachedOpenCodeExecutable && regularFile(cachedOpenCodeExecutable)) {
    return cachedOpenCodeExecutable;
  }

  const discovered = [];
  const explicit = process.env.OPENCODE_BIN_PATH?.trim();
  if (explicit) discovered.push(path.resolve(explicit));

  const locator = process.platform === "win32" ? "where.exe" : "which";
  const located = spawnSync(locator, ["opencode"], {
    encoding: "utf8",
    timeout: 10_000,
    windowsHide: true,
  });

  if (!located.error && located.status === 0) {
    discovered.push(
      ...String(located.stdout || "")
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }

  const candidates = [];
  if (process.platform === "win32") {
    candidates.push(...discovered.filter((value) => /\.exe$/i.test(value)));

    const packageNames =
      process.arch === "arm64"
        ? ["opencode-windows-arm64"]
        : ["opencode-windows-x64", "opencode-windows-x64-baseline"];

    for (const shim of discovered) {
      const shimDir = path.dirname(shim);
      candidates.push(
        path.join(
          shimDir,
          "node_modules",
          "opencode-ai",
          "bin",
          "opencode.exe",
        ),
      );
      for (const packageName of packageNames) {
        candidates.push(
          path.join(
            shimDir,
            "node_modules",
            "opencode-ai",
            "node_modules",
            packageName,
            "bin",
            "opencode.exe",
          ),
        );
      }
    }
  } else {
    candidates.push(...discovered);
  }

  for (const candidate of [...new Set(candidates)]) {
    if (!regularFile(candidate)) continue;
    const probe = spawnSync(candidate, ["--version"], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 10_000,
      windowsHide: true,
    });
    if (!probe.error && probe.status === 0) {
      cachedOpenCodeExecutable = candidate;
      return candidate;
    }
  }

  return null;
}

function commandProbe(args, options = {}) {
  const executable = resolveOpenCodeExecutable();
  if (!executable) return null;

  const result = spawnSync(executable, args, {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 30_000,
    windowsHide: true,
    ...options,
  });
  if (result.error || result.status !== 0) return null;
  return String(result.stdout || result.stderr || "").trim();
}

export function normalizeRelativePrefix(raw, label) {
  if (typeof raw !== "string" || !raw.trim()) fail(`${label} must not be empty.`);
  if (path.isAbsolute(raw)) fail(`${label} must be repository-relative: ${raw}`);
  const normalized = path.normalize(raw.trim());
  if (normalized === "." || normalized === "") fail(`${label} may not be repository root.`);
  if (normalized === ".." || normalized.startsWith(`..${path.sep}`)) {
    fail(`${label} escapes repository: ${raw}`);
  }
  const absolute = path.resolve(repoRoot, normalized);
  const rel = path.relative(repoRoot, absolute);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    fail(`${label} escapes repository: ${raw}`);
  }
  return { relative: rel.split(path.sep).join("/"), absolute };
}

export function insideOrEqual(root, target) {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

export function pathsOverlap(a, b) {
  return insideOrEqual(a.absolute, b.absolute) || insideOrEqual(b.absolute, a.absolute);
}

function ensureNoSymlinkPrefix(absolute, label) {
  const rel = path.relative(repoRoot, absolute);
  let cursor = repoRoot;
  for (const segment of rel.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    try {
      if (fs.lstatSync(cursor).isSymbolicLink()) {
        fail(`${label} traverses a symbolic link: ${rel}`);
      }
    } catch (error) {
      if (error instanceof ToolFailure) throw error;
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

export function statusPaths() {
  const raw = spawnSync(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    { cwd: repoRoot, encoding: "utf8", windowsHide: true },
  );
  if (raw.error || raw.status !== 0) {
    fail("Unable to inspect git status.", String(raw.stderr || raw.error?.message || ""));
  }
  const text = String(raw.stdout || "");
  if (!text) return [];

  const fields = text.split("\0");
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

function fileFingerprint(relative) {
  const absolute = path.resolve(repoRoot, relative);
  try {
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      return `link:${fs.readlinkSync(absolute)}`;
    }
    if (stat.isDirectory()) {
      return `dir:${stat.size}:${Math.round(stat.mtimeMs)}`;
    }
    const hash = crypto.createHash("sha256");
    hash.update(fs.readFileSync(absolute));
    return `file:${stat.size}:${hash.digest("hex")}`;
  } catch (error) {
    if (error?.code === "ENOENT") return "absent";
    throw error;
  }
}

export function fingerprintPaths(paths) {
  return new Map(paths.map((relative) => [relative, fileFingerprint(relative)]));
}

export function fingerprintDelta(before, after) {
  const changed = new Set();
  for (const [relative, mark] of after) {
    if (before.get(relative) !== mark) changed.add(relative);
  }
  for (const relative of before.keys()) {
    if (!after.has(relative)) changed.add(relative);
  }
  return [...changed].sort();
}

export function findDirtyScopeConflicts(paths, declared) {
  const conflicts = [];
  for (const relative of paths) {
    const candidate = {
      relative,
      absolute: path.resolve(repoRoot, relative),
    };
    if (declared.some((entry) => pathsOverlap(candidate, entry))) conflicts.push(relative);
  }
  return [...new Set(conflicts)].sort();
}

export function scopeViolations(changedPaths, allowed, forbidden) {
  const violations = [];
  for (const relative of changedPaths) {
    const absolute = path.resolve(repoRoot, relative);
    if (!insideOrEqual(repoRoot, absolute)) {
      violations.push({ path: relative, reason: "OUTSIDE_REPOSITORY" });
    } else if (forbidden.some((entry) => insideOrEqual(entry.absolute, absolute))) {
      violations.push({ path: relative, reason: "FORBIDDEN_PATH" });
    } else if (!allowed.some((entry) => insideOrEqual(entry.absolute, absolute))) {
      violations.push({ path: relative, reason: "OUTSIDE_ALLOWED_WRITE_SCOPE" });
    }
  }
  return violations;
}

function privateRoot() {
  const commonDir = git(["rev-parse", "--git-common-dir"]);
  const root = path.join(path.resolve(repoRoot, commonDir), "bthwani", TOOL_ID);
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  return root;
}

export function acquireLockAt(root) {
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const lockPath = path.join(root, "delegation.lock");
  let fd;
  try {
    fd = fs.openSync(lockPath, "wx", 0o600);
    fs.writeFileSync(
      fd,
      JSON.stringify({
        pid: process.pid,
        repoRoot,
        createdAt: new Date().toISOString(),
      }),
    );
    return lockPath;
  } catch (error) {
    if (error?.code === "EEXIST") {
      fail(
        `Delegation lock already exists at ${lockPath}. Confirm no OpenCode delegation is running before clearing a stale lock.`,
      );
    }
    throw error;
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch {}
    }
  }
}

function releaseLock(lockPath) {
  try {
    fs.unlinkSync(lockPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function readBrief(filename) {
  const resolved = path.resolve(process.cwd(), filename);
  let fd;
  try {
    const noFollow = process.platform === "win32" ? 0 : (fs.constants.O_NOFOLLOW || 0);
    fd = fs.openSync(resolved, fs.constants.O_RDONLY | noFollow);
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) fail(`Brief is not a regular file: ${filename}`);
    if (stat.size > MAX_BRIEF_BYTES) {
      fail(`Brief exceeds ${MAX_BRIEF_BYTES} bytes; keep delegated work units bounded.`);
    }
    const brief = fs.readFileSync(fd, "utf8").trim();
    if (!brief) fail("Brief is empty.");
    return brief;
  } catch (error) {
    if (error instanceof ToolFailure) throw error;
    if (["ENOENT", "ENOTDIR", "ELOOP"].includes(error?.code)) {
      fail(`Brief file not found or not safely readable: ${filename}`);
    }
    throw error;
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch {}
    }
  }
}

function addPatterns(target, prefixes, action) {
  for (const entry of prefixes) {
    target[entry.relative] = action;
    target[`${entry.relative}/**`] = action;
  }
}

export function buildInlineConfig({ worker, model, allowRead, allowWrite, prompt }) {
  const readRules = { "*": "deny" };
  const editRules = { "*": "deny" };
  const listRules = { "*": "deny" };

  addPatterns(readRules, [...allowRead, ...allowWrite], "allow");
  addPatterns(editRules, allowWrite, "allow");
  addPatterns(listRules, [...allowRead, ...allowWrite], "allow");

  return {
    $schema: "https://opencode.ai/config.json",
    share: "disabled",
    snapshot: false,
    autoupdate: false,
    formatter: false,
    lsp: false,
    mcp: {},
    enabled_providers: ["nvidia"],
    permission: { "*": "deny" },
    agent: {
      [worker]: {
        description: "BThwani bounded OpenCode/NVIDIA implementation worker.",
        mode: "primary",
        model,
        temperature: 0.1,
        permission: {
          read: readRules,
          edit: editRules,
          list: listRules,
          glob: "deny",
          grep: "deny",
          bash: "deny",
          task: "deny",
          skill: "deny",
          lsp: "deny",
          external_directory: "deny",
          todowrite: "deny",
          webfetch: "deny",
          websearch: "deny",
          question: "deny",
          doom_loop: "deny",
        },
      },
    },
    command: {
      "bthwani-bounded-work-unit": {
        description: "Execute one bounded BThwani implementation work unit.",
        agent: worker,
        template: prompt,
      },
    },
  };
}

export function validatePinnedState({
  expectedBranch,
  expectedHead,
  actualBranch,
  actualHead,
}) {
  if (actualBranch !== expectedBranch) {
    fail(`Branch mismatch. Expected '${expectedBranch}', got '${actualBranch}'.`);
  }
  if (actualHead !== expectedHead) {
    fail(`HEAD mismatch. Expected '${expectedHead}', got '${actualHead}'.`);
  }
}

function assertResolvedConfig(configText, worker, model) {
  let resolved;
  try {
    resolved = JSON.parse(configText);
  } catch {
    fail("OpenCode resolved configuration was not valid JSON.");
  }
  const agent = resolved?.agent?.[worker];
  if (!agent) fail(`Resolved OpenCode configuration is missing worker '${worker}'.`);
  if (agent.model !== model) {
    fail(`Resolved worker model mismatch. Expected '${model}', got '${String(agent.model)}'.`);
  }
  const permission = agent.permission || {};
  for (const denied of [
    "bash",
    "task",
    "skill",
    "lsp",
    "external_directory",
    "todowrite",
    "webfetch",
    "websearch",
    "question",
    "doom_loop",
  ]) {
    const rule = permission[denied];
    if (rule !== "deny") fail(`Resolved worker permission '${denied}' is not hard-denied.`);
  }
  if (permission?.edit?.["*"] !== "deny") {
    fail("Resolved worker edit policy does not default-deny all paths.");
  }
}

async function spawnOpenCode(args, env, timeoutMsValue) {
  const executable = resolveOpenCodeExecutable();
  if (!executable) {
    fail("OpenCode native executable could not be resolved without a shell.");
  }

  const child = spawn(executable, args, {
    cwd: repoRoot,
    env,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
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

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
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

  return { ...outcome, stdout, stderr, overflow, timedOut };
}

function diagnosticReport() {
  const version = commandProbe(["--pure", "--version"], { timeout: 10_000 });
  if (!version) fail("OpenCode is not installed, not on PATH, or failed its direct version probe.");

  const auth = commandProbe(["--pure", "auth", "list"], { timeout: 20_000 });
  if (!auth || !/Nvidia/i.test(auth)) {
    fail("OpenCode is available but an NVIDIA credential was not found in 'opencode auth list'.");
  }

  const models = commandProbe(["--pure", "models", "nvidia"], { timeout: 30_000 });
  if (!models) fail("Unable to list NVIDIA models through OpenCode.");

  const missingModels = Object.values(WORKERS).filter((model) => !models.includes(model));
  if (missingModels.length) {
    fail(`Required NVIDIA models are unavailable: ${missingModels.join(", ")}`);
  }

  return {
    tool: TOOL_ID,
    state: "VERIFIED_AVAILABLE",
    version: version.split(/\r?\n/)[0],
    authenticationProbe: "NVIDIA credential present",
    workers: WORKERS,
  };
}

export function runtimeModelDisplayName(model) {
  if (typeof model !== "string") {
    fail("Runtime model binding must be a string.");
  }

  const separator = model.indexOf("/");
  if (separator <= 0 || separator === model.length - 1) {
    fail("Invalid provider-qualified model binding: " + String(model));
  }

  return model.slice(separator + 1);
}

export function outputProvesWorkerModelBinding(output, worker, model) {
  const normalized = String(output || "")
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\r\n/g, "\n");

  const runtimeModel = runtimeModelDisplayName(model);
  const bindingMarker = worker + " · " + runtimeModel;

  return normalized
    .split("\n")
    .some((line) => line.includes(bindingMarker));
}
export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    usage();
    return 0;
  }

  const diagnostics = diagnosticReport();
  if (args.diagnosticOnly) {
    console.log(JSON.stringify(diagnostics, null, 2));
    return 0;
  }

  if (!["codex", "claude"].includes(args.orchestrator)) {
    fail("--orchestrator must be exactly codex or claude.");
  }
  if (!WORKERS[args.worker]) {
    fail(`Unknown --worker '${String(args.worker)}'.`);
  }
  if (!args.workUnit || !WORK_UNIT_RE.test(args.workUnit)) {
    fail("--work-unit must match the bounded work-unit identifier contract.");
  }
  if (!args.brief) fail("--brief is required.");
  if (!args.expectedBranch) fail("--expected-branch is required.");
  if (!/^[0-9a-f]{40}$/.test(args.expectedHead || "")) {
    fail("--expected-head must be an exact lowercase 40-character Git SHA.");
  }
  if (!args.allowRead.length) fail("At least one --allow-read prefix is required.");
  if (!args.allowWrite.length) fail("At least one --allow-write prefix is required.");

  const timeoutMsValue = durationMs(args.timeout);
  const allowRead = args.allowRead.map((value) => normalizeRelativePrefix(value, "--allow-read"));
  const allowWrite = args.allowWrite.map((value) => normalizeRelativePrefix(value, "--allow-write"));
  const userForbidden = args.forbidWrite.map((value) => normalizeRelativePrefix(value, "--forbid-write"));
  const protectedEntries = SELF_PROTECTED.map((value) => normalizeRelativePrefix(value, "protected path"));
  const forbidden = [...userForbidden, ...protectedEntries];

  for (const entry of [...allowRead, ...allowWrite, ...userForbidden]) {
    ensureNoSymlinkPrefix(entry.absolute, entry.relative);
  }

  for (const writeEntry of allowWrite) {
    const conflict = protectedEntries.find((entry) => pathsOverlap(writeEntry, entry));
    if (conflict) {
      fail(
        `Allowed write scope '${writeEntry.relative}' overlaps protected control path '${conflict.relative}'.`,
      );
    }
    const forbiddenConflict = userForbidden.find((entry) => pathsOverlap(writeEntry, entry));
    if (forbiddenConflict) {
      fail(
        `Allowed write scope '${writeEntry.relative}' overlaps explicitly forbidden path '${forbiddenConflict.relative}'.`,
      );
    }
  }

  const beforeBranch = git(["branch", "--show-current"]);
  const beforeHead = git(["rev-parse", "HEAD"]);
  validatePinnedState({
    expectedBranch: args.expectedBranch,
    expectedHead: args.expectedHead,
    actualBranch: beforeBranch,
    actualHead: beforeHead,
  });

  const beforeStatus = statusPaths();
  const dirtyConflicts = findDirtyScopeConflicts(beforeStatus, [...allowRead, ...allowWrite]);
  if (dirtyConflicts.length) {
    fail(
      "Pre-existing dirty paths overlap the declared read/write scope. Reconcile only those paths before dispatch.",
      dirtyConflicts.join("\n"),
    );
  }
  const beforeDirtyFingerprints = fingerprintPaths(beforeStatus);

  const brief = readBrief(args.brief);
  const model = WORKERS[args.worker];
  const prompt = [
    "BTHWANI_BOUNDED_IMPLEMENTATION_WORK_UNIT",
    `work_unit_id: ${args.workUnit}`,
    `orchestrator: ${args.orchestrator}`,
    `worker: ${args.worker}`,
    `model: ${model}`,
    `expected_branch: ${args.expectedBranch}`,
    `expected_head: ${args.expectedHead}`,
    `allowed_read_paths: ${allowRead.map((entry) => entry.relative).join(", ")}`,
    `allowed_write_paths: ${allowWrite.map((entry) => entry.relative).join(", ")}`,
    `forbidden_paths: ${forbidden.map((entry) => entry.relative).join(", ")}`,
    "",
    "Execution rules:",
    "- You are implementation-only. Do not plan beyond the supplied work unit.",
    "- Use only the read/list/edit tools made available by the enforced runtime policy.",
    "- Do not request shell, git, web, task, skill, LSP, external-directory, or interactive tools.",
    "- Do not commit, push, merge, branch-switch, reset, rebase, stash, clean, release, approve, or expand scope.",
    "- Do not modify governance, adapters, agent control files, delegation scripts, or .git.",
    "- Stop and report insufficient scope rather than writing outside the declared write paths.",
    "",
    "IMPLEMENTATION_BRIEF:",
    brief,
    "",
    "At completion, report the files changed and a concise implementation summary. Do not claim orchestrator verification.",
  ].join("\n");

  const inlineConfig = buildInlineConfig({
    worker: args.worker,
    model,
    allowRead,
    allowWrite,
    prompt,
  });

  const env = {
    ...process.env,
    OPENCODE_CONFIG_CONTENT: JSON.stringify(inlineConfig),
    OPENCODE_DISABLE_AUTOUPDATE: "1",
    OPENCODE_DISABLE_CLAUDE_CODE: "1",
  };

  const configProbe = commandProbe(["--pure", "debug", "config"], {
    env,
    timeout: 20_000,
  });
  if (!configProbe) fail("OpenCode resolved configuration probe failed.");
  assertResolvedConfig(configProbe, args.worker, model);

  const lockRoot = privateRoot();
  const lockPath = acquireLockAt(lockRoot);

  try {
    const result = await spawnOpenCode(
      [
        "--pure",
        "run",
        "--agent",
        args.worker,
        "--command",
        "bthwani-bounded-work-unit",
        "--dir",
        repoRoot,
        "--format",
        "default",
      ],
      env,
      timeoutMsValue,
    );

    if (result.overflow) fail("OpenCode output exceeded the capture limit.");
    if (result.timedOut) fail(`OpenCode worker timed out after '${args.timeout}'.`);
    if (result.error || result.exitCode !== 0) {
      fail(
        `OpenCode worker failed with exit code ${String(result.exitCode)}.`,
        [result.error, result.stderr, result.stdout].filter(Boolean).join("\n"),
      );
    }

    const executionOutput = `${result.stdout}\n${result.stderr}`;
    if (!outputProvesWorkerModelBinding(executionOutput, args.worker, model)) {
      fail(
        "OpenCode output did not prove the selected worker/model binding; fallback or output drift is possible.",
        executionOutput.slice(0, 8000),
      );
    }

    const afterBranch = git(["branch", "--show-current"]);
    const afterHead = git(["rev-parse", "HEAD"]);
    validatePinnedState({
      expectedBranch: args.expectedBranch,
      expectedHead: args.expectedHead,
      actualBranch: afterBranch,
      actualHead: afterHead,
    });

    const afterStatus = statusPaths();
    const afterDirtyFingerprints = fingerprintPaths(beforeStatus);
    const unrelatedDirtyMutation = fingerprintDelta(
      beforeDirtyFingerprints,
      afterDirtyFingerprints,
    );
    if (unrelatedDirtyMutation.length) {
      fail(
        "Pre-existing dirty paths changed during delegation.",
        unrelatedDirtyMutation.join("\n"),
      );
    }

    const beforeSet = new Set(beforeStatus);
    const workerChangedPaths = afterStatus.filter((relative) => !beforeSet.has(relative));
    if (!workerChangedPaths.length) {
      fail("OpenCode delegation produced no Git-visible implementation change.");
    }

    const violations = scopeViolations(workerChangedPaths, allowWrite, forbidden);
    if (violations.length) {
      fail(
        "OpenCode delegation changed paths outside the allowed write envelope.",
        JSON.stringify(violations, null, 2),
      );
    }

    const diffCheck = spawnSync("git", ["diff", "--check"], {
      cwd: repoRoot,
      encoding: "utf8",
      windowsHide: true,
    });
    if (diffCheck.error || diffCheck.status !== 0) {
      fail("git diff --check failed after OpenCode delegation.", String(diffCheck.stdout || diffCheck.stderr || ""));
    }

    console.log(
      JSON.stringify(
        {
          tool: TOOL_ID,
          state: "IMPLEMENTATION_RETURNED",
          orchestrator: args.orchestrator,
          worker: args.worker,
          model,
          workUnit: args.workUnit,
          expectedBranch: args.expectedBranch,
          expectedHead: args.expectedHead,
          changedPaths: workerChangedPaths,
          preExistingDirtyIgnored: beforeStatus,
          verificationBoundary:
            "Execution envelope only. Orchestrator must review the complete diff, re-pin branch/head, run verification, and own commit/push.",
          workerOutput: result.stdout.trim(),
        },
        null,
        2,
      ),
    );
    return 0;
  } finally {
    releaseLock(lockPath);
  }
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(
        `[OPENCODE-DELEGATION FAIL] ${error?.message || String(error)}${
          error?.detail ? `\n${error.detail}` : ""
        } decision=FIX_REQUIRED`,
      );
      process.exitCode = 1;
    });
}
