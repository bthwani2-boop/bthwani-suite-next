import assert from "node:assert/strict";
import test from "node:test";

const identity = await import(
  "../../../../services/dsh/frontend/shared/field-readiness/field-intent-identity.ts"
);
const queue = await import(
  "../../../../services/dsh/frontend/shared/field-readiness/field-offline-queue.ts"
);

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

test("online and offline paths share one normalized field intent identity", async () => {
  const payload = {
    storeId: " store-identity ",
    input: {
      visitType: "onboarding",
      startLocation: { capturedAt: "2026-08-29T00:00:00.000Z", latitude: 15.3, longitude: 44.2 },
    },
  };
  const online = identity.createFieldMutationIdentity("create-visit", payload);
  const storage = memoryStore();
  queue.configureFieldOfflineQueueStorage(storage);
  queue.configureFieldOfflineQueueScope({ actorId: "field-identity", installationId: "install-identity" });

  const offline = await queue.enqueueFieldOperation(
    "create_visit",
    { storeId: "store-identity", input: payload.input },
    online.idempotencyKey,
    online.correlationId,
    online.intentFingerprint,
    online.operationId,
  );

  assert.equal(offline.intentFingerprint, online.intentFingerprint);
  assert.equal(offline.idempotencyKey, online.idempotencyKey);
  assert.equal(offline.operationId, online.operationId);
  assert.match(offline.operationId, /^field-op:v5:create_visit:[0-9a-f-]{36}$/);
  assert.notEqual(online.idempotencyKey, online.correlationId);
});

test("ambiguous legacy queue records are quarantined instead of coerced", async () => {
  const scope = { actorId: "field-ambiguous", installationId: "install-ambiguous" };
  const v3Key = `bthwani.field-offline-queue.v3.${v3BoundedHash(`${scope.actorId}|${scope.installationId}`)}`;
  const storage = memoryStore([[v3Key, JSON.stringify([{
    operationId: "field-op:create_visit:legacy",
    operationType: "create_visit",
    actorId: scope.actorId,
    installationId: scope.installationId,
    payload: { input: { visitType: "onboarding" } },
    idempotencyKey: "legacy-idempotency",
    correlationId: "legacy-correlation",
    createdAt: "2026-08-29T00:00:00.000Z",
    attemptCount: 0,
    nextRetryAt: "2026-08-29T00:00:00.000Z",
    status: "pending",
  }])]]);
  queue.configureFieldOfflineQueueStorage(storage);
  queue.configureFieldOfflineQueueScope(scope);

  assert.deepEqual(await queue.getAllOperations(), []);
  const recovery = await queue.readFieldOfflineRecovery();
  assert.equal(recovery.length, 1);
  assert.equal(recovery[0].reason, "LEGACY_INTENT_AMBIGUOUS");
  assert.match(recovery[0].raw, /legacy-idempotency/);
  assert.equal(storage.store.has(v3Key), false);
});
