import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../../${path}`, import.meta.url), "utf8");

test("all product session gates consume the canonical surface policy", async () => {
  const [mobileGate, controlPanelBoundary, devSession, sessionStore] = await Promise.all([
    read("services/dsh/frontend/shared/session/IdentitySessionGate.tsx"),
    read("services/dsh/frontend/shared/session/ControlPanelAuthBoundary.tsx"),
    read("apps/control-panel/runtime/src/app/api/auth/dev-session/route.ts"),
    read("core/identity/clients/identity-session-store.ts"),
  ]);

  assert.match(mobileGate, /identitySessionAuthorizesSurface/);
  assert.match(controlPanelBoundary, /identitySessionIsBoundToSurface/);
  assert.match(devSession, /identitySessionAuthorizesSurface/);
  assert.doesNotMatch(sessionStore, /commitAuthenticatedSession\(saved,\s*false\)/);
  assert.doesNotMatch(sessionStore, /client\.logout\(accessToken\)\.catch\(\(\) => undefined\)/);
});

test("removes stale declarations, temporary diagnostics, and unbound session artifacts", async () => {
  const [clientSource, storeSource, hookSource, model] = await Promise.all([
    read("core/identity/clients/identity-client.ts"),
    read("core/identity/clients/identity-session-store.ts"),
    read("core/identity/clients/use-identity-session.ts"),
    read("core/identity/backend/internal/identity/model.go"),
  ]);

  assert.doesNotMatch(storeSource, /devBypassLogin/);
  assert.match(clientSource, /requestOtp/);
  assert.match(storeSource, /activateIdentity\(\s*\n\s*actorType: ActivationActorType/);
  assert.match(hookSource, /revokeSession/);
  assert.doesNotMatch(model, /SupportSession/);
  assert.doesNotMatch(model, /SessionKind/);

  for (const removedPath of [
    ".github/workflows/tmp-diagnostics.yml",
    "core/identity/backend/internal/identity/support_sessions.go",
    "core/identity/backend/internal/http/support_sessions.go",
    "core/identity/clients/generated/identity-api.d.ts",
    "core/identity/clients/generated/identity-api.d.ts.map",
    "core/identity/clients/generated/identity-api.js",
    "core/identity/clients/generated/identity-api.js.map",
    "core/identity/clients/identity-client.d.ts",
    "core/identity/clients/identity-client.d.ts.map",
    "core/identity/clients/identity-client.js",
    "core/identity/clients/identity-client.js.map",
    "core/identity/clients/identity-session-store.d.ts",
    "core/identity/clients/identity-session-store.d.ts.map",
    "core/identity/clients/identity-session-store.js",
    "core/identity/clients/identity-session-store.js.map",
    "core/identity/clients/index.d.ts",
    "core/identity/clients/index.d.ts.map",
    "core/identity/clients/index.js",
    "core/identity/clients/index.js.map",
    "core/identity/clients/use-identity-session.d.ts",
    "core/identity/clients/use-identity-session.d.ts.map",
    "core/identity/clients/use-identity-session.js",
    "core/identity/clients/use-identity-session.js.map",
  ]) {
    assert.equal(existsSync(removedPath), false, `${removedPath} must remain removed`);
  }
});
