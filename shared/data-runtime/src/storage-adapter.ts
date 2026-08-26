export type BthwaniKeyValueStorage = {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
  readonly removeItem: (key: string) => Promise<void>;
  readonly getAllKeys: () => Promise<readonly string[]>;
  readonly multiRemove: (keys: readonly string[]) => Promise<void>;
};

function browserStorage(): BthwaniKeyValueStorage {
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
        // Browser persistence is best-effort; server state remains canonical.
      }
    },
    removeItem: async (key) => {
      if (typeof window === "undefined") return;
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // Browser persistence is best-effort; server state remains canonical.
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
        // Browser persistence is best-effort; server state remains canonical.
      }
    },
  };
}

let activeStorageAdapter: BthwaniKeyValueStorage = browserStorage();

/** Installs the mobile owner while keeping shared consumers platform-neutral. */
export function configureBthwaniStorageAdapter(
  adapter: BthwaniKeyValueStorage,
): void {
  activeStorageAdapter = adapter;
}

/** Cross-platform persistence seam; browser is the default owner. */
export const bthwaniKeyValueStorage: BthwaniKeyValueStorage = {
  getItem: (key) => activeStorageAdapter.getItem(key),
  setItem: (key, value) => activeStorageAdapter.setItem(key, value),
  removeItem: (key) => activeStorageAdapter.removeItem(key),
  getAllKeys: () => activeStorageAdapter.getAllKeys(),
  multiRemove: (keys) => activeStorageAdapter.multiRemove(keys),
};
