import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { configureBthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import {
  captainDeliveryStatusCommandIntentFromAttempt,
  clearCaptainDeliveryStatusCommandAttempt,
  findPendingCaptainDeliveryStatusCommandAttempt,
  getOrCreateCaptainDeliveryStatusCommandAttempt,
} from "../dist/services/dsh/frontend/shared/delivery/captain-delivery-status-command-attempt.js";

function memoryDurable() {
  const map = new Map();
  return {
    map,
    adapter: {
      getItem: async (key) => map.get(key) ?? null,
      setItem: async (key, value) => { map.set(key, value); },
      removeItem: async (key) => { map.delete(key); },
      getAllKeys: async () => [...map.keys()],
      multiRemove: async (keys) => { for (const key of keys) map.delete(key); },
    },
  };
}

afterEach(() => {
  configureBthwaniDurableStorage({
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
    getAllKeys: async () => [],
    multiRemove: async () => undefined,
  });
});

test("Captain delivery status command recovers the exact pending transition after restart", async () => {
  const store = memoryDurable();
  configureBthwaniDurableStorage(store.adapter);
  const intent = {
    actorId: "captain-recovery",
    assignmentId: "assignment-recovery",
    expectedStatus: "driver_assigned",
    nextStatus: "driver_arrived_store",
    expectedVersion: 1,
    latitude: 15.35,
    longitude: 44.2,
  };

  const created = await getOrCreateCaptainDeliveryStatusCommandAttempt(intent);
  const pending = await findPendingCaptainDeliveryStatusCommandAttempt(
    intent.actorId,
    intent.assignmentId,
  );
  assert.equal(pending?.idempotencyKey, created.idempotencyKey);
  assert.deepEqual(captainDeliveryStatusCommandIntentFromAttempt(pending), intent);

  await clearCaptainDeliveryStatusCommandAttempt(intent, created.signature);
  assert.equal(
    await findPendingCaptainDeliveryStatusCommandAttempt(intent.actorId, intent.assignmentId),
    null,
  );
});

test("Captain delivery status recovery fails closed when two commands remain unresolved", async () => {
  const store = memoryDurable();
  configureBthwaniDurableStorage(store.adapter);
  const base = {
    actorId: "captain-collision",
    assignmentId: "assignment-collision",
    expectedStatus: "driver_assigned",
    nextStatus: "driver_arrived_store",
  };
  const first = await getOrCreateCaptainDeliveryStatusCommandAttempt({ ...base, expectedVersion: 1 });
  const second = await getOrCreateCaptainDeliveryStatusCommandAttempt({ ...base, expectedVersion: 2 });

  await assert.rejects(
    findPendingCaptainDeliveryStatusCommandAttempt(base.actorId, base.assignmentId),
    /Multiple unresolved Captain delivery status commands/,
  );
  await clearCaptainDeliveryStatusCommandAttempt({ ...base, expectedVersion: 1 }, first.signature);
  await clearCaptainDeliveryStatusCommandAttempt({ ...base, expectedVersion: 2 }, second.signature);
});
