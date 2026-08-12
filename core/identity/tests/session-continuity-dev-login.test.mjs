import assert from "node:assert/strict";
import test from "node:test";

import {
  isFreshActorIdentity,
  isStructurallyValidActorIdentity,
  parseStoredSession,
} from "../clients/identity-session-store.ts";
import {
  governedIdentitySurfaceForRole,
  identitySessionAuthorizesSurface,
} from "../clients/identity-session-policy.ts";

const ROLE_SURFACE = Object.freeze({
  operator: "control-panel",
  client: "app-client",
  partner: "app-partner",
  field: "app-field",
  captain: "app-captain",
});

function identity(expiresAt, role = "client", surface = ROLE_SURFACE[role]) {
  return {
    subject: `${role}-local-001`,
    operatorContextId: "local-dsh",
    phoneE164: "+967772222222",
    roles: [role],
    permissions: [
      {
        service: "dsh",
        surface,
        action: "read",
        scope: "own",
      },
    ],
    authState: "authenticated",
    surfaceAccess: { [surface]: true },
    serviceAccess: { dsh: true },
    sessionSurface: surface,
    sessionId: "session-1",
    expiresAt,
  };
}

test("stored session remains restorable after access identity expiry", () => {
  const expired = identity(new Date(Date.now() - 60_000).toISOString());
  assert.equal(isStructurallyValidActorIdentity(expired), true);
  assert.equal(isFreshActorIdentity(expired), false);

  const restored = parseStoredSession(JSON.stringify({
    accessToken: "expired-access-token",
    refreshToken: "still-valid-refresh-token",
    identity: expired,
  }));

  assert.ok(
    restored,
    "expired access identity must not delete refresh state before refresh is attempted",
  );
  assert.equal(restored.refreshToken, "still-valid-refresh-token");
});

test("malformed stored identity still fails closed", () => {
  const malformed = identity("not-a-date");
  assert.equal(isStructurallyValidActorIdentity(malformed), false);
  assert.equal(
    parseStoredSession(JSON.stringify({
      accessToken: "access",
      refreshToken: "refresh",
      identity: malformed,
    })),
    null,
  );
});

test("every governed role is bound to exactly one session surface", () => {
  for (const [role, expectedSurface] of Object.entries(ROLE_SURFACE)) {
    assert.equal(governedIdentitySurfaceForRole(role), expectedSurface);
    const actor = identity(new Date(Date.now() + 60_000).toISOString(), role, expectedSurface);

    for (const candidateSurface of Object.values(ROLE_SURFACE)) {
      assert.equal(
        identitySessionAuthorizesSurface(actor, role, candidateSurface),
        candidateSurface === expectedSurface,
        `${role} session must authorize only ${expectedSurface}, not ${candidateSurface}`,
      );
    }
  }
  assert.equal(governedIdentitySurfaceForRole("unknown-role"), null);
});

test("surfaceAccess cannot substitute for the active sessionSurface", () => {
  const actor = identity(new Date(Date.now() + 60_000).toISOString(), "client", "app-client");
  actor.surfaceAccess["app-partner"] = true;

  assert.equal(identitySessionAuthorizesSurface(actor, "client", "app-client"), true);
  assert.equal(identitySessionAuthorizesSurface(actor, "partner", "app-partner"), false);
});

test("multi-role identity cannot use an app session as an operator control-panel session", () => {
  const actor = identity(new Date(Date.now() + 60_000).toISOString(), "client", "app-client");
  actor.roles.push("operator");
  actor.surfaceAccess["control-panel"] = true;

  assert.equal(identitySessionAuthorizesSurface(actor, "client", "app-client"), true);
  assert.equal(identitySessionAuthorizesSurface(actor, "operator", "control-panel"), false);
});
