import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colorRoles } from "@bthwani/ui-kit";
import { DshPartnerSurface } from "../../../../services/dsh/frontend/app-partner";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  configureIdentitySession,
  configureIdentitySessionStorage,
  type SessionStorageAdapter,
} from "@bthwani/core-identity";
import { resolveIdentityApiBaseUrl } from "../../../../services/dsh/frontend/shared/_kernel/identity-api-base-url";
import { IdentitySessionGate } from "../../../../services/dsh/frontend/shared/session/IdentitySessionGate";

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
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <View style={styles.screen}>
        <IdentitySessionGate requiredRole="partner" requiredSurface="app-partner">
          <DshPartnerSurface />
        </IdentitySessionGate>
      </View>
    </View>
  );
}

export default function App() {
  return <AppContent />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceMuted },
  screen: { flex: 1 },
});
