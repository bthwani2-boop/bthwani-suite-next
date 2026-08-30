/**
 * Field offline queue — terminal failure evacuation.
 *
 * A `failed_permanent` operation can never drain: getDueOperations ignores it
 * and purgeSyncedOperations only removes synced work. Left in the live queue it
 * consumes capacity forever, so a worker who accumulates enough server refusals
 * eventually cannot capture any offline work at all.
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
  markOperationFailed,
  getAllOperations,
  getDueOperations,
  evacuateTerminalOperations,
  readFieldOfflineRecovery,
} = queue;

const SCOPE = { actorId: "wf-actor-1", installationId: "install-1" };
const MAX_QUEUE_OPERATIONS = 100;

function memoryStore() {
  const store = new Map();
  return {
    getItem: async (key) => (store.has(key) ? store.get(key) : null),
    setItem: async (key, value) => void store.set(key, value),
    removeItem: async (key) => void store.delete(key),
  };
}

function install() {
  configureFieldOfflineQueueStorage(memoryStore());
  configureFieldOfflineQueueScope(SCOPE);
}

/** Drives an operation to failed_permanent the way the server does on a 409/422. */
async function queueTerminalOperation(index) {
  const operation = await enqueueFieldOperation(
    "create_escalation",
    {
      storeId: `store-${index}`,
      input: { severity: "high", category: "other", description: `refused-${index}` },
    },
    `idem-${index}`,
  );
  await markOperationFailed(operation.operationId, "store refused the escalation", true);
  return operation;
}

test("a permanently refused operation is evacuated out of the live queue", async () => {
  install();
  await queueTerminalOperation(1);
  assert.equal((await getAllOperations()).length, 1);

  const evacuated = await evacuateTerminalOperations();

  assert.equal(evacuated, 1);
  assert.equal((await getAllOperations()).length, 0, "capacity is released");
  const recovered = await readFieldOfflineRecovery();
  assert.equal(recovered.length, 1, "the refused work is still recoverable");
  assert.equal(recovered[0].reason, "TERMINAL_SYNC_FAILURE");
  assert.match(recovered[0].raw, /store-1/, "the original payload is retained");
});

test("terminal refusals cannot brick offline capture by exhausting capacity", async () => {
  install();
  for (let index = 0; index < MAX_QUEUE_OPERATIONS; index += 1) {
    await queueTerminalOperation(index);
  }
  assert.equal((await getAllOperations()).length, MAX_QUEUE_OPERATIONS);

  // The brick is real, not hypothetical: with the queue full of work that can
  // never drain, the worker's next offline capture is rejected outright.
  await assert.rejects(
    () => enqueueFieldOperation("create_visit", { storeId: "store-blocked", input: {} }, "idem-blocked"),
    /capacity exceeded/,
    "a queue saturated with terminal refusals must be provably unusable",
  );

  await evacuateTerminalOperations();

  const fresh = await enqueueFieldOperation("create_visit", { storeId: "store-new", input: {} }, "idem-new");
  assert.equal(fresh.status, "pending", "new offline work can still be captured");
  const due = await getDueOperations();
  assert.equal(due.length, 1, "and it is drainable");
});

test("evacuation leaves retryable and pending work in place", async () => {
  install();
  const pending = await enqueueFieldOperation("create_visit", { storeId: "s-1", input: {} }, "idem-pending");
  const retrying = await enqueueFieldOperation("create_visit", { storeId: "s-2", input: {} }, "idem-retry");
  await markOperationFailed(retrying.operationId, "transient network failure", false);
  await queueTerminalOperation(9);

  const evacuated = await evacuateTerminalOperations();

  assert.equal(evacuated, 1, "only the terminal operation is removed");
  const remaining = (await getAllOperations()).map((operation) => operation.idempotencyKey).sort();
  assert.deepEqual(remaining, ["idem-pending", "idem-retry"]);
  assert.equal(pending.status, "pending");
});

test("evacuation is a no-op when nothing has failed permanently", async () => {
  install();
  await enqueueFieldOperation("create_visit", { storeId: "s-1", input: {} }, "idem-1");

  assert.equal(await evacuateTerminalOperations(), 0);
  assert.equal((await getAllOperations()).length, 1);
  assert.equal((await readFieldOfflineRecovery()).length, 0);
});
