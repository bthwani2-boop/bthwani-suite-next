import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { configureBthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import { resetBthwaniInstallationIdForTests } from "@bthwani/data-runtime/installation-id";

const INSTALLATION_KEY = "@bthwani/installation-id/v1";
const originalFetch = globalThis.fetch;

function configureTestStorage() {
  const map = new Map([[INSTALLATION_KEY, "location-installation-0001"]]);
  resetBthwaniInstallationIdForTests();
  configureBthwaniDurableStorage({
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => { map.set(key, value); },
    removeItem: async (key) => { map.delete(key); },
    getAllKeys: async () => [...map.keys()],
    multiRemove: async (keys) => { for (const key of keys) map.delete(key); },
  });
  return map;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetBthwaniInstallationIdForTests();
  configureBthwaniDurableStorage({
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
    getAllKeys: async () => [],
    multiRemove: async () => undefined,
  });
});

test("Captain foreground location survives runtime restart in the actor-scoped durable outbox", async () => {
  process.env.NEXT_PUBLIC_CONTROL_PANEL_BFF_ENABLED = "true";
  const {
    flushPendingForegroundDispatchLocations,
    hasPendingForegroundDispatchLocation,
    syncForegroundDispatchLocation,
  } = await import("../dist/services/dsh/frontend/shared/dispatch/dispatch-location.api.js");
  const map = configureTestStorage();
  globalThis.fetch = async () => { throw new Error("offline"); };
  const actorId = "captain-location-1";
  const assignmentId = "assignment-location-1";
  const first = {
    latitude: 15.35,
    longitude: 44.2,
    accuracyMeters: 8,
    recordedAt: new Date(Date.now() - 1000).toISOString(),
  };
  const second = { ...first, longitude: 44.21, recordedAt: new Date().toISOString() };

  assert.equal((await syncForegroundDispatchLocation(actorId, assignmentId, first)).kind, "queued");
  assert.equal((await syncForegroundDispatchLocation(actorId, assignmentId, second)).kind, "queued");
  assert.equal(await hasPendingForegroundDispatchLocation(actorId, assignmentId), true);
  const storedKey = [...map.keys()].find((key) => key.startsWith("@bthwani/captain-foreground-location:v1/"));
  assert.ok(storedKey);
  assert.equal(JSON.parse(map.get(storedKey)).sample.longitude, 44.21);

  globalThis.fetch = async () => new Response(JSON.stringify({ assignment: { id: assignmentId } }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  assert.deepEqual(await flushPendingForegroundDispatchLocations(actorId), {
    sent: 1,
    remaining: 0,
    discarded: 0,
  });
  assert.equal(await hasPendingForegroundDispatchLocation(actorId, assignmentId), false);
});
