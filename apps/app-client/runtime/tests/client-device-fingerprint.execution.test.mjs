import assert from "node:assert/strict";
import test from "node:test";

const { getOrCreateClientDeviceFingerprint } = await import(
  new URL("../src/config/client-device-fingerprint.ts", import.meta.url).href
);

test("client device fingerprint reuses the persisted identity", async () => {
  const writes = [];
  const storage = {
    getItem: async () => "client-device:persisted",
    setItem: async (key, value) => writes.push([key, value]),
  };
  const value = await getOrCreateClientDeviceFingerprint(storage, () => "unused");
  assert.equal(value, "client-device:persisted");
  assert.deepEqual(writes, []);
});

test("client device fingerprint is created once through the canonical storage key", async () => {
  const writes = [];
  const storage = {
    getItem: async () => null,
    setItem: async (key, value) => writes.push([key, value]),
  };
  const value = await getOrCreateClientDeviceFingerprint(storage, () => "uuid-1");
  assert.equal(value, "client-device:uuid-1");
  assert.deepEqual(writes, [["bthwani.client.device-fingerprint.v1", "client-device:uuid-1"]]);
});
