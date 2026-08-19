import {
  configureIdentityClientDeviceFingerprintProvider,
} from "./identity-client.ts";
import {
  configureIdentityDeviceFingerprintProvider as configureSessionStoreDeviceFingerprintProvider,
  configureIdentitySession as configureSessionStore,
  type IdentityDeviceFingerprintProvider,
} from "./identity-session-store.ts";

const DEFAULT_DEVICE_FINGERPRINT_STORAGE_KEY = "bthwani.identity.device-fingerprint.v1";
const FALLBACK_RUNTIME_DEVICE_FINGERPRINT = `identity-runtime-device:${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;

let deviceBindingConfigured = false;

function defaultDeviceFingerprint(): string {
  try {
    const storage = globalThis.localStorage;
    const existing = storage?.getItem(DEFAULT_DEVICE_FINGERPRINT_STORAGE_KEY)?.trim();
    if (existing) return existing;
    const created = `browser-device:${globalThis.crypto?.randomUUID?.() ?? FALLBACK_RUNTIME_DEVICE_FINGERPRINT}`;
    storage?.setItem(DEFAULT_DEVICE_FINGERPRINT_STORAGE_KEY, created);
    return created;
  } catch {
    return FALLBACK_RUNTIME_DEVICE_FINGERPRINT;
  }
}

function installDeviceFingerprintProvider(provider: IdentityDeviceFingerprintProvider): void {
  if (deviceBindingConfigured) return;
  configureSessionStoreDeviceFingerprintProvider(provider);
  configureIdentityClientDeviceFingerprintProvider(provider);
  deviceBindingConfigured = true;
}

// One public configuration boundary owns both session issuance and refresh
// device proof. Native applications provide their SecureStore-backed device id;
// browser application surfaces get a stable origin-local id before Identity is
// configured. The server-only Identity client is exported from ./server and does
// not pass through this browser/mobile binding boundary.
export function configureIdentityDeviceFingerprintProvider(
  provider: IdentityDeviceFingerprintProvider,
): void {
  installDeviceFingerprintProvider(provider);
}

export function configureIdentitySession(baseUrl: string): void {
  if (!deviceBindingConfigured) {
    installDeviceFingerprintProvider(defaultDeviceFingerprint);
  }
  configureSessionStore(baseUrl);
}
