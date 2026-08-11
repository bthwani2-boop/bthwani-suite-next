import assert from "node:assert/strict";
import test from "node:test";
import { durationMs, parseArgs } from "./invoke-antigravity-implementer.mjs";

test("parses bounded invocation", () => {
  const result = parseArgs(["--orchestrator", "codex", "--work-unit", "u1", "--brief", "b.md", "--expected-branch", "BB", "--allow-write", "services/a", "--forbid-write", "services/a/generated", "--model", "gemini-3.6-flash", "--timeout", "1h15m"]);
  assert.equal(result.orchestrator, "codex");
  assert.equal(result.workUnit, "u1");
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
