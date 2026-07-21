import React from "react";
import { StyleSheet, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  configureIdentitySession,
  configureIdentitySessionStorage,
  useIdentitySession,
} from "@bthwani/core-identity";
import { colorRoles } from "@bthwani/ui-kit";

import { DshCaptainSurface } from "../../../../services/dsh/frontend/app-captain";
import { resolveIdentityApiBaseUrl } from "../../../../services/dsh/frontend/shared/_kernel/identity-api-base-url";
import { IdentitySessionGate } from "../../../../services/dsh/frontend/shared/session/IdentitySessionGate";
import {
  WorkforceAccessGate,
  WorkforceProfileProvider,
} from "../../../../services/dsh/frontend/shared/workforce";

configureIdentitySessionStorage({
  getItem: async (key: string) => SecureStore.getItemAsync(key),
  setItem: async (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: async (key: string) => SecureStore.deleteItemAsync(key),
});
configureIdentitySession(resolveIdentityApiBaseUrl());

function AppContent() {
  const identity = useIdentitySession();
  const logout = () => {
    void identity.logout();
  };

  return (
    <View style={styles.root}>
      <IdentitySessionGate requiredRole="captain" requiredSurface="app-captain">
        <WorkforceAccessGate expectedKind="captain" onLogout={logout}>
          <DshCaptainSurface command={{ token: 0, target: "home" }} />
        </WorkforceAccessGate>
      </IdentitySessionGate>
    </View>
  );
}

export default function App() {
  return (
    <WorkforceProfileProvider>
      <AppContent />
    </WorkforceProfileProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colorRoles.surfaceBase,
  },
});
