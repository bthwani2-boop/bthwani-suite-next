import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { MutationIdentityScopeError } from "@bthwani/data-runtime/mutation-identity-scope";
import { configureBthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import {
  clearCaptainCashInMutationContext,
  getOrCreateCaptainCashInMutationContext,
} from "../dist/services/dsh/frontend/wlt/payment/captain-cash-in.api.js";

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

test("captain cash-in mutation context requires explicit actor identity", async () => {
  const { adapter } = memoryDurable();
  configureBthwaniDurableStorage(adapter);

  await assert.rejects(
    getOrCreateCaptainCashInMutationContext({
      actorId: "",
      operation: "create",
      fingerprint: "actor-missing|5000|YER",
    }),
    (error) => error instanceof MutationIdentityScopeError && error.reason === "missing_actor",
  );
});

test("captain cash-in writes actor- and installation-scoped mutation keys", async () => {
  const { adapter, map } = memoryDurable();
  configureBthwaniDurableStorage(adapter);

  const contextA = await getOrCreateCaptainCashInMutationContext({
    actorId: "captain-A",
    operation: "create",
    fingerprint: "captain-A|5000|YER",
  });
  const contextB = await getOrCreateCaptainCashInMutationContext({
    actorId: "captain-B",
    operation: "create",
    fingerprint: "captain-B|5000|YER",
  });

  assert.equal(contextA.idempotencyKey.length > 0, true);
  assert.equal(contextB.idempotencyKey.length > 0, true);
  assert.notEqual(contextA.idempotencyKey, contextB.idempotencyKey);
  const mutationKeys = [...map.keys()].filter((key) => key.includes("captain-cash-in/v3/mutation/"));
  assert.equal(mutationKeys.length, 2);
  assert.equal(mutationKeys.some((key) => key.includes("captain-A")), true);
  assert.equal(mutationKeys.some((key) => key.includes("captain-B")), true);
  await clearCaptainCashInMutationContext("captain-A", "create");
  assert.equal([...map.keys()].some((key) => key.includes("captain-cash-in/v3/mutation/") && key.includes("captain-A")), false);
  assert.equal([...map.keys()].some((key) => key.includes("captain-cash-in/v3/mutation/") && key.includes("captain-B")), true);
  assert.equal([...map.keys()].some((key) => key.includes("captain-cash-in/v2/")), false);
  assert.equal([...map.keys()].some((key) => key.includes("captain-cash-in/v1/")), false);
  assert.equal([...map.keys()].some((key) => key.includes(":quarantine:")), false);
});
