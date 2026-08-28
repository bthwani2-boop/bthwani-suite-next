import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { resetBthwaniInstallationIdForTests } from "@bthwani/data-runtime/installation-id";
import { configureBthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import { configureSecureRandomUuidProvider } from "../dist/services/dsh/frontend/shared/_kernel/secure-random.js";
import {
  clearOrderCancellationAttempt,
  getOrCreateOrderCancellationAttempt,
} from "../dist/services/dsh/frontend/shared/orders/order-cancellation-attempt.js";

const INSTALLATION_KEY = "@bthwani/installation-id/v1";

function configureTestStorage() {
  const map = new Map([[INSTALLATION_KEY, "cancellation-installation-0001"]]);
  resetBthwaniInstallationIdForTests();
  configureBthwaniDurableStorage({
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => { map.set(key, value); },
    removeItem: async (key) => { map.delete(key); },
    getAllKeys: async () => [...map.keys()],
    multiRemove: async (keys) => { for (const key of keys) map.delete(key); },
  });
  return map;
}

function intent(overrides = {}) {
  return {
    surface: "operator",
    actorId: "operator-1",
    orderId: "order-1",
    reasonCode: "operational_failure",
    reasonNote: "returned package failed inspection",
    ticketReference: "delivery-exception:exception-1",
    ...overrides,
  };
}

afterEach(() => {
  configureSecureRandomUuidProvider(null);
  resetBthwaniInstallationIdForTests();
  configureBthwaniDurableStorage({
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
    getAllKeys: async () => [],
    multiRemove: async () => undefined,
  });
});

test("order cancellation keeps one secure command across runtime reset", async () => {
  const map = configureTestStorage();
  let generated = 0;
  configureSecureRandomUuidProvider(() => {
    generated += 1;
    return "00000000-0000-4000-8000-000000000401";
  });

  const original = await getOrCreateOrderCancellationAttempt(intent());
  resetBthwaniInstallationIdForTests();
  const replay = await getOrCreateOrderCancellationAttempt(intent({ reasonNote: "  returned package failed inspection  " }));

  assert.equal(original.commandId, "operator:order-cancel:00000000-0000-4000-8000-000000000401");
  assert.equal(replay.commandId, original.commandId);
  assert.equal(replay.correlationId, original.correlationId);
  assert.equal(generated, 1);
  assert.equal([...map.keys()].filter((key) => key.startsWith("@bthwani/mutation-attempt:v4/order-cancellation-create/")).length, 1);
});

test("order cancellation isolates actor, order, surface, and financial intent", async () => {
  const map = configureTestStorage();
  let generated = 0;
  configureSecureRandomUuidProvider(() => `00000000-0000-4000-8000-${String(++generated).padStart(12, "0")}`);

  const original = await getOrCreateOrderCancellationAttempt(intent());
  const changedReason = await getOrCreateOrderCancellationAttempt(intent({ reasonCode: "fraud_risk" }));
  const changedActor = await getOrCreateOrderCancellationAttempt(intent({ actorId: "operator-2" }));
  assert.notEqual(changedReason.commandId, original.commandId);
  assert.notEqual(changedActor.commandId, original.commandId);

  await clearOrderCancellationAttempt(intent(), original.signature);
  assert.equal([...map.keys()].filter((key) => key.startsWith("@bthwani/mutation-attempt:v4/order-cancellation-create/")).length, 2);
});
