import assert from "node:assert/strict";
import test from "node:test";

const { getOrCreatePartnerDeviceFingerprint } = await import(
  new URL("../src/config/partner-device-fingerprint.ts", import.meta.url).href
);

test("partner device fingerprint reuses the persisted identity", async () => {
  const writes = [];
  const storage = {
    getItem: async () => "partner-device:persisted",
    setItem: async (key, value) => writes.push([key, value]),
  };
  const value = await getOrCreatePartnerDeviceFingerprint(storage, () => "unused");
  assert.equal(value, "partner-device:persisted");
  assert.deepEqual(writes, []);
});

test("partner device fingerprint is created once through the canonical storage key", async () => {
  const writes = [];
  const storage = {
    getItem: async () => null,
    setItem: async (key, value) => writes.push([key, value]),
  };
  const value = await getOrCreatePartnerDeviceFingerprint(storage, () => "uuid-2");
  assert.equal(value, "partner-device:uuid-2");
  assert.deepEqual(writes, [["bthwani.partner.device-fingerprint.v1", "partner-device:uuid-2"]]);
});
