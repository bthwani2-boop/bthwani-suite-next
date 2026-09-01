import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  MutationIdentityScopeError,
} from "@bthwani/data-runtime/mutation-identity-scope";
import {
  configureBthwaniDurableStorage,
} from "@bthwani/data-runtime/storage-adapter";
import { configureBthwaniSensitiveStorage } from "@bthwani/data-runtime/sensitive-storage-adapter";
import {
  clearPartnerMessageAttempt,
  clearPartnerTicketAttempt,
  getOrCreatePartnerMessageAttempt,
  getOrCreatePartnerTicketAttempt,
} from "../frontend/shared/support/partner-support-attempt.ts";
import {
  clearSupportMutationAttempt,
  getOrCreateSupportMutationAttempt,
} from "../frontend/shared/support/support-mutation-attempt.ts";

const ticketInput = {
  subject: "تعذر تحديث الطلب",
  description: "فشل تحديث الطلب من شاشة الشريك.",
  category: "order_issue",
  priority: "normal",
  orderId: "order-1",
};

function memoryDurable() {
  const map = new Map();
  return {
    adapter: {
      getItem: async (key) => map.get(key) ?? null,
      setItem: async (key, value) => { map.set(key, value); },
      removeItem: async (key) => { map.delete(key); },
      getAllKeys: async () => [...map.keys()],
      multiRemove: async (keys) => { for (const key of keys) map.delete(key); },
    },
    map,
  };
}

function memorySensitive() {
  const map = new Map();
  return {
    adapter: {
      getItem: async (key) => map.get(key) ?? null,
      setItem: async (key, value) => { map.set(key, value); },
      removeItem: async (key) => { map.delete(key); },
    },
    map,
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
  configureBthwaniSensitiveStorage({
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
  });
});

test("partner ticket attempts persist the explicit authenticated actor", async () => {
  const { adapter: durableAdapter } = memoryDurable();
  const { adapter: sensitiveAdapter } = memorySensitive();
  configureBthwaniDurableStorage(durableAdapter);
  configureBthwaniSensitiveStorage(sensitiveAdapter);

  const attempt = await getOrCreatePartnerTicketAttempt("actor-A", ticketInput);

  assert.equal(attempt.scope.actorId, "actor-A");
  assert.equal(attempt.scope.installationId.length > 0, true);
});

test("partner ticket attempts isolate actors and cleanup only the current actor", async () => {
  const { adapter: durableAdapter } = memoryDurable();
  const { adapter: sensitiveAdapter, map } = memorySensitive();
  configureBthwaniDurableStorage(durableAdapter);
  configureBthwaniSensitiveStorage(sensitiveAdapter);

  await getOrCreatePartnerTicketAttempt("actor-A", ticketInput);
  await getOrCreatePartnerTicketAttempt("actor-B", ticketInput);
  const keys = [...map.keys()].filter((key) => key.includes("partner-support/create-attempt/v4/"));
  assert.equal(keys.length, 2);
  assert.equal(keys.some((key) => key.includes("actor-A")), true);
  assert.equal(keys.some((key) => key.includes("actor-B")), true);

  await clearPartnerTicketAttempt("actor-A");
  assert.equal([...map.keys()].some((key) => key.includes("partner-support/create-attempt/v4/") && key.includes("actor-A")), false);
  assert.equal([...map.keys()].some((key) => key.includes("partner-support/create-attempt/v4/") && key.includes("actor-B")), true);
});

test("partner message attempts persist the explicit authenticated actor", async () => {
  const { adapter: durableAdapter } = memoryDurable();
  const { adapter: sensitiveAdapter } = memorySensitive();
  configureBthwaniDurableStorage(durableAdapter);
  configureBthwaniSensitiveStorage(sensitiveAdapter);

  const attempt = await getOrCreatePartnerMessageAttempt("actor-A", "ticket-1", "متابعة الحالة");

  assert.equal(attempt.scope.actorId, "actor-A");
  assert.equal(attempt.scope.entityId.startsWith("ticket-1:"), true);
});

test("partner message attempts isolate actors and cleanup only the current actor", async () => {
  const { adapter: durableAdapter } = memoryDurable();
  const { adapter: sensitiveAdapter, map } = memorySensitive();
  configureBthwaniDurableStorage(durableAdapter);
  configureBthwaniSensitiveStorage(sensitiveAdapter);

  await getOrCreatePartnerMessageAttempt("actor-A", "ticket-1", "متابعة الحالة");
  await getOrCreatePartnerMessageAttempt("actor-B", "ticket-1", "متابعة الحالة");
  const keys = [...map.keys()].filter((key) => key.includes("partner-support/message-attempt/v4/"));
  assert.equal(keys.length, 2);

  await clearPartnerMessageAttempt("actor-A", "ticket-1");
  assert.equal([...map.keys()].some((key) => key.includes("partner-support/message-attempt/v4/") && key.includes("actor-A")), false);
  assert.equal([...map.keys()].some((key) => key.includes("partner-support/message-attempt/v4/") && key.includes("actor-B")), true);
});

test("partner ticket attempts fail closed when actor identity is absent", async () => {
  const { adapter: durableAdapter } = memoryDurable();
  const { adapter: sensitiveAdapter } = memorySensitive();
  configureBthwaniDurableStorage(durableAdapter);
  configureBthwaniSensitiveStorage(sensitiveAdapter);

  await assert.rejects(
    getOrCreatePartnerTicketAttempt("", ticketInput),
    (error) => error instanceof MutationIdentityScopeError && error.reason === "missing_actor",
  );
});

test("legacy partner attempts migrate into sensitive storage and leave no durable key", async () => {
  const { adapter: durableAdapter, map: durableMap } = memoryDurable();
  const { adapter: sensitiveAdapter, map: sensitiveMap } = memorySensitive();
  configureBthwaniDurableStorage(durableAdapter);
  configureBthwaniSensitiveStorage(sensitiveAdapter);

  const first = await getOrCreatePartnerTicketAttempt("actor-A", ticketInput);
  const currentKey = [...sensitiveMap.keys()][0];
  const raw = sensitiveMap.get(currentKey);
  sensitiveMap.delete(currentKey);
  const legacyKey = currentKey.replace("/v4/", "/v3/");
  durableMap.set(legacyKey, JSON.stringify({
    ...JSON.parse(raw),
    fingerprint: JSON.stringify({
      subject: ticketInput.subject.trim(),
      description: ticketInput.description.trim(),
      category: ticketInput.category,
      priority: ticketInput.priority,
      storeId: "",
      orderId: ticketInput.orderId,
    }),
  }));

  const replay = await getOrCreatePartnerTicketAttempt("actor-A", ticketInput);
  assert.equal(replay.context.idempotencyKey, first.context.idempotencyKey);
  assert.equal(durableMap.has(legacyKey), false);
  assert.equal([...sensitiveMap.keys()].some((key) => key.includes("/v4/")), true);
});

test("generic support attempts keep only opaque identity in sensitive storage", async () => {
  const { adapter: durableAdapter, map: durableMap } = memoryDurable();
  const { adapter: sensitiveAdapter, map: sensitiveMap } = memorySensitive();
  configureBthwaniDurableStorage(durableAdapter);
  configureBthwaniSensitiveStorage(sensitiveAdapter);

  const fingerprint = JSON.stringify({ subject: "سرّي", description: "محتوى لا يُحفظ محليًا" });
  const attempt = await getOrCreateSupportMutationAttempt({
    actorId: "actor-A",
    scope: "client",
    operation: "ticket-create",
    fingerprint,
  });
  const stored = [...sensitiveMap.values()][0];
  assert.equal(attempt.fingerprint.startsWith("fnv1a64:"), true);
  assert.equal(stored.includes("محتوى لا يُحفظ محليًا"), false);
  assert.equal(durableMap.size, 0);

  const replay = await getOrCreateSupportMutationAttempt({
    actorId: "actor-A",
    scope: "client",
    operation: "ticket-create",
    fingerprint,
  });
  assert.equal(replay.context.idempotencyKey, attempt.context.idempotencyKey);

  await clearSupportMutationAttempt({
    actorId: "actor-A",
    scope: "client",
    operation: "ticket-create",
    fingerprint,
  });
  assert.equal(sensitiveMap.size, 0);
});
