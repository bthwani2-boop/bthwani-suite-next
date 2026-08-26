declare const require: ((id: string) => unknown) | undefined;

import { BthwaniDurableRemoveError, BthwaniDurableWriteError, type BthwaniCacheStore, type BthwaniDurableStore } from "./storage-adapter.ts";

/**
 * Mobile native storage provider.
 *
 * AsyncStorage does not surface quota rejections as exceptions for
 * every operation; in practice native providers can fail on quota
 * exhaustion, encryption-key unavailability, and module linkage
 * errors. The mobile adapter translates each of those into a
 * thrown BthwaniDurableWriteError / BthwaniDurableRemoveError on
 * the durable path so mutation identity cannot be silently lost.
 *
 * Cache writes remain best-effort by design.
 */

export type NativeStorageLike = BthwaniCacheStore & {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
  readonly removeItem: (key: string) => Promise<void>;
  readonly getAllKeys: () => Promise<readonly string[]>;
  readonly multiRemove: (keys: readonly string[]) => Promise<void>;
};

type AsyncStorageModule =
  | NativeStorageLike
  | { readonly default: NativeStorageLike };

function resolveAsyncStorage(): NativeStorageLike {
  if (typeof require !== "function") {
    throw new Error("NATIVE_STORAGE_UNAVAILABLE");
  }

  const loaded = require("@react-native-async-storage/async-storage") as AsyncStorageModule;
  return "default" in loaded ? loaded.default : loaded;
}

/**
 * Best-effort cache authority backed by AsyncStorage. Used for query
 * cache hydration and other non-correctness state on mobile.
 */
export const bthwaniCacheStorage: BthwaniCacheStore = {
  getItem: (key) => resolveAsyncStorage().getItem(key),
  setItem: (key, value) => resolveAsyncStorage().setItem(key, value),
  removeItem: (key) => resolveAsyncStorage().removeItem(key),
  getAllKeys: () => resolveAsyncStorage().getAllKeys(),
  multiRemove: (keys) => resolveAsyncStorage().multiRemove([...keys]),
};

/**
 * Durable mutation authority backed by AsyncStorage. Every rejected
 * promise is surfaced as BthwaniDurableWriteError /
 * BthwaniDurableRemoveError so the caller can fail closed.
 */
export const bthwaniDurableStorage: BthwaniDurableStore = {
  getItem: (key) => resolveAsyncStorage().getItem(key),
  setItem: async (key, value) => {
    try {
      await resolveAsyncStorage().setItem(key, value);
    } catch (cause) {
      throw new BthwaniDurableWriteError(key, cause);
    }
  },
  removeItem: async (key) => {
    try {
      await resolveAsyncStorage().removeItem(key);
    } catch (cause) {
      throw new BthwaniDurableRemoveError(key, cause);
    }
  },
  getAllKeys: () => resolveAsyncStorage().getAllKeys(),
  multiRemove: async (keys) => {
    for (const key of keys) {
      try {
        await resolveAsyncStorage().removeItem(key);
      } catch (cause) {
        throw new BthwaniDurableRemoveError(key, cause);
      }
    }
  },
};

export { BthwaniDurableRemoveError, BthwaniDurableWriteError } from "./storage-adapter.ts";
