import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { dehydrate } from "@tanstack/react-query";
import { createBthwaniQueryClient } from "../src/create-query-client.ts";

const testQueryClients = new Set();

function createTestQueryClient() {
  const client = createBthwaniQueryClient();
  testQueryClients.add(client);
  return client;
}

afterEach(() => {
  for (const client of testQueryClients) client.clear();
  testQueryClients.clear();
});

function makeStorage() {
  const stored = new Map();
  const storage = {
    getItem: async (key) => stored.get(key) ?? null,
    setItem: async (key, value) => void stored.set(key, value),
    removeItem: async (key) => void stored.delete(key),
    getAllKeys: async () => [...stored.keys()],
    multiRemove: async (keys) => void keys.forEach((k) => stored.delete(k)),
  };
  return { stored, storage };
}

test("createBthwaniQueryClient sets conservative defaults", () => {
  const client = createTestQueryClient();
  const defaults = client.getDefaultOptions().queries;
  assert.equal(defaults.staleTime, 30_000);
  assert.equal(defaults.refetchOnReconnect, true);
  assert.equal(defaults.refetchOnWindowFocus, false);
  assert.equal(typeof defaults.retry, "function");
});

test("createBthwaniQueryClient retry never retries 4xx", () => {
  const client = createTestQueryClient();
  const retry = client.getDefaultOptions().queries.retry;
  assert.equal(retry(0, { kind: "http", status: 400 }), false);
  assert.equal(retry(0, { kind: "http", status: 503 }), true);
  assert.equal(retry(0, { kind: "network" }), true);
  assert.equal(retry(2, { kind: "network" }), false);
});

test("isPersistableQueryKey enforces exact allowlisted namespace pairs", async () => {
  const { isPersistableQueryKey } = await import("../src/persistence.ts");

  assert.equal(isPersistableQueryKey(["dsh", "home-discovery"]), true);
  assert.equal(isPersistableQueryKey(["dsh", "home-discovery", "x"]), true);
  assert.equal(isPersistableQueryKey(["dsh", "home-discovery", null, null]), true);
  assert.equal(isPersistableQueryKey(["wlt-refunds", "by-order", "o1"]), false);
  assert.equal(isPersistableQueryKey(["dsh", "other"]), false);
  assert.equal(isPersistableQueryKey(["DSH", "home-discovery"]), false);
  assert.equal(isPersistableQueryKey(["dsh"]), false);
  assert.equal(isPersistableQueryKey([]), false);
  assert.equal(isPersistableQueryKey([1, "home-discovery"]), false);
  assert.equal(isPersistableQueryKey(["dsh", 2]), false);
  assert.equal(isPersistableQueryKey("dsh"), false);
  assert.equal(isPersistableQueryKey(undefined), false);
});

test("persistBthwaniQueryClient persists only allowlisted namespaces", async () => {
  const { persistBthwaniQueryClient } = await import("../src/persistence.ts");

  const { stored, storage } = makeStorage();

  const client = createTestQueryClient();
  const stop = persistBthwaniQueryClient(client, "test-cache-key", storage);
  await client.prefetchQuery({
    queryKey: ["dsh", "home-discovery", "x"],
    queryFn: async () => ({ stores: ["store-1"] }),
  });
  await client.prefetchQuery({
    queryKey: ["wlt-refunds", "by-order", "o1"],
    queryFn: async () => ({ refunds: [{ id: "r1" }] }),
  });
  await client.prefetchQuery({
    queryKey: ["wlt-refund-audit", "r1"],
    queryFn: async () => ({ auditEvents: [] }),
  });
  await new Promise((resolve) => setTimeout(resolve, 400));
  stop();

  const envelope = JSON.parse(stored.get("test-cache-key"));
  assert.equal(envelope.schemaVersion, 3);
  const persistedKeys = envelope.clientState.queries.map((q) => q.queryKey);
  assert.deepEqual(persistedKeys, [["dsh", "home-discovery", "x"]]);
});

test("restore hydrates v3 envelope but rejects legacy v2 envelope", async () => {
  const { restoreBthwaniQueryClient } = await import("../src/persistence.ts");

  const seed = createTestQueryClient();
  await seed.prefetchQuery({
    queryKey: ["dsh", "home-discovery", "x"],
    queryFn: async () => ({ stores: ["store-1"] }),
  });

  const { stored: storedV3, storage: storageV3 } = makeStorage();
  const v3Envelope = {
    schemaVersion: 3,
    persistedAt: Date.now(),
    clientState: dehydrate(seed),
  };
  await storageV3.setItem("cache-key-v3", JSON.stringify(v3Envelope));
  const hydratedClient = createTestQueryClient();
  await restoreBthwaniQueryClient(hydratedClient, "cache-key-v3", storageV3);
  assert.deepEqual(hydratedClient.getQueryData(["dsh", "home-discovery", "x"]), { stores: ["store-1"] });
  assert.equal(storedV3.get("cache-key-v3") !== undefined, true);

  const legacyEnvelope = {
    schemaVersion: 2,
    persistedAt: Date.now(),
    clientState: dehydrate(seed),
  };
  const { stored: storedLegacy, storage: storageLegacy } = makeStorage();
  await storageLegacy.setItem("cache-key-v2", JSON.stringify(legacyEnvelope));
  const legacyClient = createTestQueryClient();
  await restoreBthwaniQueryClient(legacyClient, "cache-key-v2", storageLegacy);
  assert.equal(legacyClient.getQueryData(["dsh", "home-discovery", "x"]), undefined);
  assert.equal(legacyClient.getQueryCache().getAll().length, 0);
  assert.equal(storedLegacy.get("cache-key-v2"), undefined);
});

test("restore drops non-allowlisted entries inside a valid v3 envelope", async () => {
  const { restoreBthwaniQueryClient } = await import("../src/persistence.ts");

  const seed = createTestQueryClient();
  await seed.prefetchQuery({
    queryKey: ["dsh", "home-discovery", "x"],
    queryFn: async () => ({ stores: ["store-1"] }),
  });

  const legitEntry = JSON.parse(JSON.stringify(dehydrate(seed).queries[0]));
  const leakedEntry = JSON.parse(JSON.stringify(dehydrate(seed).queries[0]));
  leakedEntry.queryKey = ["wlt-refunds", "by-order", "o1"];
  leakedEntry.state.data = { refunds: [{ id: "leaked" }] };
  if (typeof leakedEntry.queryHash === "string") {
    leakedEntry.queryHash = JSON.stringify(leakedEntry.queryKey);
  }

  const tamperedEnvelope = {
    schemaVersion: 3,
    persistedAt: Date.now(),
    clientState: { mutations: [], queries: [legitEntry, leakedEntry] },
  };

  const { storage } = makeStorage();
  await storage.setItem("tampered-cache-key", JSON.stringify(tamperedEnvelope));
  const client = createTestQueryClient();
  await restoreBthwaniQueryClient(client, "tampered-cache-key", storage);

  assert.deepEqual(client.getQueryData(["dsh", "home-discovery", "x"]), { stores: ["store-1"] });
  assert.equal(client.getQueryData(["wlt-refunds", "by-order", "o1"]), undefined);
  const restoredKeys = client.getQueryCache().getAll().map((q) => q.queryKey);
  assert.deepEqual(restoredKeys, [["dsh", "home-discovery", "x"]]);
});
