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
  sessionSurface: "app-client",
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
  return import(`../clients/identity-session-store.ts?test=${encodeURIComponent(name)}-${Date.now()}-${Math.random()}`);
}

function memoryStorage(initial = storedSession) {
  const values = new Map(initial === null ? [] : [["bthwani-identity-session", initial]]);
  let removals = 0;
  return {
    values,
    get removals() {
      return removals;
    },
    adapter: {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => values.set(key, value),
      removeItem: async (key) => {
        removals += 1;
        values.delete(key);
      },
    },
  };
}

test("readiness outage preserves the stored session", async () => {
  const originalFetch = globalThis.fetch;
  const storage = memoryStorage();
  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    assert.equal(path, "/identity/readiness");
    return jsonResponse(503, runtimeStatus("NOT_READY", ["IDENTITY_DATABASE_UNAVAILABLE"]));
  };

  try {
    const store = await freshStore("outage");
    store.configureIdentitySessionStorage(storage.adapter);
    store.configureIdentitySession("http://identity.test");

    const state = await waitForState(store, "service_unavailable");
    assert.equal(state.message, "IDENTITY_NOT_READY");
    assert.equal(storage.removals, 0);
    assert.equal(storage.values.get("bthwani-identity-session"), storedSession);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("proven invalid session removes the stored credentials", async () => {
  const originalFetch = globalThis.fetch;
  const storage = memoryStorage();
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
    store.configureIdentitySessionStorage(storage.adapter);
    store.configureIdentitySession("http://identity.test");

    const state = await waitForState(store, "error");
    assert.equal(state.message, "IDENTITY_SESSION_INVALID");
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(storage.removals, 1);
    assert.equal(storage.values.has("bthwani-identity-session"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fresh cached identity never becomes authenticated before live validation completes", async () => {
  const originalFetch = globalThis.fetch;
  const storage = memoryStorage();
  let releaseSession;
  const sessionResponse = new Promise((resolve) => {
    releaseSession = () => resolve(jsonResponse(200, validIdentity));
  });

  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    if (path === "/identity/readiness") return jsonResponse(200, runtimeStatus("HEALTHY"));
    if (path === "/auth/session") return sessionResponse;
    throw new Error(`unexpected Identity request ${path}`);
  };

  try {
    const store = await freshStore("authoritative-bootstrap");
    store.configureIdentitySessionStorage(storage.adapter);
    store.configureIdentitySession("http://identity.test");

    const restoring = await waitForState(store, "authenticating");
    assert.equal(restoring.kind, "authenticating");
    assert.notEqual(store.getIdentityState().kind, "authenticated");

    releaseSession();
    const authenticated = await waitForState(store, "authenticated");
    assert.equal(authenticated.identity.sessionId, validIdentity.sessionId);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("logout outage retains credentials and reports service_unavailable for retry", async () => {
  const originalFetch = globalThis.fetch;
  const storage = memoryStorage();

  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    if (path === "/identity/readiness") return jsonResponse(200, runtimeStatus("HEALTHY"));
    if (path === "/auth/session") return jsonResponse(200, validIdentity);
    if (path === "/auth/logout") throw new Error("identity offline");
    throw new Error(`unexpected Identity request ${path}`);
  };

  try {
    const store = await freshStore("logout-outage");
    store.configureIdentitySessionStorage(storage.adapter);
    store.configureIdentitySession("http://identity.test");
    await waitForState(store, "authenticated");

    await store.logoutIdentity();
    const state = await waitForState(store, "service_unavailable");
    assert.equal(state.retainedSession, true);
    assert.equal(storage.removals, 0);
    assert.equal(storage.values.has("bthwani-identity-session"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("successful logout revokes upstream before local credentials are removed", async () => {
  const originalFetch = globalThis.fetch;
  const storage = memoryStorage();
  const calls = [];

  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    calls.push(path);
    if (path === "/identity/readiness") return jsonResponse(200, runtimeStatus("HEALTHY"));
    if (path === "/auth/session") return jsonResponse(200, validIdentity);
    if (path === "/auth/logout") return new Response(null, { status: 204 });
    throw new Error(`unexpected Identity request ${path}`);
  };

  try {
    const store = await freshStore("logout-success");
    store.configureIdentitySessionStorage(storage.adapter);
    store.configureIdentitySession("http://identity.test");
    await waitForState(store, "authenticated");

    await store.logoutIdentity();
    await waitForState(store, "signed_out");
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.ok(calls.indexOf("/auth/logout") > calls.indexOf("/auth/session"));
    assert.equal(storage.values.has("bthwani-identity-session"), false);
    assert.equal(storage.removals, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
