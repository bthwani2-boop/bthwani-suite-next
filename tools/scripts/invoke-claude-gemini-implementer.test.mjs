import assert from "node:assert/strict";
import test from "node:test";
import { parseInvocation, wrapBrief } from "./invoke-claude-gemini-implementer.mjs";

test("requires one brief for implementation", () => {
  assert.throws(() => parseInvocation(["--work-unit", "x"]), /exactly one --brief/);
});

test("rejects duplicate brief flags", () => {
  assert.throws(
    () => parseInvocation(["--brief", "a.md", "--brief", "b.md"]),
    /exactly one --brief/,
  );
});

test("diagnostic mode passes through without a brief", () => {
  const parsed = parseInvocation(["--diagnostic-only"]);
  assert.equal(parsed.diagnosticOnly, true);
});

test("wrap binds Claude as orchestrator and verifier", () => {
  const wrapped = wrapBrief("objective: change one file");
  assert.match(wrapped, /orchestrator: Claude Code/);
  assert.match(wrapped, /verifier: Claude Code/);
  assert.match(wrapped, /Do not coordinate with, hand off to, or request verification from Codex/);
  assert.match(wrapped, /objective: change one file/);
});
