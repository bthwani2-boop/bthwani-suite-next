export type BthwaniNetworkState = {
  readonly isConnected: boolean | null;
  readonly isInternetReachable: boolean | null;
};

export type BthwaniConnectivityAdapter = {
  readonly subscribe: (listener: (state: BthwaniNetworkState) => void) => () => void;
};

function browserNetworkState(): BthwaniNetworkState {
  const online = typeof navigator === "undefined" ? null : navigator.onLine;
  return { isConnected: online, isInternetReachable: online };
}

/** Canonical browser connectivity owner used by web consumers. */
export const bthwaniBrowserConnectivityAdapter: BthwaniConnectivityAdapter = {
  subscribe: (listener) => {
    if (typeof window === "undefined") return () => {};

    const emit = () => listener(browserNetworkState());
    const handleOnline = () => emit();
    const handleOffline = () => emit();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    emit();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  },
};

let activeConnectivityAdapter: BthwaniConnectivityAdapter = bthwaniBrowserConnectivityAdapter;

/** Installs a platform owner while keeping consumers on the same typed seam. */
export function configureBthwaniConnectivityAdapter(
  adapter: BthwaniConnectivityAdapter,
): void {
  activeConnectivityAdapter = adapter;
}

export function subscribeBthwaniConnectivity(
  listener: (state: BthwaniNetworkState) => void,
): () => void {
  return activeConnectivityAdapter.subscribe(listener);
}
