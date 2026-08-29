import assert from "node:assert/strict";
import test from "node:test";

const queue = await import(
  "../../../../services/dsh/frontend/shared/field-readiness/field-offline-queue.ts"
);

const {
  configureFieldOfflineQueueStorage,
  configureFieldOfflineQueueScope,
  detachFieldOfflineQueueScope,
  discardFieldOfflineRecoveryState,
  enqueueFieldOperation,
  getAllOperations,
} = queue;

function memoryStore(initial = []) {
  const store = new Map(initial);
  return {
    store,
    getItem: async (key) => (store.has(key) ? store.get(key) : null),
    setItem: async (key, value) => void store.set(key, value),
    removeItem: async (key) => void store.delete(key),
  };
}

function v3BoundedHash(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

test("logout-style scope detachment preserves unresolved work for the same actor/install", async () => {
  const storage = memoryStore();
  const scope = { actorId: "field-actor-session", installationId: "install-session" };
  configureFieldOfflineQueueStorage(storage);
  configureFieldOfflineQueueScope(scope);

  const captured = await enqueueFieldOperation(
    "create_visit",
    { storeId: "store-session", input: { visitType: "onboarding" } },
    "idem-session-1",
    "corr-session-1",
    "intent-session-1",
  );
  assert.equal((await getAllOperations()).length, 1);

  detachFieldOfflineQueueScope();
  await assert.rejects(() => getAllOperations(), /scope is not configured/);

  configureFieldOfflineQueueScope({ actorId: "another-actor", installationId: "install-session" });
  assert.equal((await getAllOperations()).length, 0, "another actor cannot read the preserved work");

  configureFieldOfflineQueueScope(scope);
  const restored = await getAllOperations();
  assert.equal(restored.length, 1);
  assert.equal(restored[0].operationId, captured.operationId);
  assert.equal(restored[0].intentFingerprint, "intent-session-1");

  await discardFieldOfflineRecoveryState();
  assert.equal((await getAllOperations()).length, 0, "destruction only occurs through the explicit maintenance action");
});

test("v3 queue data is cut over to v4 before the old key is deleted", async () => {
  const scope = { actorId: "field-actor-v3", installationId: "install-v3" };
  const v3Key = `bthwani.field-offline-queue.v3.${v3BoundedHash(`${scope.actorId}|${scope.installationId}`)}`;
  const legacyOperation = {
    operationId: "field-op:create_visit:legacy",
    operationType: "create_visit",
    actorId: scope.actorId,
    installationId: scope.installationId,
    payload: { storeId: "store-v3", input: { visitType: "onboarding" } },
    idempotencyKey: "idem-v3",
    correlationId: "idem-v3",
    createdAt: "2026-08-29T00:00:00.000Z",
    attemptCount: 0,
    nextRetryAt: "2026-08-29T00:00:00.000Z",
    status: "pending",
  };
  const storage = memoryStore([[v3Key, JSON.stringify([legacyOperation])]]);
  configureFieldOfflineQueueStorage(storage);
  configureFieldOfflineQueueScope(scope);

  const migrated = await getAllOperations();
  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].idempotencyKey, "idem-v3");
  assert.match(migrated[0].intentFingerprint, /field-offline-v3-migrated/);
  assert.equal(storage.store.has(v3Key), false, "the v3 live key is removed only after v4 persistence succeeds");

  const v4Keys = [...storage.store.keys()].filter((key) => key.startsWith("bthwani.field-offline-queue.v4."));
  assert.equal(v4Keys.length, 1, "one canonical v4 live queue remains");
});

test("intent identity deduplicates repeated capture while transport ids stay separate", async () => {
  const storage = memoryStore();
  configureFieldOfflineQueueStorage(storage);
  configureFieldOfflineQueueScope({ actorId: "field-actor-dedupe", installationId: "install-dedupe" });

  const first = await enqueueFieldOperation(
    "complete_visit",
    { visitId: "visit-1", input: {} },
    "idem-first",
    "corr-first",
    "intent-complete-visit-1",
  );
  const second = await enqueueFieldOperation(
    "complete_visit",
    { visitId: "visit-1", input: {} },
    "idem-second",
    "corr-second",
    "intent-complete-visit-1",
  );

  assert.equal(first.operationId, second.operationId, "the same business intent is captured once");
  assert.equal((await getAllOperations()).length, 1);
  assert.notEqual(first.idempotencyKey, first.correlationId);
  assert.match(first.operationId, /^field-op:v4:complete_visit:/);
});
