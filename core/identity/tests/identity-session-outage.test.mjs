import assert from "node:assert/strict";
import test from "node:test";

const validIdentity = {
  subject: "client-test-001",
  operatorContextId: "operator-main",
  phoneE164: "+967770000001",
  roles: ["client"],
  permissions: [],
  authState: "authenticated",
  surfaceAccess: { "app-client": true },
  serviceAccess: { dsh: true },
  sessionId: "session-test-001",
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
};

const storedSession = JSON.stringify({
  accessToken: "access-token-test-value",
  refreshToken: "refresh-token-test-value",
  identity: validIdentity,
});

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function runtimeStatus(status, reasonCodes = []) {
  return {
    status,
    service: "core-identity",
    checkedAt: new Date().toISOString(),
    correlationId: "identity-test-correlation",
    durationMs: 1,
    checks: [],
    reasonCodes,
    ...(status === "NOT_READY"
      ? { code: "IDENTITY_NOT_READY", message: "identity runtime is not ready" }
      : {}),
  };
}

async function waitForState(store, expectedKind) {
  if (store.getIdentityState().kind === expectedKind) return store.getIdentityState();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error(`timed out waiting for Identity state ${expectedKind}`));
    }, 2_000);
    const unsubscribe = store.subscribeIdentityState(() => {
      const state = store.getIdentityState();
      if (state.kind !== expectedKind) return;
      clearTimeout(timeout);
      unsubscribe();
      resolve(state);
    });
  });
}

async function freshStore(name) {
  return import(`../clients/identity-session-store.ts?test=${encodeURIComponent(name)}-${Date.now()}`);
}

test("readiness outage preserves the stored session", async () => {
  const originalFetch = globalThis.fetch;
  const values = new Map([["bthwani-identity-session", storedSession]]);
  let removals = 0;
  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    assert.equal(path, "/identity/readiness");
    return jsonResponse(503, runtimeStatus("NOT_READY", ["IDENTITY_DATABASE_UNAVAILABLE"]));
  };

  try {
    const store = await freshStore("outage");
    store.configureIdentitySessionStorage({
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => values.set(key, value),
      removeItem: async (key) => {
        removals += 1;
        values.delete(key);
      },
    });
    store.configureIdentitySession("http://identity.test");

    const state = await waitForState(store, "service_unavailable");
    assert.equal(state.message, "IDENTITY_NOT_READY");
    assert.equal(removals, 0);
    assert.equal(values.get("bthwani-identity-session"), storedSession);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("proven invalid session removes the stored credentials", async () => {
  const originalFetch = globalThis.fetch;
  const values = new Map([["bthwani-identity-session", storedSession]]);
  let removals = 0;
  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    if (path === "/identity/readiness") return jsonResponse(200, runtimeStatus("HEALTHY"));
    if (path === "/auth/session") {
      return jsonResponse(401, { code: "UNAUTHENTICATED", message: "session expired" });
    }
    if (path === "/auth/refresh") {
      return jsonResponse(401, { code: "INVALID_REFRESH_TOKEN", message: "refresh expired" });
    }
    throw new Error(`unexpected Identity request ${path}`);
  };

  try {
    const store = await freshStore("invalid-session");
    store.configureIdentitySessionStorage({
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => values.set(key, value),
      removeItem: async (key) => {
        removals += 1;
        values.delete(key);
      },
    });
    store.configureIdentitySession("http://identity.test");

    const state = await waitForState(store, "error");
    assert.equal(state.message, "IDENTITY_SESSION_INVALID");
    assert.equal(removals, 1);
    assert.equal(values.has("bthwani-identity-session"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
