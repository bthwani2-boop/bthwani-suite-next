import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RELAY = "tools/scripts/invoke-gemini-implementer.mjs";
const SELF = "tools/scripts/invoke-claude-gemini-implementer.mjs";
const MAX_BRIEF_BYTES = 120 * 1024;
const EXTRA_FORBIDDEN = [
  "CLAUDE.md",
  ".claude",
  "governance",
  SELF,
  "tools/scripts/invoke-claude-gemini-implementer.test.mjs",
];

function fail(message) {
  throw new Error(message);
}

export function parseInvocation(argv) {
  if (argv.includes("--diagnostic-only")) {
    return { diagnosticOnly: true, relayArgs: [...argv] };
  }

  const briefIndexes = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--brief") briefIndexes.push(i);
  }
  if (briefIndexes.length !== 1) {
    fail("Claude delegation requires exactly one --brief argument.");
  }
  const index = briefIndexes[0];
  const brief = argv[index + 1];
  if (!brief || brief.startsWith("--")) fail("Claude delegation requires a value for --brief.");
  return { diagnosticOnly: false, briefIndex: index, brief, relayArgs: [...argv] };
}

export function wrapBrief(original) {
  return [
    "ORCHESTRATOR_BINDING:",
    "- orchestrator: Claude Code",
    "- implementer: Gemini CLI",
    "- verifier: Claude Code",
    "- route: Claude -> Gemini -> Claude verification",
    "- This binding is specific to this work unit. The shared relay may contain a generic Codex-default verifier sentence; for this invocation that sentence names the orchestrator role, and the current orchestrator is Claude Code.",
    "- Do not coordinate with, hand off to, or request verification from Codex for this work unit.",
    "- Claude owns diagnosis, scope, final diff review, re-pinning, developer verification, and any rework decision.",
    "",
    "ORIGINAL_IMPLEMENTATION_BRIEF:",
    original.trim(),
    "",
  ].join("\n");
}

export function readBrief(filename) {
  const resolved = path.resolve(process.cwd(), filename);
  let fd;
  try {
    const noFollow = process.platform === "win32" ? 0 : (fs.constants.O_NOFOLLOW || 0);
    fd = fs.openSync(resolved, fs.constants.O_RDONLY | noFollow);
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) fail(`Brief is not a regular file: ${filename}`);
    if (stat.size > MAX_BRIEF_BYTES) fail(`Brief exceeds ${MAX_BRIEF_BYTES} bytes before Claude binding.`);
    const content = fs.readFileSync(fd, "utf8");
    if (!content.trim()) fail("Brief is empty.");
    return content;
  } catch (error) {
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

function buildRelayArgs(parsed, wrappedBriefPath) {
  const args = [...parsed.relayArgs];
  if (!parsed.diagnosticOnly) args[parsed.briefIndex + 1] = wrappedBriefPath;
  for (const forbidden of EXTRA_FORBIDDEN) {
    args.push("--forbid-write", forbidden);
  }
  return args;
}

export function run(argv = process.argv.slice(2)) {
  const parsed = parseInvocation(argv);
  const relayPath = path.resolve(process.cwd(), RELAY);
  if (!fs.existsSync(relayPath)) fail(`Shared Gemini relay not found: ${RELAY}`);

  let tempDir;
  try {
    let wrappedBriefPath;
    if (!parsed.diagnosticOnly) {
      const original = readBrief(parsed.brief);
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-claude-gemini-"));
      wrappedBriefPath = path.join(tempDir, "brief.md");
      fs.writeFileSync(wrappedBriefPath, wrapBrief(original), { encoding: "utf8", mode: 0o600 });
    }

    const relayArgs = buildRelayArgs(parsed, wrappedBriefPath);
    const result = spawnSync(process.execPath, [relayPath, ...relayArgs], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
      windowsHide: true,
    });
    if (result.error) throw result.error;
    return result.status ?? 1;
  } finally {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  try {
    process.exitCode = run();
  } catch (error) {
    console.error(`[CLAUDE-GEMINI-DELEGATION FAIL] ${error?.message || String(error)} decision=FIX_REQUIRED`);
    process.exitCode = 1;
  }
}
