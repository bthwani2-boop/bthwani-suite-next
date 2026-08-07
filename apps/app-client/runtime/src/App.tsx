import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { DshClientSurface } from "../../../../services/dsh/frontend/app-client";
import { ClientOrderRatingGate } from "../../../../services/dsh/frontend/app-client/ratings/ClientOrderRatingGate";
import {
  configureIdentityDeviceFingerprintProvider,
  configureIdentitySession,
  configureIdentitySessionStorage,
  type SessionStorageAdapter,
  resolveIdentityApiBaseUrl,
  useIdentitySession,
} from "@bthwani/core-identity";
import { IdentitySessionGate } from "../../../../services/dsh/frontend/shared/session/IdentitySessionGate";
import { useDshMobilePushRegistration } from "../../../../services/dsh/frontend/shared/notifications/use-mobile-push-registration";

const CLIENT_DEVICE_FINGERPRINT_KEY = "bthwani.client.device-fingerprint.v1";

function createSecureStoreSessionStorageAdapter(): SessionStorageAdapter {
  return {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  };
}

async function getOrCreateClientDeviceFingerprint(): Promise<string> {
  const existing = await SecureStore.getItemAsync(CLIENT_DEVICE_FINGERPRINT_KEY);
  if (existing?.trim()) return existing;
  const created = `client-device:${Crypto.randomUUID()}`;
  await SecureStore.setItemAsync(CLIENT_DEVICE_FINGERPRINT_KEY, created);
  return created;
}

if (Platform.OS !== "web") {
  configureIdentitySessionStorage(createSecureStoreSessionStorageAdapter());
  configureIdentityDeviceFingerprintProvider(getOrCreateClientDeviceFingerprint);
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
