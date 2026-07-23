import { onlineManager, type QueryClient } from "@tanstack/react-query";

type NetInfoState = {
  readonly isConnected: boolean | null;
  readonly isInternetReachable: boolean | null;
};

type NetInfoModule = {
  addEventListener(listener: (state: NetInfoState) => void): () => void;
};

/**
 * Wires TanStack Query's connectivity signal to NetInfo, matching the
 * isConnected && isInternetReachable predicate already used by
 * services/dsh/frontend/shared/field-readiness/use-field-offline-sync.ts.
 * NetInfo is an optional peer — on web/control-panel consumers that don't
 * ship it, this becomes a no-op instead of a crash.
 */
export function wireNetInfoOnlineManager(_queryClient: QueryClient): () => void {
  let netInfo: NetInfoModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    netInfo = require("@react-native-community/netinfo").default as NetInfoModule;
  } catch {
    return () => {};
  }

  return onlineManager.setEventListener((setOnline) => {
    return netInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable));
    });
  });
}
