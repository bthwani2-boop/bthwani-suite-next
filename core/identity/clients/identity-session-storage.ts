export interface SessionStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Wraps window.localStorage (sync) in the async adapter interface. */
export function createBrowserSessionStorageAdapter(): SessionStorageAdapter {
  return {
    getItem: async (key) => localStorage.getItem(key),
    setItem: async (key, value) => {
      localStorage.setItem(key, value);
    },
    removeItem: async (key) => {
      localStorage.removeItem(key);
    },
  };
}

/**
 * Safe no-op fallback used when neither localStorage nor an injected
 * adapter is available (e.g. before configureIdentitySessionStorage runs on
 * native, or during SSR). Equivalent to today's IS_BROWSER=false behavior.
 */
export function createMemorySessionStorageAdapter(): SessionStorageAdapter {
  return {
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
  };
}

export function defaultSessionStorageAdapter(): SessionStorageAdapter {
  const isBrowser =
    typeof window !== "undefined" && typeof localStorage !== "undefined";
  return isBrowser
    ? createBrowserSessionStorageAdapter()
    : createMemorySessionStorageAdapter();
}
