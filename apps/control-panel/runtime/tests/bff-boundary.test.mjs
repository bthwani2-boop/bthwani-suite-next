import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const proxy = fs.readFileSync(
  path.join(repoRoot, "apps/control-panel/runtime/src/server/bff-proxy.adapter.ts"),
  "utf8",
);

test("control-panel has no direct WLT upstream or browser route", () => {
  assert.match(proxy, /dsh:\s*\{/);
  assert.doesNotMatch(proxy, /\bwlt:\s*\{/);
  assert.doesNotMatch(proxy, /WLT_API_BASE_URL/);
  assert.doesNotMatch(proxy, /\/api\/wlt/);
  assert.doesNotMatch(proxy, /58083/);
});
