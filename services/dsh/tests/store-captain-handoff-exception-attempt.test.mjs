import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test, { afterEach } from "node:test";
import { resetBthwaniInstallationIdForTests } from "@bthwani/data-runtime/installation-id";
import { configureBthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import { configureSecureRandomUuidProvider } from "../dist/services/dsh/frontend/shared/_kernel/secure-random.js";
import {
  clearStoreCaptainHandoffExceptionAttempt,
  getOrCreateStoreCaptainHandoffExceptionAttempt,
} from "../dist/services/dsh/frontend/shared/dispatch/store-captain-handoff-exception-attempt.js";

const INSTALLATION_KEY = "@bthwani/installation-id/v1";
const hookSource = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/shared/dispatch/use-store-captain-handoff-exception.ts"),
  "utf8",
);

function configureTestStorage() {
  const map = new Map([[INSTALLATION_KEY, "handoff-installation-0001"]]);
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
    actor: "captain",
    actorId: "captain-1",
    entityId: "assignment-1",
    reasonCode: "handoff_shortage",
    note: "sealed package is missing one item",
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

test("handoff exception attempt reuses one secure correlation after runtime reset", async () => {
  const map = configureTestStorage();
  let generated = 0;
  configureSecureRandomUuidProvider(() => {
    generated += 1;
    return "00000000-0000-4000-8000-000000000201";
  });

  const original = await getOrCreateStoreCaptainHandoffExceptionAttempt(intent());
  resetBthwaniInstallationIdForTests();
  const replay = await getOrCreateStoreCaptainHandoffExceptionAttempt(intent({ note: " sealed package is missing one item " }));

  assert.equal(original.idempotencyKey, "captain:store-captain-handoff:00000000-0000-4000-8000-000000000201");
  assert.equal(original.correlationId, "store-captain-handoff-00000000-0000-4000-8000-000000000201");
  assert.equal(replay.correlationId, original.correlationId);
  assert.equal(replay.idempotencyKey, original.idempotencyKey);
  assert.equal(generated, 2);
  assert.equal([...map.keys()].filter((key) => key.startsWith("@bthwani/mutation-attempt:v4/store-captain-handoff-exception-report/")).length, 1);
});

test("handoff exception attempts isolate actor, role, entity, and payload", async () => {
  const map = configureTestStorage();
  let generated = 0;
  configureSecureRandomUuidProvider(() => `00000000-0000-4000-8000-${String(++generated).padStart(12, "0")}`);

  const original = await getOrCreateStoreCaptainHandoffExceptionAttempt(intent());
  const changedReason = await getOrCreateStoreCaptainHandoffExceptionAttempt(intent({ reasonCode: "handoff_mismatch" }));
  const changedActor = await getOrCreateStoreCaptainHandoffExceptionAttempt(intent({ actorId: "captain-2" }));
  const partner = await getOrCreateStoreCaptainHandoffExceptionAttempt(intent({ actor: "partner", actorId: "partner-1", entityId: "order-1" }));
  assert.notEqual(changedReason.correlationId, original.correlationId);
  assert.notEqual(changedActor.correlationId, original.correlationId);
  assert.notEqual(partner.correlationId, original.correlationId);

  await clearStoreCaptainHandoffExceptionAttempt(intent(), original.signature);
  assert.equal([...map.keys()].filter((key) => key.startsWith("@bthwani/mutation-attempt:v4/store-captain-handoff-exception-report/")).length, 3);
});

test("live handoff consumer clears only after exact canonical correlation readback", () => {
  assert.match(hookSource, /getOrCreateStoreCaptainHandoffExceptionAttempt\(attemptIntent\)/);
  assert.match(hookSource, /item\.correlationId !== attempt\.correlationId/);
  assert.match(hookSource, /clearStoreCaptainHandoffExceptionAttempt\(attemptIntent, attempt\.signature\)/);
  assert.doesNotMatch(hookSource, /Date\.now|randomUUID|useRef/);
});
