import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test, { afterEach } from "node:test";
import { configureBthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import { resetBthwaniInstallationIdForTests } from "@bthwani/data-runtime/installation-id";
import { configureSecureRandomUuidProvider } from "../dist/services/dsh/frontend/shared/_kernel/secure-random.js";
import {
  clearCaptainPartnerFleetCommandAttempt,
  findPendingCaptainPartnerFleetConnectAttempt,
  getOrCreateCaptainPartnerFleetCommandAttempt,
} from "../dist/services/dsh/frontend/shared/partner/partner-fleet-command-attempt.js";

const INSTALLATION_KEY = "@bthwani/installation-id/v1";
const cardSource = readFileSync(
  resolve(process.cwd(), "services/dsh/frontend/app-captain/account/PartnerFleetConnectionCard.tsx"),
  "utf8",
);

function configureTestStorage() {
  const map = new Map([[INSTALLATION_KEY, "partner-fleet-installation-0001"]]);
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

test("Captain partner-fleet connect reuses exact durable identity after uncertain response", async () => {
  const map = configureTestStorage();
  configureSecureRandomUuidProvider(() => "00000000-0000-4000-8000-000000000301");
  const intent = { actorId: "captain-fleet-1", command: "connect", code: "ABCDE23456" };
  const original = await getOrCreateCaptainPartnerFleetCommandAttempt(intent);
  const replay = await getOrCreateCaptainPartnerFleetCommandAttempt({ ...intent, code: "abcde-23456" });
  const pending = await findPendingCaptainPartnerFleetConnectAttempt(intent.actorId);

  assert.equal(replay.idempotencyKey, original.idempotencyKey);
  assert.equal(pending?.code, "ABCDE23456");
  assert.equal([...map.keys()].some((key) => key.includes("ABCDE23456")), false);

  await clearCaptainPartnerFleetCommandAttempt(intent, original.fingerprint);
  assert.equal(await findPendingCaptainPartnerFleetConnectAttempt(intent.actorId), null);
});

test("Captain partner-fleet disconnect isolates membership version and actor", async () => {
  configureTestStorage();
  let generated = 301;
  configureSecureRandomUuidProvider(() => `00000000-0000-4000-8000-${String(++generated).padStart(12, "0")}`);
  const first = await getOrCreateCaptainPartnerFleetCommandAttempt({
    actorId: "captain-fleet-1",
    command: "disconnect",
    teamMemberId: "member-1",
    storeId: "store-1",
    expectedVersion: 2,
  });
  const changed = await getOrCreateCaptainPartnerFleetCommandAttempt({
    actorId: "captain-fleet-1",
    command: "disconnect",
    teamMemberId: "member-1",
    storeId: "store-1",
    expectedVersion: 3,
  });
  assert.notEqual(first.idempotencyKey, changed.idempotencyKey);
});

test("Captain partner-fleet surface uses identity-scoped durable commands and exact cleanup", () => {
  assert.match(cardSource, /useIdentitySession/);
  assert.match(cardSource, /getOrCreateCaptainPartnerFleetCommandAttempt/);
  assert.match(cardSource, /clearCaptainPartnerFleetCommandAttempt\(intent, attempt\.fingerprint\)/);
  assert.doesNotMatch(cardSource, /connectCaptainToPartnerFleet\(normalizedCode\)/);
});
