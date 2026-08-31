import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { configureBthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import { configureBthwaniSensitiveStorage } from "@bthwani/data-runtime/sensitive-storage-adapter";
import { resetBthwaniInstallationIdForTests } from "@bthwani/data-runtime/installation-id";

const INSTALLATION_KEY = "@bthwani/installation-id/v1";
const SENSITIVE_LOCATION_OUTBOX_KEY = "bthwani.captain.foreground-location.v2";
const originalFetch = globalThis.fetch;

function configureTestStorage() {
  const durable = new Map([[INSTALLATION_KEY, "location-installation-0001"]]);
  const sensitive = new Map();
  resetBthwaniInstallationIdForTests();
  configureBthwaniDurableStorage({
    getItem: async (key) => durable.get(key) ?? null,
    setItem: async (key, value) => { durable.set(key, value); },
    removeItem: async (key) => { durable.delete(key); },
    getAllKeys: async () => [...durable.keys()],
    multiRemove: async (keys) => { for (const key of keys) durable.delete(key); },
  });
  configureBthwaniSensitiveStorage({
    getItem: async (key) => sensitive.get(key) ?? null,
    setItem: async (key, value) => { sensitive.set(key, value); },
    removeItem: async (key) => { sensitive.delete(key); },
  });
  return { durable, sensitive };
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
  configureBthwaniSensitiveStorage({
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
  });
});

test("Captain foreground location survives runtime restart only in the sensitive outbox", async () => {
  process.env.NEXT_PUBLIC_CONTROL_PANEL_BFF_ENABLED = "true";
  const {
    flushPendingForegroundDispatchLocations,
    hasPendingForegroundDispatchLocation,
    syncForegroundDispatchLocation,
  } = await import("../dist/services/dsh/frontend/shared/dispatch/dispatch-location.api.js");
  const { durable, sensitive } = configureTestStorage();
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

  // The generic durable store may keep installation identity, but must never
  // receive precise location payloads. Location restart durability belongs to
  // the explicitly protected sensitive store.
  assert.deepEqual([...durable.keys()], [INSTALLATION_KEY]);
  assert.equal(durable.has(SENSITIVE_LOCATION_OUTBOX_KEY), false);
  assert.equal(sensitive.has(SENSITIVE_LOCATION_OUTBOX_KEY), true);
  const envelope = JSON.parse(sensitive.get(SENSITIVE_LOCATION_OUTBOX_KEY));
  assert.equal(envelope.schemaVersion, 2);
  assert.equal(envelope.pending.length, 1);
  assert.equal(envelope.pending[0].sample.longitude, 44.21);

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
  assert.equal(sensitive.has(SENSITIVE_LOCATION_OUTBOX_KEY), false);
});
