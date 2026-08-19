import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import {
  ClientOrderRatingGate,
  DshClientSurface,
  IdentitySessionGate,
  useDshMobilePushRegistration,
} from "@bthwani/dsh/app-client";
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
      () => Crypto.randomUUID(),
    ),
  );
}
configureIdentitySession(resolveIdentityApiBaseUrl());

function AppContent() {
  const identity = useIdentitySession();
  useDshMobilePushRegistration(identity.state.kind, "app-client", "bthwani-client-next");

  return (
    <View style={styles.root}>
      <IdentitySessionGate requiredRole="client" requiredSurface="app-client">
        <ClientOrderRatingGate>
          <DshClientSurface />
        </ClientOrderRatingGate>
      </IdentitySessionGate>
    </View>
  );
}

export default function App() {
  return <AppContent />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
