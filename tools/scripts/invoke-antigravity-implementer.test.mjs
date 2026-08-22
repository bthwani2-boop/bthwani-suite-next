import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NON_READ_HOOK_MATCHER, durationMs, fingerprintDelta, fingerprintPaths, parseArgs } from "./invoke-antigravity-implementer.mjs";

test("parses bounded invocation", () => {
  const result = parseArgs(["--orchestrator", "codex", "--work-unit", "u1", "--brief", "b.md", "--expected-branch", "BB", "--expected-head", "0123456789abcdef0123456789abcdef01234567", "--allow-read", "services", "--allow-write", "services/a", "--forbid-write", "services/a/generated", "--model", "gemini-3.6-flash", "--timeout", "1h15m"]);
  assert.equal(result.orchestrator, "codex");
  assert.equal(result.workUnit, "u1");
  assert.equal(result.expectedHead, "0123456789abcdef0123456789abcdef01234567");
  assert.deepEqual(result.allowRead, ["services"]);
  assert.deepEqual(result.allowWrite, ["services/a"]);
  assert.deepEqual(result.forbidWrite, ["services/a/generated"]);
  assert.equal(result.model, "gemini-3.6-flash");
});

test("diagnostic mode is recognized", () => {
  assert.equal(parseArgs(["--diagnostic-only"]).diagnosticOnly, true);
});

test("orchestrator identity is explicit", () => {
  const parsed = parseArgs(["--orchestrator", "claude"]);
  assert.equal(parsed.orchestrator, "claude");
});

test("unknown arguments fail closed", () => {
  assert.throws(() => parseArgs(["--dangerously-skip-permissions"]), /Unknown argument/);
});

test("duration parser is deterministic", () => {
  assert.equal(durationMs("1h15m"), 4_500_000);
  assert.throws(() => durationMs("forever"), /Invalid timeout/);
});

test("hook matcher skips read-only tools and intercepts everything else", () => {
  const matcher = new RegExp(NON_READ_HOOK_MATCHER);
  for (const name of ["view_file", "list_dir", "grep_search", "find_by_name"]) assert.equal(matcher.test(name), false);
  for (const name of ["write_to_file", "replace_file_content", "run_command", "call_mcp_tool", "future_mutating_tool"]) assert.equal(matcher.test(name), true);
});

test("fingerprint delta reports creation, modification, and deletion", () => {
  const before = new Map([["kept.md", "file:10:1"], ["edited.md", "file:10:1"], ["removed.md", "file:5:1"]]);
  const after = new Map([["kept.md", "file:10:1"], ["edited.md", "file:22:9"], ["created.md", "file:3:9"]]);
  assert.deepEqual(fingerprintDelta(before, after), ["created.md", "edited.md", "removed.md"]);
});

test("fingerprint delta is empty for an unchanged tree", () => {
  const snapshot = new Map([["a.md", "file:1:1"], ["cache/", "dir:7"]]);
  assert.deepEqual(fingerprintDelta(snapshot, new Map(snapshot)), []);
});

test("fingerprint distinguishes files, directories, and absent paths", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-fingerprint-"));
  try {
    fs.writeFileSync(path.join(root, "note.md"), "one");
    fs.mkdirSync(path.join(root, "cache"));
    const marks = fingerprintPaths(["note.md", "cache/", "missing.md"], root);
    assert.match(marks.get("note.md"), /^file:3:\d+$/);
    assert.match(marks.get("cache/"), /^dir:\d+$/);
    assert.equal(marks.get("missing.md"), "absent");
    fs.writeFileSync(path.join(root, "note.md"), "one-plus-more");
    const after = fingerprintPaths(["note.md"], root);
    assert.notEqual(after.get("note.md"), marks.get("note.md"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
