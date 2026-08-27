/**
 * Field offline queue — ambiguous result reconciliation.
 *
 * Unknown work is durable, excluded from ordinary delivery, and becomes
 * retryable only after an authoritative read proves that no server receipt
 * exists. Rebinding the same scope simulates an app restart; another scope
 * must not be able to read the work.
 */

import assert from "node:assert/strict";
import test from "node:test";

const queue = await import(
  "../../../../services/dsh/frontend/shared/field-readiness/field-offline-queue.ts"
);

const {
  configureFieldOfflineQueueStorage,
  configureFieldOfflineQueueScope,
  enqueueFieldOperation,
  markOperationUnknown,
  markOperationReadyForRetry,
  getUnknownOperations,
  getDueOperations,
} = queue;

const SCOPE = { actorId: "wf-unknown-actor", installationId: "install-unknown" };

function memoryStore() {
  const store = new Map();
  return {
    getItem: async (key) => (store.has(key) ? store.get(key) : null),
    setItem: async (key, value) => void store.set(key, value),
    removeItem: async (key) => void store.delete(key),
  };
}

test("unknown result survives restart and cannot be delivered blindly", async () => {
  const storage = memoryStore();
  configureFieldOfflineQueueStorage(storage);
  configureFieldOfflineQueueScope(SCOPE);

  const operation = await enqueueFieldOperation(
    "complete_visit",
    { visitId: "visit-unknown", input: {} },
    "idem-unknown-1",
  );
  await markOperationUnknown(operation.operationId, "connection lost after dispatch");

  configureFieldOfflineQueueScope(null);
  configureFieldOfflineQueueScope(SCOPE);

  assert.equal((await getUnknownOperations()).length, 1);
  assert.equal((await getDueOperations()).length, 0);

  await markOperationReadyForRetry(operation.operationId);
  assert.equal((await getUnknownOperations()).length, 0);
  assert.equal((await getDueOperations()).length, 1);
});

test("unknown result is isolated from another actor and installation", async () => {
  const storage = memoryStore();
  configureFieldOfflineQueueStorage(storage);
  configureFieldOfflineQueueScope(SCOPE);
  const operation = await enqueueFieldOperation(
    "create_visit",
    { storeId: "store-isolated" },
    "idem-isolated-1",
  );
  await markOperationUnknown(operation.operationId, "connection lost after dispatch");

  configureFieldOfflineQueueScope({ actorId: "other-actor", installationId: "other-install" });
  assert.equal((await getUnknownOperations()).length, 0);
  assert.equal((await getDueOperations()).length, 0);
});
