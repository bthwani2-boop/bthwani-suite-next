import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const proxy = fs.readFileSync(
  path.join(
    repoRoot,
    "apps/control-panel/runtime/src/server/bff-proxy.adapter.ts",
  ),
  "utf8",
);

test("canonical BFF refreshes a missing or rejected access token", () => {
  assert.match(proxy, /!accessToken/);
  assert.match(proxy, /if \(!refreshToken\)/);
  assert.match(proxy, /upstream\.status === 401 && refreshToken && !rotatedCookies/);
  assert.match(proxy, /rotateControlPanelSession\(refreshToken\)/);
  assert.match(proxy, /setSessionCookies\(response, rotatedCookies\)/);
});

test("canonical BFF never persists a non-control-panel rotation", () => {
  assert.match(proxy, /identitySessionIsBoundToSurface\(rotated\.identity,\s*"control-panel"\)/);
  assert.match(proxy, /CONTROL_PANEL_FORBIDDEN/);
  assert.match(proxy, /clearSessionCookies\(response\)/);
});

test("canonical BFF rejects missing production targets and unsafe paths", () => {
  assert.match(proxy, /if \(!baseUrl\)/);
  assert.match(proxy, /BFF_UPSTREAM_NOT_CONFIGURED/);
  assert.match(proxy, /function pathIsSafe/);
  assert.match(proxy, /segment !== "\."/);
  assert.match(proxy, /segment !== "\.\."/);
  assert.match(proxy, /!segment\.includes\("\/"\)/);
  assert.match(proxy, /!segment\.includes\("\\\\"\)/);
  assert.match(proxy, /BFF_PATH_NOT_ALLOWED/);
});
