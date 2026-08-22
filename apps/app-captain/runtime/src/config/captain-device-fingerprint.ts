type CaptainFingerprintStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

const CAPTAIN_DEVICE_FINGERPRINT_KEY = "bthwani.captain.device-fingerprint.v1";

export async function getOrCreateCaptainDeviceFingerprint(
  storage: CaptainFingerprintStorage,
  randomUUID: () => string,
): Promise<string> {
  const existing = await storage.getItem(CAPTAIN_DEVICE_FINGERPRINT_KEY);
  if (existing?.trim()) return existing;
  const created = `captain-device:${randomUUID()}`;
  await storage.setItem(CAPTAIN_DEVICE_FINGERPRINT_KEY, created);
  return created;
}