import assert from "node:assert/strict";
import test from "node:test";

import {
  isFreshActorIdentity,
  isStructurallyValidActorIdentity,
  parseStoredSession,
} from "../clients/identity-session-store.ts";

function identity(expiresAt) {
  return {
    subject: "client-local-001",
    operatorContextId: "local-dsh",
    phoneE164: "+967772222222",
    roles: ["client"],
    permissions: [
      {
        service: "dsh",
        surface: "app-client",
        action: "read",
        scope: "own",
      },
    ],
    authState: "authenticated",
    surfaceAccess: { "app-client": true },
    serviceAccess: { dsh: true },
    sessionSurface: "app-client",
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