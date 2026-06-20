import type { ExpoConfig } from "expo/config";

export type BthwaniMobileAppKey = "app-client" | "app-partner" | "app-captain" | "app-field";

export declare function defineBthwaniExpoApp(appKey: BthwaniMobileAppKey): ExpoConfig;
