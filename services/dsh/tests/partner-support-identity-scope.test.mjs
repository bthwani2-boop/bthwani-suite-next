import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  MutationIdentityScopeError,
} from "@bthwani/data-runtime/mutation-identity-scope";
import {
  configureBthwaniDurableStorage,
} from "@bthwani/data-runtime/storage-adapter";
import {
  getOrCreatePartnerMessageAttempt,
  getOrCreatePartnerTicketAttempt,
} from "../frontend/shared/support/partner-support-attempt.ts";

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

afterEach(() => {
  configureBthwaniDurableStorage({
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
    getAllKeys: async () => [],
    multiRemove: async () => undefined,
  });
});

test("partner ticket attempts persist the explicit authenticated actor", async () => {
  const { adapter } = memoryDurable();
  configureBthwaniDurableStorage(adapter);

  const attempt = await getOrCreatePartnerTicketAttempt("actor-A", ticketInput);

  assert.equal(attempt.scope.actorId, "actor-A");
  assert.equal(attempt.scope.installationId.length > 0, true);
});

test("partner message attempts persist the explicit authenticated actor", async () => {
  const { adapter } = memoryDurable();
  configureBthwaniDurableStorage(adapter);

  const attempt = await getOrCreatePartnerMessageAttempt("actor-A", "ticket-1", "متابعة الحالة");

  assert.equal(attempt.scope.actorId, "actor-A");
  assert.equal(attempt.scope.entityId.startsWith("ticket-1:"), true);
});

test("partner ticket attempts fail closed when actor identity is absent", async () => {
  const { adapter } = memoryDurable();
  configureBthwaniDurableStorage(adapter);

  await assert.rejects(
    getOrCreatePartnerTicketAttempt("", ticketInput),
    (error) => error instanceof MutationIdentityScopeError && error.reason === "missing_actor",
  );
});

