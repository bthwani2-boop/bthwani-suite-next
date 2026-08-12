import assert from "node:assert/strict";
import test from "node:test";

import {
  parseInvocation,
  wrapBrief,
} from "./invoke-claude-opencode-implementer.mjs";

test("Claude wrapper owns orchestrator binding", () => {
  assert.throws(
    () => parseInvocation(["--orchestrator", "codex"]),
    /owns --orchestrator/,
  );
});

test("Claude wrapper requires exactly one brief for real dispatch", () => {
  assert.throws(
    () => parseInvocation(["--worker", "bthwani-agent-8"]),
    /exactly one --brief/,
  );
  const parsed = parseInvocation([
    "--worker", "bthwani-agent-8",
    "--brief", "brief.md",
  ]);
  assert.equal(parsed.brief, "brief.md");
});

test("diagnostic mode passes through without a brief", () => {
  const parsed = parseInvocation(["--diagnostic-only"]);
  assert.equal(parsed.diagnosticOnly, true);
});

test("wrapped brief binds Claude to OpenCode/NVIDIA and forbids Codex handoff", () => {
  const wrapped = wrapBrief("objective: change one bounded file");
  assert.match(wrapped, /Claude -> OpenCode\/NVIDIA -> Claude verification/);
  assert.match(wrapped, /Do not coordinate with.*Codex/);
  assert.match(wrapped, /objective: change one bounded file/);
});
