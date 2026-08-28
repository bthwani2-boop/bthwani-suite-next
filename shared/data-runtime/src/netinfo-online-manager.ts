import { onlineManager, type QueryClient } from "@tanstack/react-query";
import { subscribeBthwaniConnectivity } from "./connectivity-adapter";
import { configureNativeBthwaniConnectivityAdapter } from "./native-connectivity-adapter";

export function wireNetInfoOnlineManager(
  queryClient: QueryClient,
): () => void {
  configureNativeBthwaniConnectivityAdapter();
  return subscribeBthwaniConnectivity((state) => {
    const online = Boolean(state.isConnected && state.isInternetReachable);
    onlineManager.setOnline(online);
    if (online) {
      void queryClient.resumePausedMutations();
    }
  });
}
