import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { DshCaptainSurface } from "../../../../services/dsh/frontend/app-captain";
import * as SecureStore from "expo-secure-store";
import { configureIdentitySessionStorage, useIdentitySession } from "@bthwani/core-identity";

configureIdentitySessionStorage({
  getItem: async (key: string) => SecureStore.getItemAsync(key),
  setItem: async (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: async (key: string) => SecureStore.deleteItemAsync(key),
});

export default function App() {
  const session = useIdentitySession();

  if (session.state.kind === 'restoring' || session.state.kind === 'authenticating') {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (session.state.kind === 'signed_out' || session.state.kind === 'unconfigured' || session.state.kind === 'error') {
    // Basic mock UI for login since actual login is handled by shell normally
    // For runtime simulation, we show a dummy view if token is absent
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Please Login via Host Shell</Text>
      </View>
    );
  }

  return <DshCaptainSurface command={{ token: 0, target: "home" }} />;
}
