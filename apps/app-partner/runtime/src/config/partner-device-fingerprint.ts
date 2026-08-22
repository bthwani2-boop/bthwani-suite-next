type PartnerFingerprintStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

const PARTNER_DEVICE_FINGERPRINT_KEY = "bthwani.partner.device-fingerprint.v1";

export async function getOrCreatePartnerDeviceFingerprint(
  storage: PartnerFingerprintStorage,
  randomUUID: () => string,
): Promise<string> {
  const existing = await storage.getItem(PARTNER_DEVICE_FINGERPRINT_KEY);
  if (existing?.trim()) return existing;
  const created = `partner-device:${randomUUID()}`;
  await storage.setItem(PARTNER_DEVICE_FINGERPRINT_KEY, created);
  return created;
}
