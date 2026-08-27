import assert from "node:assert/strict";
import test from "node:test";
import {
  configureBthwaniDurableStorage,
} from "@bthwani/data-runtime/storage-adapter";
import {
  durableMutationAttemptKey,
  getOrCreateDurableMutationAttempt,
  purgeExactDurableMutationAttempt,
} from "../frontend/shared/_kernel/durable-mutation-attempt-registry.ts";

function memoryStore() {
  const values = new Map();
  return {
    values,
    adapter: {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
      removeItem: async (key) => { values.delete(key); },
      getAllKeys: async () => [...values.keys()],
      multiRemove: async (keys) => { for (const key of keys) values.delete(key); },
    },
  };
}

const scopeA = { actorId: "actor-a", installationId: "install-a", entityId: "entity-a" };
const scopeB = { actorId: "actor-a", installationId: "install-a", entityId: "entity-b" };
const scopeOtherActor = { actorId: "actor-b", installationId: "install-a", entityId: "entity-a" };
const scopeOtherInstallation = { actorId: "actor-a", installationId: "install-b", entityId: "entity-a" };

function parseAttempt(value) {
  return Boolean(value && typeof value === "object"
    && typeof value.fingerprint === "string"
    && typeof value.context?.idempotencyKey === "string"
    && typeof value.scope?.actorId === "string"
    && typeof value.scope?.installationId === "string"
    && typeof value.scope?.entityId === "string");
}

function options(scope, fingerprint, serial) {
  return {
    operation: "registry-test",
    scope,
    fingerprint,
    create: () => ({
      fingerprint,
      scope,
      context: { idempotencyKey: `idempotency-${serial}` },
      serial,
    }),
    parse: parseAttempt,
  };
}

test("registry keeps simultaneous entities and exact replay isolated", async () => {
  const store = memoryStore();
  configureBthwaniDurableStorage(store.adapter);
  const a1 = await getOrCreateDurableMutationAttempt(options(scopeA, "fingerprint-a", "a"));
  const b1 = await getOrCreateDurableMutationAttempt(options(scopeB, "fingerprint-b", "b"));
  const aReplay = await getOrCreateDurableMutationAttempt(options(scopeA, "fingerprint-a", "new"));
  assert.equal(aReplay.context.idempotencyKey, a1.context.idempotencyKey);
  assert.notEqual(b1.context.idempotencyKey, a1.context.idempotencyKey);
  assert.equal(store.values.size, 2);
});

test("actor and installation changes cannot reuse an unresolved attempt", async () => {
  const store = memoryStore();
  configureBthwaniDurableStorage(store.adapter);
  const original = await getOrCreateDurableMutationAttempt(options(scopeA, "same-fingerprint", "original"));
  const actorChanged = await getOrCreateDurableMutationAttempt(options(scopeOtherActor, "same-fingerprint", "actor"));
  const installationChanged = await getOrCreateDurableMutationAttempt(options(scopeOtherInstallation, "same-fingerprint", "installation"));
  assert.notEqual(actorChanged.context.idempotencyKey, original.context.idempotencyKey);
  assert.notEqual(installationChanged.context.idempotencyKey, original.context.idempotencyKey);
  assert.equal(store.values.has(durableMutationAttemptKey("registry-test", scopeA, "same-fingerprint")), true);
});

test("corrupt storage is quarantined and exact terminal purge preserves other entities", async () => {
  const store = memoryStore();
  configureBthwaniDurableStorage(store.adapter);
  const keyA = durableMutationAttemptKey("registry-test", scopeA, "corrupt-fingerprint");
  await store.adapter.setItem(keyA, "not-json");
  const recovered = await getOrCreateDurableMutationAttempt(options(scopeA, "corrupt-fingerprint", "recovered"));
  assert.equal(recovered.context.idempotencyKey, "idempotency-recovered");
  assert.ok([...store.values.keys()].some((key) => key.startsWith(`${keyA}:quarantine:`)));

  const other = await getOrCreateDurableMutationAttempt(options(scopeB, "survivor", "survivor"));
  await purgeExactDurableMutationAttempt("registry-test", scopeA, "corrupt-fingerprint", parseAttempt);
  assert.equal(store.values.has(keyA), false);
  assert.equal(store.values.has(durableMutationAttemptKey("registry-test", scopeB, "survivor")), true);
  assert.equal(other.context.idempotencyKey, "idempotency-survivor");
});

test("legacy prefix entries are quarantined before v4 creation", async () => {
  const store = memoryStore();
  configureBthwaniDurableStorage(store.adapter);
  await store.adapter.setItem("@bthwani/client-address-create-attempt:v3/old", "legacy");
  await getOrCreateDurableMutationAttempt({
    ...options(scopeA, "legacy-migration", "new"),
    legacyPrefixes: ["@bthwani/client-address-create-attempt:v3/"],
  });
  assert.equal(store.values.has("@bthwani/client-address-create-attempt:v3/old"), false);
  assert.ok([...store.values.keys()].some((key) => key.startsWith("@bthwani/client-address-create-attempt:v3/old:quarantine:")));
});
