import assert from "node:assert/strict";
import test from "node:test";

const policyUrl = new URL(
  "../../../../services/dsh/frontend/shared/cart/cart.policy.ts",
  import.meta.url,
);
const queueUrl = new URL(
  "../../../../services/dsh/frontend/shared/cart/cart-sync.queue.ts",
  import.meta.url,
);

const {
  shouldLoadCart,
  classifyCartLoad,
  classifyCartLoadError,
  classifyServiceability,
  resolveQuantityRemoval,
} = await import(policyUrl.href);
const {
  configureBthwaniDurableStorage,
} = await import(
  new URL("../../../../shared/data-runtime/src/storage-adapter.ts", import.meta.url).href,
);
const {
  resetBthwaniInstallationIdForTests,
} = await import(
  new URL("../../../../shared/data-runtime/src/installation-id.ts", import.meta.url).href,
);
const {
  getCartSyncQueue,
  enqueueCartSyncCommand,
  removeCartSyncCommand,
  updateCartSyncCommand,
  discardCartSyncQueue,
  quarantineLegacyCartSyncQueue,
} = await import(queueUrl.href);

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function memoryDurable() {
  const values = new Map();
  return {
    values,
    adapter: {
      getItem: async (key) => values.has(key) ? values.get(key) : null,
      setItem: async (key, value) => values.set(key, String(value)),
      removeItem: async (key) => values.delete(key),
      getAllKeys: async () => [...values.keys()],
      multiRemove: async (keys) => { for (const key of keys) values.delete(key); },
    },
  };
}

const previousLocalStorage = globalThis.localStorage;
let durable;

test.beforeEach(() => {
  durable = memoryDurable();
  configureBthwaniDurableStorage(durable.adapter);
  resetBthwaniInstallationIdForTests();
  globalThis.localStorage = memoryStorage();
});

test.after(() => {
  if (previousLocalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = previousLocalStorage;
});

test("retired unscoped cart queue is quarantined before actor-scoped reads", async () => {
  globalThis.localStorage.setItem("dsh_cart_sync_queue", "[{\"legacy\":true}]");

  await quarantineLegacyCartSyncQueue();

  assert.equal(globalThis.localStorage.getItem("dsh_cart_sync_queue"), null);
  assert.ok(
    [...durable.values.keys()].some((key) => key.includes("legacy-quarantine")),
    "legacy evidence must remain recoverable in durable storage",
  );
});

test("client cart loads only for an authenticated actor with a store scope", () => {
  assert.equal(shouldLoadCart("authenticated", "store-1"), true);
  assert.equal(shouldLoadCart("authenticated", ""), false);
  assert.equal(shouldLoadCart("authenticated", undefined), false);
  assert.equal(shouldLoadCart("anonymous", "store-1"), false);
});

test("client cart classifies empty, offline, permission and generic failure without false success", () => {
  assert.equal(classifyCartLoad(null), "empty");
  assert.equal(classifyCartLoad({ items: [] }), "empty");
  assert.equal(classifyCartLoad({ items: [{ id: "item-1" }] }), "success");

  assert.equal(classifyCartLoadError({ kind: "network" }), "offline");
  assert.equal(classifyCartLoadError({ kind: "http", status: 401 }), "permission_denied");
  assert.equal(classifyCartLoadError({ kind: "http", status: 403 }), "permission_denied");
  assert.equal(classifyCartLoadError({ kind: "http", status: 500 }), "error");
});

test("client serviceability and quantity policy are explicit and fail closed", () => {
  assert.equal(classifyServiceability({ serviceable: true }), "serviceable");
  assert.equal(classifyServiceability({ serviceable: false }), "blocked");
  assert.equal(classifyServiceability({}), "blocked");

  assert.equal(resolveQuantityRemoval(1, 0), "remove");
  assert.equal(resolveQuantityRemoval(2, 1), "update");
  assert.equal(resolveQuantityRemoval(0, 0), "update");
});

test("offline cart commands are actor/install scoped and retain identity until explicit resolution", async () => {
  const first = await enqueueCartSyncCommand({
    actorId: "actor-A",
    expectedVersion: 3,
    command: {
      kind: "add",
      storeId: "store-1",
      masterProductId: "p-1",
      quantity: 2,
      options: [],
      note: "",
    },
  });
  const second = await enqueueCartSyncCommand({
    actorId: "actor-A",
    expectedVersion: 4,
    command: { kind: "clear", cartId: "cart-1", storeId: "store-1" },
  });

  assert.notEqual(first.context.idempotencyKey, second.context.idempotencyKey);
  assert.equal(first.context.idempotencyKey, first.id);
  assert.equal((await getCartSyncQueue("actor-B")).length, 0);
  assert.deepEqual(await getCartSyncQueue("actor-A"), [first, second]);

  await updateCartSyncCommand("actor-A", first.id, "submitted_unknown", "network outcome unknown");
  assert.equal((await getCartSyncQueue("actor-A"))[0].status, "submitted_unknown");

  await removeCartSyncCommand("actor-A", first.id);
  assert.deepEqual(await getCartSyncQueue("actor-A"), [second]);

  await discardCartSyncQueue("actor-A", "customer explicitly chose server state");
  assert.deepEqual(await getCartSyncQueue("actor-A"), []);
  assert.ok(
    [...durable.values.keys()].some((key) => key.includes("/quarantine/")),
    "explicit discard must leave durable recovery evidence",
  );
});

test("corrupt scoped cart commands are quarantined and never treated as an empty queue", async () => {
  const installationId = await import(
    new URL("../../../../shared/data-runtime/src/installation-id.ts", import.meta.url).href,
  ).then(({ getBthwaniInstallationId }) => getBthwaniInstallationId());
  const key = `@bthwani/dsh/cart-sync-queue/v4/${encodeURIComponent("actor-corrupt")}/${encodeURIComponent(installationId)}`;
  durable.values.set(key, "{not-json");

  await assert.rejects(
    getCartSyncQueue("actor-corrupt"),
    /cart queue is corrupt and was preserved for recovery/,
  );
  assert.equal(durable.values.has(key), false);
  assert.ok([...durable.values.keys()].some((candidate) => candidate.includes("/quarantine/")));
});

test("cart command enqueue fails closed when durable storage rejects the intent write", async () => {
  configureBthwaniDurableStorage({
    getItem: async () => null,
    setItem: async () => { throw new Error("platform rejected durable write"); },
    removeItem: async () => undefined,
    getAllKeys: async () => [],
    multiRemove: async () => undefined,
  });
  resetBthwaniInstallationIdForTests();

  await assert.rejects(
    enqueueCartSyncCommand({
      actorId: "actor-A",
      expectedVersion: undefined,
      command: { kind: "clear", cartId: "cart-1", storeId: "store-1" },
    }),
    /durable write/,
  );
});
