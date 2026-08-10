import assert from "node:assert/strict";
import test from "node:test";

const controllerUrl = new URL(
  "../../../../services/dsh/frontend/shared/cart/cart.controller-core.ts",
  import.meta.url,
);
const queueUrl = new URL(
  "../../../../services/dsh/frontend/shared/cart/cart-sync.queue.ts",
  import.meta.url,
);

const {
  shouldLoadCart,
  resolveCartLoadState,
  resolveCartLoadError,
  resolveServiceabilityState,
  resolveServiceabilityError,
  resolveQuantityRemoval,
} = await import(controllerUrl.href);
const {
  getCartSyncQueue,
  pushToCartSyncQueue,
  removeCartSyncCommand,
  clearCartSyncQueue,
  generateIdempotencyKey,
} = await import(queueUrl.href);

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

const previousLocalStorage = globalThis.localStorage;

test.beforeEach(() => {
  globalThis.localStorage = memoryStorage();
});

test.after(() => {
  if (previousLocalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = previousLocalStorage;
});

test("client cart loads only for an authenticated actor with a store scope", () => {
  assert.equal(shouldLoadCart("authenticated", "store-1"), true);
  assert.equal(shouldLoadCart("authenticated", ""), false);
  assert.equal(shouldLoadCart("authenticated", undefined), false);
  assert.equal(shouldLoadCart("anonymous", "store-1"), false);
});

test("client cart maps empty, offline, permission and generic failure without false success", () => {
  assert.equal(resolveCartLoadState(null).kind, "empty");
  assert.equal(resolveCartLoadState({ id: "cart-1", items: [] }).kind, "empty");

  const populated = resolveCartLoadState({ id: "cart-1", items: [{ id: "item-1" }] });
  assert.equal(populated.kind, "success");

  assert.equal(resolveCartLoadError({ kind: "network" }).kind, "offline");
  assert.equal(resolveCartLoadError({ kind: "http", status: 401 }).kind, "permission_denied");
  assert.equal(resolveCartLoadError({ kind: "http", status: 403 }).kind, "permission_denied");
  assert.equal(resolveCartLoadError({ kind: "http", status: 500 }).kind, "error");
});

test("client serviceability and quantity policy are explicit and fail closed", () => {
  const serviceable = resolveServiceabilityState({ serviceable: true, availableModes: ["delivery"] });
  assert.equal(serviceable.kind, "serviceable");

  const blocked = resolveServiceabilityState({
    serviceable: false,
    code: "OUT_OF_ZONE",
    reason: "outside delivery zone",
    availableModes: [],
  });
  assert.equal(blocked.kind, "blocked");
  assert.equal(resolveServiceabilityError().kind, "error");

  assert.equal(resolveQuantityRemoval(1, 0), "remove");
  assert.equal(resolveQuantityRemoval(2, 1), "update");
  assert.equal(resolveQuantityRemoval(0, 0), "update");
});

test("offline cart queue preserves idempotency identity until the exact command is removed", () => {
  const firstId = generateIdempotencyKey();
  const secondId = generateIdempotencyKey();
  assert.notEqual(firstId, secondId);
  assert.ok(firstId.length >= 16);

  const first = {
    id: firstId,
    expectedVersion: 3,
    command: { kind: "add", storeId: "store-1", masterProductId: "p-1", quantity: 2, options: [], note: "" },
    createdAt: 1,
  };
  const second = {
    id: secondId,
    expectedVersion: 4,
    command: { kind: "clear", cartId: "cart-1", storeId: "store-1" },
    createdAt: 2,
  };

  pushToCartSyncQueue(first);
  pushToCartSyncQueue(second);
  assert.deepEqual(getCartSyncQueue(), [first, second]);

  removeCartSyncCommand(firstId);
  assert.deepEqual(getCartSyncQueue(), [second]);

  clearCartSyncQueue();
  assert.deepEqual(getCartSyncQueue(), []);
});

test("corrupted offline queue recovers to an empty queue rather than executing unknown commands", () => {
  globalThis.localStorage.setItem("dsh_cart_sync_queue", "{not-json");
  assert.deepEqual(getCartSyncQueue(), []);
});
