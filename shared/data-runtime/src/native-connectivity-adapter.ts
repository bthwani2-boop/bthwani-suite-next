import {
  bthwaniBrowserConnectivityAdapter,
  configureBthwaniConnectivityAdapter,
  type BthwaniConnectivityAdapter,
  type BthwaniNetworkState,
} from "./connectivity-adapter";

declare const require: ((id: string) => unknown) | undefined;

type NetInfoModule = {
  addEventListener(listener: (state: BthwaniNetworkState) => void): () => void;
};

type NetInfoModuleExport = NetInfoModule | { readonly default: NetInfoModule };

function createNativeConnectivityAdapter(): BthwaniConnectivityAdapter {
  return {
    subscribe: (listener) => {
      if (typeof require !== "function") return bthwaniBrowserConnectivityAdapter.subscribe(listener);
      try {
        const loaded = require("@react-native-community/netinfo") as NetInfoModuleExport;
        const netInfo = "default" in loaded ? loaded.default : loaded;
        return netInfo.addEventListener(listener);
      } catch {
        return bthwaniBrowserConnectivityAdapter.subscribe(listener);
      }
    },
  };
}

/**
 * Installs the native owner for mobile runtimes. Web consumers retain the
 * browser owner and never resolve this module through a web alias.
 */
export function configureNativeBthwaniConnectivityAdapter(): void {
  configureBthwaniConnectivityAdapter(createNativeConnectivityAdapter());
}
