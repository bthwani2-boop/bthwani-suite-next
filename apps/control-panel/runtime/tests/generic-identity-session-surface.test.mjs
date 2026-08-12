import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const source = fs.readFileSync(
  path.join(repoRoot, "apps/control-panel/runtime/src/server/bff-proxy.adapter.ts"),
  "utf8",
);

test("generic identity BFF validates plain auth/session identities, not only token responses", () => {
  assert.match(source, /function isGovernedControlPanelIdentity\(identity: unknown\)/);
  assert.match(source, /identitySessionIsBoundToSurface\(identity,\s*"control-panel"\)/);
  assert.match(source, /const isIdentitySession = service === "identity" && upstreamPath === "\/auth\/session"/);
  assert.match(
    source,
    /if \(upstream\.ok && isIdentitySession && !isGovernedControlPanelIdentity\(parsed\)\)[\s\S]*CONTROL_PANEL_FORBIDDEN[\s\S]*clearSessionCookies\(response\)/,
  );
});
