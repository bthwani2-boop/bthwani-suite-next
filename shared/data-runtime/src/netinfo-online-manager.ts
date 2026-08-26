import { onlineManager, type QueryClient } from "@tanstack/react-query";
import type { BthwaniOfflineMutationQueue } from "./offline-mutation-queue";
import { subscribeBthwaniConnectivity } from "./connectivity-adapter";
import { configureNativeBthwaniConnectivityAdapter } from "./native-connectivity-adapter";

export function wireNetInfoOnlineManager(
  queryClient: QueryClient,
  mutationQueue?: BthwaniOfflineMutationQueue,
): () => void {
  configureNativeBthwaniConnectivityAdapter();
  return subscribeBthwaniConnectivity((state) => {
    const online = Boolean(state.isConnected && state.isInternetReachable);
    onlineManager.setOnline(online);
    if (online) {
      void mutationQueue?.flush();
      void queryClient.resumePausedMutations();
    }
  });
}
