import { onlineManager, type QueryClient } from "@tanstack/react-query";
import type { BthwaniOfflineMutationQueue } from "./offline-mutation-queue";

declare const require: ((id: string) => unknown) | undefined;

type NetInfoState = {
  readonly isConnected: boolean | null;
  readonly isInternetReachable: boolean | null;
};

type NetInfoModule = {
  addEventListener(listener: (state: NetInfoState) => void): () => void;
};

export function wireNetInfoOnlineManager(
  queryClient: QueryClient,
  mutationQueue?: BthwaniOfflineMutationQueue,
): () => void {
  if (typeof require !== "function") return () => {};

  let netInfo: NetInfoModule;
  try {
    netInfo = (require("@react-native-community/netinfo") as { default: NetInfoModule }).default;
  } catch {
    return () => {};
  }

  return netInfo.addEventListener((state) => {
    const online = Boolean(state.isConnected && state.isInternetReachable);
    onlineManager.setOnline(online);
    if (online) {
      void mutationQueue?.flush();
      void queryClient.resumePausedMutations();
    }
  });
}
