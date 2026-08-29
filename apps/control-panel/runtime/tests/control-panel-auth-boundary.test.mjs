import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const source = fs.readFileSync(
  path.join(repoRoot, "services/dsh/frontend/shared/session/ControlPanelAuthBoundary.tsx"),
  "utf8",
);
const routes = await import(
  path.join(repoRoot, "services/dsh/frontend/shared/control-panel-routes.ts")
);

test("protected control-panel children require a proven control-panel session", () => {
  assert.match(source, /authenticatedForControlPanel[\s\S]*identitySessionIsBoundToSurface\(state\.identity,\s*"control-panel"\)/);
  assert.match(source, /if \(state\.kind === "unconfigured"\)/);
  assert.match(source, /if \(state\.kind === "service_unavailable"\)/);
  assert.match(source, /if \(authenticatedForControlPanel\) \{\s*return <>\{children\}<\/>;\s*\}/s);
  assert.match(source, /return loadingPanel\(\);\s*\n}/);
  assert.doesNotMatch(source, /\n\s*return <>\{children\}<\/>;\s*\n}/);
});

test("control-panel authentication preserves governed DSH and WLT return paths", () => {
  assert.equal(routes.resolveControlPanelReturnTo("/dsh/operations"), "/dsh/operations");
  assert.equal(routes.resolveControlPanelReturnTo("/wlt/finance"), "/wlt/finance");
  assert.equal(routes.resolveControlPanelReturnTo("/wlt/finance/ledger-inspector"), "/wlt/finance/ledger-inspector");
  assert.equal(routes.resolveControlPanelReturnTo("https://evil.example/path"), "/dsh/dashboard");
  assert.equal(routes.resolveControlPanelReturnTo("/outside"), "/dsh/dashboard");
  assert.match(source, /resolveControlPanelReturnTo\(pathname\)/);
});
