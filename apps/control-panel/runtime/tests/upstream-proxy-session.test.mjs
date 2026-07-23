import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const proxy = fs.readFileSync(
  path.join(
    repoRoot,
    "apps/control-panel/runtime/src/app/api/adapters/upstream-proxy.adapter.ts",
  ),
  "utf8",
);

test("authenticated service proxy refreshes a missing or rejected access token", () => {
  assert.match(proxy, /if \(!accessToken\)/);
  assert.match(proxy, /if \(!refreshToken\)/);
  assert.match(proxy, /upstream\.status === 401 && refreshToken/);
  assert.match(proxy, /rotateOperatorSession\(refreshToken\)/);
  assert.match(proxy, /setSessionCookies\(response, rotatedCookies\)/);
});

test("authenticated service proxy never persists a non-operator rotation", () => {
  assert.match(proxy, /rotated\.identity\.roles\.includes\("operator"\)/);
  assert.match(proxy, /CONTROL_PANEL_FORBIDDEN/);
  assert.match(proxy, /clearSessionCookies\(response\)/);
});
