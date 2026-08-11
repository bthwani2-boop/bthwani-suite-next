import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parseInvocation, readBrief, wrapBrief } from "./invoke-claude-antigravity-implementer.mjs";

test("requires one brief for implementation", () => assert.throws(() => parseInvocation(["--work-unit", "x"]), /exactly one --brief/));
test("allows diagnostic mode without a brief", () => assert.equal(parseInvocation(["--diagnostic-only"]).diagnosticOnly, true));
test("forbids orchestrator spoofing", () => assert.throws(() => parseInvocation(["--orchestrator", "codex", "--diagnostic-only"]), /forbids overriding/));
test("wrap binds Claude as orchestrator and verifier", () => {
  const wrapped = wrapBrief("objective: change one file");
  assert.match(wrapped, /orchestrator: Claude/);
  assert.match(wrapped, /Antigravity CLI \(agy\)/);
  assert.match(wrapped, /Do not coordinate with, hand off to, or request verification from Codex/);
});
if (process.platform !== "win32") {
  test("rejects a symlinked Claude brief", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-claude-brief-"));
    const target = path.join(root, "target.md"); const link = path.join(root, "brief.md");
    fs.writeFileSync(target, "objective: secret"); fs.symlinkSync(target, link);
    assert.throws(() => readBrief(link), /not safely readable/);
  });
}
