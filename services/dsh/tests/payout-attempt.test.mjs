import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test, { afterEach } from "node:test";
import { resetBthwaniInstallationIdForTests } from "@bthwani/data-runtime/installation-id";
import { configureBthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import { configureSecureRandomUuidProvider } from "../dist/services/dsh/frontend/shared/_kernel/secure-random.js";
import {
  clearPayoutAttempt,
  getOrCreatePayoutAttempt,
} from "../dist/services/dsh/frontend/wlt/payouts/payout-attempt.js";

const INSTALLATION_KEY = "@bthwani/installation-id/v1";
const panelSource = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/wlt/payouts/PayoutDestinationPanel.tsx"),
  "utf8",
);
const fieldControllerSource = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/wlt/field-finance/use-field-finance-controller.ts"),
  "utf8",
);

function memoryDurable() {
  const map = new Map([[INSTALLATION_KEY, "payout-installation-0001"]]);
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

function specifiedIntent(overrides = {}) {
  return {
    actorType: "field",
    actorId: "field-actor",
    payoutDestinationId: "destination-1",
    payoutDestinationVersion: 3,
    amountMode: "SPECIFIED",
    amountMinorUnits: 25_000,
    currency: "yer",
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

test("payout attempt survives remount and reuses the canonical secure identity", async () => {
  const { map } = configureTestStorage();
  let generated = 0;
  configureSecureRandomUuidProvider(() => {
    generated += 1;
    return "00000000-0000-4000-8000-000000000001";
  });

  const original = await getOrCreatePayoutAttempt(specifiedIntent());
  resetBthwaniInstallationIdForTests();
  const replayAfterRuntimeReset = await getOrCreatePayoutAttempt(specifiedIntent({ currency: "YER" }));

  assert.equal(original.idempotencyKey, "payout:field:00000000-0000-4000-8000-000000000001");
  assert.equal(replayAfterRuntimeReset.idempotencyKey, original.idempotencyKey);
  assert.equal(generated, 1);
  assert.equal([...map.keys()].filter((key) => key.startsWith("@bthwani/mutation-attempt:v4/actor-payout-create/")).length, 1);
});

test("payout intents are isolated and terminal readback clears only the exact attempt", async () => {
  const { map } = configureTestStorage();
  let generated = 0;
  configureSecureRandomUuidProvider(() => `00000000-0000-4000-8000-${String(++generated).padStart(12, "0")}`);

  const original = await getOrCreatePayoutAttempt(specifiedIntent());
  const changedAmount = await getOrCreatePayoutAttempt(specifiedIntent({ amountMinorUnits: 30_000 }));
  const changedDestination = await getOrCreatePayoutAttempt(specifiedIntent({ payoutDestinationId: "destination-2" }));
  assert.notEqual(changedAmount.idempotencyKey, original.idempotencyKey);
  assert.notEqual(changedDestination.idempotencyKey, original.idempotencyKey);

  await clearPayoutAttempt(specifiedIntent(), original.signature);
  const keys = [...map.keys()].filter((key) => key.startsWith("@bthwani/mutation-attempt:v4/actor-payout-create/"));
  assert.equal(keys.length, 2);
  assert.equal(keys.some((key) => key.includes(encodeURIComponent(changedAmount.signature))), true);
  assert.equal(keys.some((key) => key.includes(encodeURIComponent(changedDestination.signature))), true);
});

test("payout creation fails closed before persisting when secure randomness fails", async () => {
  const { map } = configureTestStorage();
  configureSecureRandomUuidProvider(() => {
    throw new TypeError("Secure randomness is unavailable in this runtime");
  });

  await assert.rejects(getOrCreatePayoutAttempt(specifiedIntent()), /Secure randomness is unavailable/);
  assert.equal([...map.keys()].some((key) => key.startsWith("@bthwani/mutation-attempt:v4/actor-payout-create/")), false);
});

test("live payout consumers use one durable identity owner and canonical readback", () => {
  assert.match(panelSource, /getOrCreatePayoutAttempt\(attemptIntent\)/);
  assert.match(panelSource, /request\.idempotencyKey === attempt\.idempotencyKey/);
  assert.match(panelSource, /clearPayoutAttempt\(attemptIntent, attempt\.signature\)/);
  assert.doesNotMatch(panelSource, /useRef|randomUUID|globalThis\.crypto/);
  assert.doesNotMatch(fieldControllerSource, /submitPayout|PayoutRequest|field-payout-attempt/);
});
