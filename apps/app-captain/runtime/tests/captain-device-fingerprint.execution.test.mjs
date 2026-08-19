import assert from "node:assert/strict";
import test from "node:test";

const { getOrCreateCaptainDeviceFingerprint } = await import(
  new URL("../src/config/captain-device-fingerprint.ts", import.meta.url).href
);

test("captain device fingerprint reuses the persisted identity", async () => {
  const writes = [];
  const storage = {
    getItem: async () => "captain-device:persisted",
    setItem: async (key, value) => writes.push([key, value]),
  };
  const value = await getOrCreateCaptainDeviceFingerprint(storage, () => "unused");
  assert.equal(value, "captain-device:persisted");
  assert.deepEqual(writes, []);
});

test("captain device fingerprint is created once through the canonical storage key", async () => {
  const writes = [];
  const storage = {
    getItem: async () => null,
    setItem: async (key, value) => writes.push([key, value]),
  };
  const value = await getOrCreateCaptainDeviceFingerprint(storage, () => "uuid-1");
  assert.equal(value, "captain-device:uuid-1");
  assert.deepEqual(writes, [["bthwani.captain.device-fingerprint.v1", "captain-device:uuid-1"]]);
});