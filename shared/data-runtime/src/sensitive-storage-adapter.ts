export type BthwaniSensitiveStore = {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
  readonly removeItem: (key: string) => Promise<void>;
};

function unavailable(operation: string, key: string): never {
  throw new Error(`BTHWANI_SENSITIVE_STORAGE_UNCONFIGURED:${operation}:${key}`);
}

let activeSensitiveStorage: BthwaniSensitiveStore = {
  getItem: async (key) => unavailable("get", key),
  setItem: async (key) => unavailable("set", key),
  removeItem: async (key) => unavailable("remove", key),
};

/**
 * Installs the platform owner for correctness-critical sensitive persistence.
 *
 * The generic durable store is intentionally not used as a fallback: browser
 * localStorage and React Native AsyncStorage are not acceptable authorities
 * for precise location or other sensitive plaintext. A surface that needs
 * sensitive durable state must explicitly configure a protected provider.
 */
export function configureBthwaniSensitiveStorage(adapter: BthwaniSensitiveStore): void {
  activeSensitiveStorage = adapter;
}

export const bthwaniSensitiveStorage: BthwaniSensitiveStore = {
  getItem: (key) => activeSensitiveStorage.getItem(key),
  setItem: (key, value) => activeSensitiveStorage.setItem(key, value),
  removeItem: (key) => activeSensitiveStorage.removeItem(key),
};
