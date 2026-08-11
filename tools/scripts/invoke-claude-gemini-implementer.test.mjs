import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parseInvocation, readBrief, wrapBrief } from "./invoke-claude-gemini-implementer.mjs";

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

if (process.platform !== "win32") {
  test("rejects a symlinked Claude brief", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-claude-brief-"));
    const target = path.join(root, "target.md");
    const link = path.join(root, "brief.md");
    fs.writeFileSync(target, "objective: secret");
    fs.symlinkSync(target, link);
    assert.throws(() => readBrief(link), /not safely readable/);
  });
}
