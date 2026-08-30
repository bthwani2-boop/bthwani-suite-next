import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  ClientOrderRatingGate,
  DshClientPlatformProvider,
  DshClientSurface,
  IdentitySessionGate,
  useDshMobilePushRegistration,
  type DshClientNavigation,
  type DshClientRoute,
  type DshClientPlatform,
} from "@bthwani/dsh/app-client";
import {
  createClientEphemeralId,
  openClientExternalUrl,
  performClientSelectionHaptic,
  shareClientTextDocument,
} from "./platform/client-platform-actions";
import { ClientRemoteImage } from "./media/ClientRemoteImage";
import { secureRandomId } from "@bthwani/dsh/mobile-capabilities";
import {
  configureIdentityDeviceFingerprintProvider,
  configureIdentitySession,
  configureIdentitySessionStorage,
  type SessionStorageAdapter,
  resolveIdentityApiBaseUrl,
  useIdentitySession,
} from "@bthwani/core-identity";
import { getOrCreateClientDeviceFingerprint } from "./config/client-device-fingerprint";

function createSecureStoreSessionStorageAdapter(): SessionStorageAdapter {
  return {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  };
}

if (Platform.OS !== "web") {
  configureIdentitySessionStorage(createSecureStoreSessionStorageAdapter());
  configureIdentityDeviceFingerprintProvider(() =>
    getOrCreateClientDeviceFingerprint(
      {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
      },
      secureRandomId,
    ),
  );
}
configureIdentitySession(resolveIdentityApiBaseUrl());

export type ClientAppProps = {
  readonly route: DshClientRoute;
  readonly navigation: DshClientNavigation;
};

const clientPlatform: DshClientPlatform = {
  RemoteImage: ClientRemoteImage,
  createEphemeralId: createClientEphemeralId,
  selectionHaptic: performClientSelectionHaptic,
  openExternalUrl: openClientExternalUrl,
  shareTextDocument: shareClientTextDocument,
};

function AppContent({ route, navigation }: ClientAppProps) {
  const identity = useIdentitySession();
  useDshMobilePushRegistration(identity.state.kind, "app-client", "bthwani-client-next");
  return (
    <View style={styles.root}>
      <IdentitySessionGate requiredRole="client" requiredSurface="app-client">
        <ClientOrderRatingGate>
          <DshClientPlatformProvider platform={clientPlatform}>
            <DshClientSurface route={route} navigation={navigation} />
          </DshClientPlatformProvider>
        </ClientOrderRatingGate>
      </IdentitySessionGate>
    </View>
  );
}

export default function App(props: ClientAppProps) {
  return <AppContent {...props} />;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
