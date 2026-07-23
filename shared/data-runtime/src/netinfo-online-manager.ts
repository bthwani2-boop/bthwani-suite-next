import { onlineManager, type QueryClient } from "@tanstack/react-query";

declare const require: ((id: string) => unknown) | undefined;

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
  if (typeof require !== "function") return () => {};

  let netInfo: NetInfoModule;
  try {
    netInfo = (require("@react-native-community/netinfo") as { default: NetInfoModule }).default;
  } catch {
    return () => {};
  }

  return netInfo.addEventListener((state) => {
    onlineManager.setOnline(Boolean(state.isConnected && state.isInternetReachable));
  });
}
