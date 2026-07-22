import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { DshClientSurface } from "../../../../services/dsh/frontend/app-client";
import {
  configureIdentitySession,
  configureIdentitySessionStorage,
  type SessionStorageAdapter,
  useIdentitySession,
} from "@bthwani/core-identity";
import { resolveIdentityApiBaseUrl } from "../../../../services/dsh/frontend/shared/_kernel/identity-api-base-url";
import { IdentitySessionGate } from "../../../../services/dsh/frontend/shared/session/IdentitySessionGate";
import { useDshMobilePushRegistration } from "../../../../services/dsh/frontend/shared/notifications/use-mobile-push-registration";

function createSecureStoreSessionStorageAdapter(): SessionStorageAdapter {
  return {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  };
}

if (Platform.OS !== "web") {
  configureIdentitySessionStorage(createSecureStoreSessionStorageAdapter());
}
configureIdentitySession(resolveIdentityApiBaseUrl());

function AppContent() {
  const identity = useIdentitySession();
  useDshMobilePushRegistration(identity.state.kind, "app-client", "bthwani-client-next");

  return (
    <View style={styles.root}>
      <IdentitySessionGate requiredRole="client" requiredSurface="app-client">
        <DshClientSurface />
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
