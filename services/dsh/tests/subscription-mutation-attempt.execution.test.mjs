import assert from "node:assert/strict";
import test from "node:test";

const storageModule = await import(
  new URL("../../../shared/data-runtime/src/storage-adapter.ts", import.meta.url).href,
);
const installationModule = await import(
  new URL("../../../shared/data-runtime/src/installation-id.ts", import.meta.url).href,
);
const attempts = await import(
  new URL("../frontend/shared/marketing/subscription-mutation-attempt.ts", import.meta.url).href,
);

function memoryDurable() {
  const values = new Map();
  return {
    values,
    adapter: {
      getItem: async (key) => values.has(key) ? values.get(key) : null,
      setItem: async (key, value) => values.set(key, String(value)),
      removeItem: async (key) => values.delete(key),
      getAllKeys: async () => [...values.keys()],
      multiRemove: async (keys) => { for (const key of keys) values.delete(key); },
    },
  };
}

let durable;

test.beforeEach(() => {
  durable = memoryDurable();
  storageModule.configureBthwaniDurableStorage(durable.adapter);
  installationModule.resetBthwaniInstallationIdForTests();
});

test("subscription attempts retain one durable identity for the same actor and fingerprint", async () => {
  const input = {
    actorId: "actor-A",
    operation: "purchase",
    subject: "plan-1",
    fingerprint: "purchase:plan-1:wallet",
    paymentMethod: "wallet",
  };
  const first = await attempts.getOrCreateSubscriptionMutationAttempt(input);
  const second = await attempts.getOrCreateSubscriptionMutationAttempt(input);

  assert.equal(second.context.idempotencyKey, first.context.idempotencyKey);
  assert.equal((await attempts.getLatestSubscriptionPurchaseAttempt("actor-A"))?.context.idempotencyKey, first.context.idempotencyKey);
});

test("subscription attempts refuse to overwrite unresolved intent for the same subject", async () => {
  await attempts.getOrCreateSubscriptionMutationAttempt({
    actorId: "actor-A",
    operation: "purchase",
    subject: "plan-1",
    fingerprint: "purchase:plan-1:wallet",
    paymentMethod: "wallet",
  });

  await assert.rejects(
    attempts.getOrCreateSubscriptionMutationAttempt({
      actorId: "actor-A",
      operation: "purchase",
      subject: "plan-1",
      fingerprint: "purchase:plan-1:official_wallet",
      paymentMethod: "official_wallet",
    }),
    (error) => error.code === "SUBSCRIPTION_MUTATION_ATTEMPT_CONFLICT",
  );
});

test("corrupt subscription intent is quarantined and never replaced silently", async () => {
  await attempts.getOrCreateSubscriptionMutationAttempt({
    actorId: "actor-A",
    operation: "activate",
    subject: "purchase-1",
    fingerprint: "activate:purchase-1",
  });
  const key = [...durable.values.keys()].find((candidate) => candidate.includes("/activate/purchase-1"));
  assert.ok(key);
  durable.values.set(key, "{not-json");

  await assert.rejects(
    attempts.getOrCreateSubscriptionMutationAttempt({
      actorId: "actor-A",
      operation: "activate",
      subject: "purchase-1",
      fingerprint: "activate:purchase-1",
    }),
    /subscription mutation attempt is corrupt and was preserved for recovery/,
  );
  assert.equal(durable.values.has(key), false);
  assert.ok([...durable.values.keys()].some((candidate) => candidate.includes(":quarantine:")));
});
