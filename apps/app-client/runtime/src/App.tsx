import React from "react";
import { StyleSheet, View } from "react-native";
import { DshClientSurface } from "../../../../services/dsh/frontend/app-client";
import {
  configureIdentitySession,
  configureIdentitySessionStorage,
  type SessionStorageAdapter,
} from "@bthwani/core-identity";
import { resolveIdentityApiBaseUrl } from "../../../../services/dsh/frontend/shared/_kernel/identity-api-base-url";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

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
export default function App() {
  return (
    <View style={styles.root}>
      <DshClientSurface />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
