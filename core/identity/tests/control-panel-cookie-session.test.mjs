import assert from "node:assert/strict";
import test from "node:test";

async function freshBoundary(name) {
  return import(`../clients/control-panel-cookie-session.ts?test=${encodeURIComponent(name)}-${Date.now()}-${Math.random()}`);
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function withBrowserHarness(run) {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;
  const events = [];

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { dispatchEvent: (event) => events.push(event.type) },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {},
  });

  try {
    await run({ events });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
    if (originalNavigator === undefined) delete globalThis.navigator;
    else Object.defineProperty(globalThis, "navigator", { configurable: true, value: originalNavigator });
  }
}

test("authoritative ready session retries the original cookie request once", async () => {
  await withBrowserHarness(async ({ events }) => {
    let sessionCalls = 0;
    globalThis.fetch = async (input) => {
      assert.equal(String(input), "/api/auth/session");
      sessionCalls += 1;
      return jsonResponse(200, { identity: { sessionSurface: "control-panel" } });
    };

    const boundary = await freshBoundary("ready");
    let businessCalls = 0;
    const response = await boundary.executeWithControlPanelCookieSession(async () => {
      businessCalls += 1;
      return businessCalls === 1
        ? jsonResponse(401, { code: "UNAUTHENTICATED" })
        : jsonResponse(200, { ok: true });
    }, true);

    assert.equal(response.status, 200);
    assert.equal(sessionCalls, 1);
    assert.equal(businessCalls, 2);
    assert.deepEqual(events, []);
  });
});

test("concurrent refresh loser never emits signed-out and converges through session inspection", async () => {
  await withBrowserHarness(async ({ events }) => {
    let sessionCalls = 0;
    globalThis.fetch = async () => {
      sessionCalls += 1;
      return sessionCalls === 1
        ? jsonResponse(409, { code: "REFRESH_ALREADY_ROTATED" })
        : jsonResponse(200, { identity: { sessionSurface: "control-panel" } });
    };

    const boundary = await freshBoundary("concurrent");
    let businessCalls = 0;
    const response = await boundary.executeWithControlPanelCookieSession(async () => {
      businessCalls += 1;
      return businessCalls === 1
        ? jsonResponse(409, { code: "REFRESH_ALREADY_ROTATED" })
        : jsonResponse(200, { ok: true });
    }, true);

    assert.equal(response.status, 200);
    assert.equal(sessionCalls, 2);
    assert.equal(businessCalls, 2);
    assert.deepEqual(events, []);
  });
});

test("identity outage preserves browser session and does not emit expiry", async () => {
  await withBrowserHarness(async ({ events }) => {
    globalThis.fetch = async () => jsonResponse(503, { code: "IDENTITY_UNAVAILABLE" });

    const boundary = await freshBoundary("outage");
    const response = await boundary.executeWithControlPanelCookieSession(
      async () => jsonResponse(401, { code: "UNAUTHENTICATED" }),
      true,
    );

    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "IDENTITY_UNAVAILABLE");
    assert.deepEqual(events, []);
  });
});

test("authoritative expired session emits exactly one expiry event", async () => {
  await withBrowserHarness(async ({ events }) => {
    globalThis.fetch = async () => jsonResponse(401, { code: "SESSION_EXPIRED" });

    const boundary = await freshBoundary("expired");
    const response = await boundary.executeWithControlPanelCookieSession(
      async () => jsonResponse(401, { code: "UNAUTHENTICATED" }),
      true,
    );

    assert.equal(response.status, 401);
    assert.deepEqual(events, [boundary.CONTROL_PANEL_SESSION_EXPIRED_EVENT]);
  });
});

test("simultaneous business failures share one browser recovery flight", async () => {
  await withBrowserHarness(async ({ events }) => {
    let sessionCalls = 0;
    let releaseSession;
    const sessionGate = new Promise((resolve) => {
      releaseSession = resolve;
    });
    globalThis.fetch = async () => {
      sessionCalls += 1;
      await sessionGate;
      return jsonResponse(200, { identity: { sessionSurface: "control-panel" } });
    };

    const boundary = await freshBoundary("single-flight");
    const makeRequest = () => {
      let calls = 0;
      return boundary.executeWithControlPanelCookieSession(async () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(401, { code: "UNAUTHENTICATED" })
          : jsonResponse(200, { ok: true });
      }, true);
    };

    const first = makeRequest();
    const second = makeRequest();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(sessionCalls, 1);
    releaseSession();

    const [firstResponse, secondResponse] = await Promise.all([first, second]);
    assert.equal(firstResponse.status, 200);
    assert.equal(secondResponse.status, 200);
    assert.equal(sessionCalls, 1);
    assert.deepEqual(events, []);
  });
});
