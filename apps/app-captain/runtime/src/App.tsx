import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  DshCaptainApplication,
  type DshCaptainNavigation,
  type DshCaptainNavigationRoute,
} from "@bthwani/dsh/app-captain";
import { secureRandomId } from "@bthwani/dsh/mobile-capabilities";
import {
  configureIdentityDeviceFingerprintProvider,
  configureIdentitySession,
  configureIdentitySessionStorage,
  resolveIdentityApiBaseUrl,
} from "@bthwani/core-identity";
import { getOrCreateCaptainDeviceFingerprint } from "./config/captain-device-fingerprint";

const CAPTAIN_PUSH_SCHEME = "bthwani-captain-next";

if (Platform.OS !== "web") {
  configureIdentitySessionStorage({
    getItem: async (key: string) => SecureStore.getItemAsync(key),
    setItem: async (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: async (key: string) => SecureStore.deleteItemAsync(key),
  });
  configureIdentityDeviceFingerprintProvider(() =>
    getOrCreateCaptainDeviceFingerprint(
      {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
      },
      secureRandomId,
    ),
  );
}
configureIdentitySession(resolveIdentityApiBaseUrl());

export default function App({
  route,
  navigation,
}: {
  readonly route: DshCaptainNavigationRoute;
  readonly navigation: DshCaptainNavigation;
}) {
  return (
    <DshCaptainApplication
      route={route}
      navigation={navigation}
      pushScheme={CAPTAIN_PUSH_SCHEME}
    />
  );
}
