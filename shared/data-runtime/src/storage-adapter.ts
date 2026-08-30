/**
 * Bthwani storage authority.
 *
 * Two distinct contracts with different durability guarantees:
 *
 * 1. BthwaniCacheStore
 *    Best-effort. Failures are swallowed; the contract returns void on
 *    set/remove and null on get/missing. Acceptable for read-side
 *    cache state (e.g. TanStack query hydration) where the server is
 *    canonical and a missed write degrades into a cache miss — never
 *    a correctness failure.
 *
 * 2. BthwaniDurableStore
 *    Correctness-critical. Every set that returns successfully proves
 *    the platform accepted the write; every set that does not return
 *    successfully throws BthwaniDurableWriteError instead of returning
 *    normally. Every remove that does not return successfully throws.
 *    Reads reject on platform failure; a failed read is never treated as a
 *    missing correctness-critical datum.
 *    Acceptable for mutation identity, unknown-remote-outcome, durable
 *    offline command, recovery quarantine — any datum whose absence
 *    could cause a duplicate server mutation, lost command, or
 *    fabricated success.
 *
 * The two contracts are configured independently per platform so
 * the same provider (e.g. AsyncStorage) can serve both roles with
 * different failure semantics.
 */

export class BthwaniDurableWriteError extends Error {
  readonly code = "BTHWANI_DURABLE_WRITE_FAILED";
  readonly key: string;
  readonly cause: unknown;

  constructor(key: string, cause: unknown) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`durable storage write failed for key ${key}: ${reason}`);
    this.name = "BthwaniDurableWriteError";
    this.key = key;
    this.cause = cause;
  }
}

export class BthwaniDurableRemoveError extends Error {
  readonly code = "BTHWANI_DURABLE_REMOVE_FAILED";
  readonly key: string;
  readonly cause: unknown;

  constructor(key: string, cause: unknown) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`durable storage remove failed for key ${key}: ${reason}`);
    this.name = "BthwaniDurableRemoveError";
    this.key = key;
    this.cause = cause;
  }
}

export type BthwaniCacheStore = {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
  readonly removeItem: (key: string) => Promise<void>;
  readonly getAllKeys: () => Promise<readonly string[]>;
  readonly multiRemove: (keys: readonly string[]) => Promise<void>;
};

export type BthwaniDurableStore = {
  readonly getItem: (key: string) => Promise<string | null>;
  /**
   * Persists the value. Returns only on a verified platform write.
   * Throws BthwaniDurableWriteError on any platform rejection
   * (quota exceeded, native module rejection, browser security
   * exception, corrupted envelope) so the caller can fail closed
   * instead of fabricating a success.
   */
  readonly setItem: (key: string, value: string) => Promise<void>;
  /**
   * Removes the value. Returns only on a verified platform delete.
   * Throws BthwaniDurableRemoveError on any platform rejection so
   * the caller cannot claim cleanup succeeded when it did not.
   */
  readonly removeItem: (key: string) => Promise<void>;
  readonly getAllKeys: () => Promise<readonly string[]>;
  readonly multiRemove: (keys: readonly string[]) => Promise<void>;
};

function browserCacheStorage(): BthwaniCacheStore {
  return {
    getItem: async (key) => {
      if (typeof window === "undefined") return null;
      try {
        return window.sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: async (key, value) => {
      if (typeof window === "undefined") return;
      try {
        window.sessionStorage.setItem(key, value);
      } catch {
        // Cache writes are best-effort by design.
      }
    },
    removeItem: async (key) => {
      if (typeof window === "undefined") return;
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // Cache removals are best-effort by design.
      }
    },
    getAllKeys: async () => {
      if (typeof window === "undefined") return [];
      try {
        return Object.keys(window.sessionStorage);
      } catch {
        return [];
      }
    },
    multiRemove: async (keys) => {
      if (typeof window === "undefined") return;
      try {
        for (const key of keys) window.sessionStorage.removeItem(key);
      } catch {
        // Cache removals are best-effort by design.
      }
    },
  };
}

function browserDurableStorage(): BthwaniDurableStore {
  return {
    getItem: async (key) => {
      if (typeof window === "undefined") {
        throw new Error("window is undefined");
      }
      try {
        return window.localStorage.getItem(key);
      } catch (cause) {
        // A read failure is not equivalent to an absent mutation. Surface it
        // so callers cannot reconstruct identity or a queue from false empty.
        throw cause;
      }
    },
    setItem: async (key, value) => {
      if (typeof window === "undefined") {
        throw new BthwaniDurableWriteError(key, new Error("window is undefined"));
      }
      try {
        window.localStorage.setItem(key, value);
      } catch (cause) {
        throw new BthwaniDurableWriteError(key, cause);
      }
    },
    removeItem: async (key) => {
      if (typeof window === "undefined") {
        throw new BthwaniDurableRemoveError(key, new Error("window is undefined"));
      }
      try {
        window.localStorage.removeItem(key);
      } catch (cause) {
        throw new BthwaniDurableRemoveError(key, cause);
      }
    },
    getAllKeys: async () => {
      if (typeof window === "undefined") {
        throw new Error("window is undefined");
      }
      try {
        return Object.keys(window.localStorage);
      } catch (cause) {
        throw cause;
      }
    },
    multiRemove: async (keys) => {
      if (typeof window === "undefined") {
        throw new BthwaniDurableRemoveError(keys.join(","), new Error("window is undefined"));
      }
      for (const key of keys) {
        try {
          window.localStorage.removeItem(key);
        } catch (cause) {
          throw new BthwaniDurableRemoveError(key, cause);
        }
      }
    },
  };
}

let activeCacheStorage: BthwaniCacheStore = browserCacheStorage();
let activeDurableStorage: BthwaniDurableStore = browserDurableStorage();

/** Installs the mobile cache owner (best-effort) for shared consumers. */
export function configureBthwaniCacheStorage(adapter: BthwaniCacheStore): void {
  activeCacheStorage = adapter;
}

/** Installs the mobile durable owner (correctness-critical) for shared consumers. */
export function configureBthwaniDurableStorage(adapter: BthwaniDurableStore): void {
  activeDurableStorage = adapter;
}

/**
 * Cross-platform cache authority. Best-effort only.
 *
 * Use this for read-side hydration caches and other non-correctness
 * state. Do NOT use this for mutation identity, unknown-remote-outcome,
 * durable offline commands, or recovery quarantine.
 */
export const bthwaniCacheStorage: BthwaniCacheStore = {
  getItem: (key) => activeCacheStorage.getItem(key),
  setItem: (key, value) => activeCacheStorage.setItem(key, value),
  removeItem: (key) => activeCacheStorage.removeItem(key),
  getAllKeys: () => activeCacheStorage.getAllKeys(),
  multiRemove: (keys) => activeCacheStorage.multiRemove(keys),
};

/**
 * Cross-platform durable authority. Correctness-critical writes throw
 * on platform rejection so the caller can fail closed.
 *
 * Use this for MUTATION_IDENTITY, UNKNOWN_REMOTE_OUTCOME,
 * DURABLE_OFFLINE_COMMAND, and RECOVERY_QUARANTINE state. Do NOT
 * use this for query cache hydration, ephemeral UI state, or any
 * datum whose loss only degrades cache freshness.
 */
export const bthwaniDurableStorage: BthwaniDurableStore = {
  getItem: (key) => activeDurableStorage.getItem(key),
  setItem: (key, value) => activeDurableStorage.setItem(key, value),
  removeItem: (key) => activeDurableStorage.removeItem(key),
  getAllKeys: () => activeDurableStorage.getAllKeys(),
  multiRemove: (keys) => activeDurableStorage.multiRemove(keys),
};
