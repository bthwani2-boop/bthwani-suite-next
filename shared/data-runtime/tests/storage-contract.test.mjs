/**
 * Bthwani storage contract — negative-space tests.
 *
 * The split between BthwaniCacheStore (best-effort) and
 * BthwaniDurableStore (correctness-critical) is the only durable
 * contract. These tests pin the negative behaviors that allow the
 * frontend to fail closed on a real platform rejection.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  BthwaniDurableRemoveError,
  BthwaniDurableWriteError,
  configureBthwaniCacheStorage,
  configureBthwaniDurableStorage,
  bthwaniCacheStorage,
  bthwaniDurableStorage,
} from "../src/storage-adapter.ts";

function strictFailingStore() {
  const writes = new Map();
  return {
    writes,
    adapter: {
      getItem: async (key) => writes.has(key) ? writes.get(key) : null,
      setItem: async (key, value) => {
        if (key === "reject-write") {
          throw new BthwaniDurableWriteError(key, new Error("quota exceeded"));
        }
        writes.set(key, value);
      },
      removeItem: async (key) => {
        if (key === "reject-remove") {
          throw new BthwaniDurableRemoveError(key, new Error("platform reject"));
        }
        writes.delete(key);
      },
      getAllKeys: async () => [...writes.keys()],
      multiRemove: async (keys) => {
        for (const key of keys) {
          if (key === "reject-remove") {
            throw new BthwaniDurableRemoveError(key, new Error("platform reject"));
          }
          writes.delete(key);
        }
      },
    },
  };
}

function swallower() {
  return {
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
    getAllKeys: async () => [],
    multiRemove: async () => undefined,
  };
}

test("browser durable storage survives a session boundary and surfaces read failures", async () => {
  const previousWindow = globalThis.window;
  const localValues = new Map();
  const sessionValues = new Map();
  const storage = (values, failReads = false) => ({
    getItem: (key) => {
      if (failReads) throw new Error("storage read rejected");
      return values.has(key) ? values.get(key) : null;
    },
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  });

  globalThis.window = {
    localStorage: storage(localValues),
    sessionStorage: storage(sessionValues),
  };
  try {
    const browserModule = await import(`../src/storage-adapter.ts?browser-durable=${Date.now()}`);
    await browserModule.bthwaniDurableStorage.setItem("durable-key", "value");
    assert.equal(localValues.get("durable-key"), "value");
    assert.equal(sessionValues.has("durable-key"), false);

    globalThis.window.localStorage = storage(localValues, true);
    await assert.rejects(browserModule.bthwaniDurableStorage.getItem("durable-key"), /storage read rejected/);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("cache store round-trip preserves a successful write", async () => {
  configureBthwaniCacheStorage({
    getItem: async (key) => key === "cache-key" ? "v" : null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
    getAllKeys: async () => ["cache-key"],
    multiRemove: async () => undefined,
  });
  assert.equal(await bthwaniCacheStorage.getItem("cache-key"), "v");
  await bthwaniCacheStorage.setItem("cache-key", "v2");
  assert.deepEqual(await bthwaniCacheStorage.getAllKeys(), ["cache-key"]);
  await bthwaniCacheStorage.removeItem("cache-key");
  await bthwaniCacheStorage.multiRemove(["cache-key"]);
});

test("durable store surfaces BthwaniDurableWriteError on platform rejection", async () => {
  const { adapter } = strictFailingStore();
  configureBthwaniDurableStorage(adapter);
  await assert.rejects(
    bthwaniDurableStorage.setItem("reject-write", "payload"),
    (error) => error instanceof BthwaniDurableWriteError && error.key === "reject-write",
    "durable write must surface the platform rejection",
  );
});

test("durable store surfaces BthwaniDurableRemoveError on platform rejection", async () => {
  const { adapter } = strictFailingStore();
  configureBthwaniDurableStorage(adapter);
  await assert.rejects(
    bthwaniDurableStorage.removeItem("reject-remove"),
    (error) => error instanceof BthwaniDurableRemoveError && error.key === "reject-remove",
    "durable remove must surface the platform rejection",
  );
});

test("durable store surfaces BthwaniDurableRemoveError on multiRemove rejection", async () => {
  const { adapter } = strictFailingStore();
  configureBthwaniDurableStorage(adapter);
  await assert.rejects(
    bthwaniDurableStorage.multiRemove(["reject-remove"]),
    (error) => error instanceof BthwaniDurableRemoveError && error.key === "reject-remove",
  );
});

test("durable store round-trip preserves a successful write", async () => {
  const { adapter } = strictFailingStore();
  configureBthwaniDurableStorage(adapter);
  await bthwaniDurableStorage.setItem("k", "v");
  assert.equal(await bthwaniDurableStorage.getItem("k"), "v");
  await bthwaniDurableStorage.removeItem("k");
  assert.equal(await bthwaniDurableStorage.getItem("k"), null);
});

test("cache and durable contracts are independently configurable", () => {
  configureBthwaniCacheStorage(swallower());
  configureBthwaniDurableStorage(swallower());
  assert.equal(typeof bthwaniCacheStorage.setItem, "function");
  assert.equal(typeof bthwaniDurableStorage.setItem, "function");
});
