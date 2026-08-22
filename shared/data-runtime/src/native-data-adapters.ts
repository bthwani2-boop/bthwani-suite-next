import AsyncStorage from "@react-native-async-storage/async-storage";

declare const require: ((id: string) => unknown) | undefined;

export type BthwaniKeyValueStorage = {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
  readonly removeItem: (key: string) => Promise<void>;
  readonly getAllKeys: () => Promise<readonly string[]>;
  readonly multiRemove: (keys: readonly string[]) => Promise<void>;
};

/**
 * Canonical mobile key-value persistence adapter.
 * Product/domain packages consume this interface instead of importing the
 * native provider directly, keeping provider ownership inside data-runtime.
 */
export const bthwaniKeyValueStorage: BthwaniKeyValueStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
  getAllKeys: () => AsyncStorage.getAllKeys(),
  multiRemove: (keys) => AsyncStorage.multiRemove([...keys]),
};

export type BthwaniNetworkState = {
  readonly isConnected: boolean | null;
  readonly isInternetReachable: boolean | null;
};

type NetInfoModule = {
  addEventListener(listener: (state: BthwaniNetworkState) => void): () => void;
};

/**
 * Canonical connectivity subscription adapter. A missing native peer degrades
 * to an inert unsubscribe function; callers still fail closed on their own
 * offline/readiness state and never become direct NetInfo owners.
 */
export function subscribeBthwaniConnectivity(
  listener: (state: BthwaniNetworkState) => void,
): () => void {
  if (typeof require !== "function") return () => {};
  try {
    const netInfo = (require("@react-native-community/netinfo") as { default: NetInfoModule }).default;
    return netInfo.addEventListener(listener);
  } catch {
    return () => {};
  }
}
