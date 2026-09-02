import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test, { afterEach } from "node:test";
import { resetBthwaniInstallationIdForTests } from "@bthwani/data-runtime/installation-id";
import { configureBthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import { configureSecureRandomUuidProvider } from "../dist/services/dsh/frontend/shared/_kernel/secure-random.js";
import {
  clearCommissionAdjustmentAttempt,
  getOrCreateCommissionAdjustmentAttempt,
} from "../dist/services/dsh/frontend/wlt-boundary/commissions/commission-adjustment-attempt.js";

const INSTALLATION_KEY = "@bthwani/installation-id/v1";
const panelSource = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/control-panel/finance/CommissionGovernancePanel.tsx"),
  "utf8",
);
const apiSource = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/wlt-boundary/commissions/commission.api.ts"),
  "utf8",
);

function memoryDurable() {
  const map = new Map([[INSTALLATION_KEY, "commission-installation-0001"]]);
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

function configureTestStorage() {
  const store = memoryDurable();
  resetBthwaniInstallationIdForTests();
  configureBthwaniDurableStorage(store.adapter);
  return store;
}

function intent(overrides = {}) {
  return {
    operatorActorId: "operator-1",
    commissionId: "commission-1",
    deltaMinorUnits: 500,
    reason: "verified correction",
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
    multiRemove: async (keys) => { void keys; },
  });
});

test("commission adjustment keeps one actor-scoped identity across runtime reset", async () => {
  const { map } = configureTestStorage();
  let generated = 0;
  configureSecureRandomUuidProvider(() => {
    generated += 1;
    return "00000000-0000-4000-8000-000000000101";
  });

  const original = await getOrCreateCommissionAdjustmentAttempt(intent());
  resetBthwaniInstallationIdForTests();
  const replay = await getOrCreateCommissionAdjustmentAttempt(intent({ reason: " verified correction " }));

  assert.equal(original.idempotencyKey, "commission-adjustment:commission-1:00000000-0000-4000-8000-000000000101");
  assert.equal(replay.idempotencyKey, original.idempotencyKey);
  assert.equal(generated, 1);
  assert.equal([...map.keys()].filter((key) => key.startsWith("@bthwani/mutation-attempt:v4/commission-adjustment/")).length, 1);
});

test("commission adjustment intents isolate actor, target, and financial intent", async () => {
  const { map } = configureTestStorage();
  let generated = 0;
  configureSecureRandomUuidProvider(() => `00000000-0000-4000-8000-${String(++generated).padStart(12, "0")}`);

  const original = await getOrCreateCommissionAdjustmentAttempt(intent());
  const changedReason = await getOrCreateCommissionAdjustmentAttempt(intent({ reason: "second correction" }));
  const changedActor = await getOrCreateCommissionAdjustmentAttempt(intent({ operatorActorId: "operator-2" }));
  assert.notEqual(changedReason.idempotencyKey, original.idempotencyKey);
  assert.notEqual(changedActor.idempotencyKey, original.idempotencyKey);

  await clearCommissionAdjustmentAttempt(intent(), original.signature);
  assert.equal([...map.keys()].filter((key) => key.startsWith("@bthwani/mutation-attempt:v4/commission-adjustment/")).length, 2);
});

test("commission adjustment consumer clears only after exact canonical readback", () => {
  assert.match(panelSource, /getOrCreateCommissionAdjustmentAttempt\(attemptIntent\)/);
  assert.match(panelSource, /adjustment\.idempotencyKey === attempt\.idempotencyKey/);
  assert.match(panelSource, /clearCommissionAdjustmentAttempt\(attemptIntent, attempt\.signature\)/);
  assert.match(apiSource, /adjustCommission = \([\s\S]*idempotencyKey: string/);
  assert.doesNotMatch(apiSource, /secureRandomId|randomUUID|Date\.now/);
});
