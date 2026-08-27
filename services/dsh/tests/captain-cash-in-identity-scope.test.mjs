import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { MutationIdentityScopeError } from "@bthwani/data-runtime/mutation-identity-scope";
import { configureBthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import { getOrCreateCaptainCashInMutationContext } from "../dist/services/dsh/frontend/wlt/payment/captain-cash-in.api.js";

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

test("captain cash-in writes only the canonical v2 mutation key", async () => {
  const { adapter, map } = memoryDurable();
  configureBthwaniDurableStorage(adapter);

  const context = await getOrCreateCaptainCashInMutationContext({
    actorId: "captain-A",
    operation: "create",
    fingerprint: "captain-A|5000|YER",
  });

  assert.equal(context.idempotencyKey.length > 0, true);
  assert.equal([...map.keys()].some((key) => key.includes("captain-cash-in/v2/mutation/")), true);
  assert.equal([...map.keys()].some((key) => key.includes("captain-cash-in/v1/")), false);
  assert.equal([...map.keys()].some((key) => key.includes(":quarantine:")), false);
});

