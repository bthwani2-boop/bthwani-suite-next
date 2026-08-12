import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const RELAY = "tools/scripts/invoke-opencode-implementer.mjs";
const MAX_BRIEF_BYTES = 10 * 1024;
const EXTRA_FORBIDDEN = [
  "CLAUDE.md",
  ".claude",
  ".agents",
  "governance",
  "tools/scripts/invoke-claude-opencode-implementer.mjs",
  "tools/scripts/invoke-claude-opencode-implementer.test.mjs",
];

function fail(message) {
  throw new Error(message);
}

export function parseInvocation(argv) {
  if (argv.includes("--orchestrator")) {
    fail("Claude wrapper owns --orchestrator and forbids overriding it.");
  }
  if (argv.includes("--diagnostic-only")) {
    return { diagnosticOnly: true, relayArgs: [...argv] };
  }
  const indexes = argv
    .map((value, index) => (value === "--brief" ? index : -1))
    .filter((index) => index >= 0);
  if (indexes.length !== 1) {
    fail("Claude OpenCode delegation requires exactly one --brief argument.");
  }
  const index = indexes[0];
  const brief = argv[index + 1];
  if (!brief || brief.startsWith("--")) {
    fail("Claude OpenCode delegation requires a value for --brief.");
  }
  return {
    diagnosticOnly: false,
    briefIndex: index,
    brief,
    relayArgs: [...argv],
  };
}

export function wrapBrief(original) {
  return [
    "ORCHESTRATOR_BINDING:",
    "- orchestrator: Claude",
    "- implementer: OpenCode using the explicitly selected approved NVIDIA worker",
    "- verifier: Claude",
    "- route: Claude -> OpenCode/NVIDIA -> Claude verification",
    "- Do not coordinate with, hand off to, or request verification from Codex for this work unit.",
    "- Claude owns diagnosis, scope, final diff review, branch/head re-pinning, developer verification, rework, commit, and push decisions.",
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
    const noFollow =
      process.platform === "win32" ? 0 : (fs.constants.O_NOFOLLOW || 0);
    fd = fs.openSync(resolved, fs.constants.O_RDONLY | noFollow);
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) fail(`Brief is not a regular file: ${filename}`);
    if (stat.size > MAX_BRIEF_BYTES) {
      fail(`Brief exceeds ${MAX_BRIEF_BYTES} bytes before Claude binding.`);
    }
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

export function run(argv = process.argv.slice(2)) {
  const parsed = parseInvocation(argv);
  const relayPath = path.resolve(process.cwd(), RELAY);
  if (!fs.existsSync(relayPath)) {
    fail(`Shared OpenCode relay not found: ${RELAY}`);
  }

  let tempDir;
  try {
    const relayArgs = ["--orchestrator", "claude", ...parsed.relayArgs];

    if (!parsed.diagnosticOnly) {
      const original = readBrief(parsed.brief);
      tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "bthwani-claude-opencode-"),
      );
      const wrapped = path.join(tempDir, "brief.md");
      fs.writeFileSync(wrapped, wrapBrief(original), {
        encoding: "utf8",
        mode: 0o600,
      });

      const relayBriefIndex = relayArgs.indexOf("--brief");
      relayArgs[relayBriefIndex + 1] = wrapped;
      for (const forbidden of EXTRA_FORBIDDEN) {
        relayArgs.push("--forbid-write", forbidden);
      }
    }

    const result = spawnSync(
      process.execPath,
      [relayPath, ...relayArgs],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: "inherit",
        windowsHide: true,
      },
    );
    if (result.error) throw result.error;
    return result.status ?? 1;
  } finally {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  try {
    process.exitCode = run();
  } catch (error) {
    console.error(
      `[CLAUDE-OPENCODE-DELEGATION FAIL] ${
        error?.message || String(error)
      } decision=FIX_REQUIRED`,
    );
    process.exitCode = 1;
  }
}
