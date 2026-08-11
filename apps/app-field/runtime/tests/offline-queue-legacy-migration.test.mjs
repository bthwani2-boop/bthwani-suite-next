/**
 * Field offline queue — legacy generation recovery.
 *
 * The v1 queue wrote governed field work (visit completion, checklist upserts,
 * escalations) to a single unscoped AsyncStorage key. The current queue is
 * actor/installation scoped and lives in the encrypted store. Deleting the v1
 * key on upgrade destroys work a worker captured offline and believes was
 * saved, so it must be preserved and reported instead.
 */

import assert from "node:assert/strict";
import test from "node:test";

const queue = await import(
  "../../../../services/dsh/frontend/shared/field-readiness/field-offline-queue.ts"
);

const {
  configureFieldOfflineQueueStorage,
  configureFieldOfflineLegacyStorage,
  configureFieldOfflineQueueScope,
  prepareFieldOfflineQueue,
  enqueueFieldOperation,
  getAllOperations,
  readLegacyQuarantine,
} = queue;

const V1_KEY = "@bthwani/field-offline-queue:v1";
const V1_CORRUPT_KEY = "@bthwani/field-offline-queue:corrupt:v1";
const SCOPE = { actorId: "wf-actor-1", installationId: "install-1" };

/** v1 payload: no actorId, no installationId — this is why it cannot replay. */
const V1_WORK = JSON.stringify([
  {
    operationId: "field-op:complete_visit:legacy",
    operationType: "complete_visit",
    payload: { visitId: "visit-1" },
    idempotencyKey: "idem-legacy-1",
    correlationId: "corr-legacy-1",
    createdAt: "2026-07-26T10:00:00.000Z",
    attemptCount: 0,
    nextRetryAt: "2026-07-26T10:00:00.000Z",
    status: "pending",
  },
]);

function memoryStore(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    store,
    adapter: {
      getItem: async (key) => (store.has(key) ? store.get(key) : null),
      setItem: async (key, value) => void store.set(key, value),
      removeItem: async (key) => void store.delete(key),
    },
  };
}

/** Mirrors production: v1 in AsyncStorage, current queue in the encrypted store. */
function install({ legacy = {}, current = {} } = {}) {
  const legacyStore = memoryStore(legacy);
  const currentStore = memoryStore(current);
  configureFieldOfflineQueueStorage(currentStore.adapter);
  configureFieldOfflineLegacyStorage(legacyStore.adapter);
  configureFieldOfflineQueueScope(SCOPE);
  return { legacyStore, currentStore };
}

test("v1 work is preserved for recovery instead of silently deleted on upgrade", async () => {
  const { legacyStore } = install({ legacy: { [V1_KEY]: V1_WORK } });

  const summary = await prepareFieldOfflineQueue();

  assert.equal(summary.quarantined, 1, "the captured visit completion must not vanish");
  const quarantine = await readLegacyQuarantine();
  assert.equal(quarantine.length, 1);
  assert.equal(quarantine[0].reason, "LEGACY_V1_UNSCOPED");
  assert.equal(quarantine[0].sourceKey, V1_KEY);
  assert.match(quarantine[0].raw, /idem-legacy-1/, "the original payload is retained verbatim");
  assert.equal(legacyStore.store.has(V1_KEY), false, "released only after the copy is written");
});

test("v1 work is never replayed under the current actor", async () => {
  install({ legacy: { [V1_KEY]: V1_WORK } });

  const summary = await prepareFieldOfflineQueue();

  assert.equal(summary.adopted, 0, "v1 carries no actor identity, so replay would cross scopes");
  assert.equal((await getAllOperations()).length, 0, "the live queue stays clean");
});

test("a v1 corrupt sidecar is recovered too, not dropped", async () => {
  install({ legacy: { [V1_KEY]: V1_WORK, [V1_CORRUPT_KEY]: "{not-json" } });

  const summary = await prepareFieldOfflineQueue();

  assert.equal(summary.quarantined, 2);
  const reasons = (await readLegacyQuarantine()).map((record) => record.sourceKey);
  assert.deepEqual(reasons.sort(), [V1_CORRUPT_KEY, V1_KEY].sort());
});

test("recovery is idempotent and does not re-quarantine on every launch", async () => {
  install({ legacy: { [V1_KEY]: V1_WORK } });

  await prepareFieldOfflineQueue();
  const second = await prepareFieldOfflineQueue();

  assert.equal(second.quarantined, 0, "nothing left to recover on the next launch");
  assert.equal((await readLegacyQuarantine()).length, 1, "the recovered copy is not duplicated");
});

test("recovery leaves current-generation queued work untouched", async () => {
  install({ legacy: { [V1_KEY]: V1_WORK } });
  await enqueueFieldOperation("create_visit", { storeId: "store-1" }, "idem-current-1");

  await prepareFieldOfflineQueue();

  const live = await getAllOperations();
  assert.equal(live.length, 1, "the current actor's own queued work survives recovery");
  assert.equal(live[0].idempotencyKey, "idem-current-1");
});

test("a clean install performs no recovery work", async () => {
  install();

  const summary = await prepareFieldOfflineQueue();

  assert.deepEqual(summary, { adopted: 0, quarantined: 0 });
  assert.equal((await readLegacyQuarantine()).length, 0);
});
