import { bthwaniCacheStorage, bthwaniDurableStorage } from "./native-data-adapters";
import { configureNativeBthwaniConnectivityAdapter } from "./native-connectivity-adapter";
import { configureBthwaniCacheStorage, configureBthwaniDurableStorage } from "./storage-adapter.ts";
import {
  BthwaniQueryProvider as BthwaniQueryProviderBase,
  type BthwaniQueryProviderProps,
} from "./BthwaniQueryProvider.tsx";

configureBthwaniCacheStorage(bthwaniCacheStorage);
configureBthwaniDurableStorage(bthwaniDurableStorage);
configureNativeBthwaniConnectivityAdapter();

export { BthwaniQueryProviderBase as BthwaniQueryProvider };
export type { BthwaniQueryProviderProps };
export { bthwaniCacheStorage, bthwaniDurableStorage };
