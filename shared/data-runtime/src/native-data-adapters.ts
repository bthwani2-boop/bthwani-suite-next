declare const require: ((id: string) => unknown) | undefined;

export type BthwaniKeyValueStorage = {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
  readonly removeItem: (key: string) => Promise<void>;
  readonly getAllKeys: () => Promise<readonly string[]>;
  readonly multiRemove: (keys: readonly string[]) => Promise<void>;
};

type AsyncStorageModule = BthwaniKeyValueStorage | { readonly default: BthwaniKeyValueStorage };

function resolveAsyncStorage(): BthwaniKeyValueStorage {
  if (typeof require !== "function") {
    throw new Error("NATIVE_STORAGE_UNAVAILABLE");
  }

  const loaded = require("@react-native-async-storage/async-storage") as AsyncStorageModule;
  return "default" in loaded ? loaded.default : loaded;
}

/**
 * Canonical mobile key-value persistence adapter.
 * Product/domain packages consume this interface instead of importing the
 * native provider directly, keeping provider ownership inside data-runtime.
 */
export const bthwaniKeyValueStorage: BthwaniKeyValueStorage = {
  getItem: (key) => resolveAsyncStorage().getItem(key),
  setItem: (key, value) => resolveAsyncStorage().setItem(key, value),
  removeItem: (key) => resolveAsyncStorage().removeItem(key),
  getAllKeys: () => resolveAsyncStorage().getAllKeys(),
  multiRemove: (keys) => resolveAsyncStorage().multiRemove([...keys]),
};
