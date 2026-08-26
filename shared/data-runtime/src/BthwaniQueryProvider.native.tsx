import { bthwaniKeyValueStorage as nativeStorage } from "./native-data-adapters";
import { configureNativeBthwaniConnectivityAdapter } from "./native-connectivity-adapter";
import { configureBthwaniStorageAdapter } from "./storage-adapter.ts";
import {
  BthwaniQueryProvider as BthwaniQueryProviderBase,
  type BthwaniQueryProviderProps,
} from "./BthwaniQueryProvider.tsx";

configureBthwaniStorageAdapter(nativeStorage);
configureNativeBthwaniConnectivityAdapter();

export { BthwaniQueryProviderBase as BthwaniQueryProvider };
export type { BthwaniQueryProviderProps };
