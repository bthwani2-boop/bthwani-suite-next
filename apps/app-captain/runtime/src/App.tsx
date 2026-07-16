import React from "react";
import { View } from "react-native";
import { DshCaptainSurface } from "../../../../services/dsh/frontend/app-captain";
import * as SecureStore from "expo-secure-store";
import { configureIdentitySession, configureIdentitySessionStorage } from "@bthwani/core-identity";
import { resolveIdentityApiBaseUrl } from "../../../../services/dsh/frontend/shared/_kernel/identity-api-base-url";
import { IdentitySessionGate } from "../../../../services/dsh/frontend/shared/session/IdentitySessionGate";

configureIdentitySessionStorage({
  getItem: async (key: string) => SecureStore.getItemAsync(key),
  setItem: async (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: async (key: string) => SecureStore.deleteItemAsync(key),
});
configureIdentitySession(resolveIdentityApiBaseUrl());

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <IdentitySessionGate requiredRole="captain" requiredSurface="app-captain">
        <DshCaptainSurface command={{ token: 0, target: "home" }} />
      </IdentitySessionGate>
    </View>
  );
}
