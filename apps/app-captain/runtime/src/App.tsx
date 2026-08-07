import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import {
  configureIdentityDeviceFingerprintProvider,
  configureIdentitySession,
  configureIdentitySessionStorage,
  resolveIdentityApiBaseUrl,
  useIdentitySession,
} from "@bthwani/core-identity";
import { colorRoles } from "@bthwani/ui-kit";

import { DshCaptainSurface } from "../../../../services/dsh/frontend/app-captain";
import { IdentitySessionGate } from "../../../../services/dsh/frontend/shared/session/IdentitySessionGate";
import { useDshMobilePushRegistration } from "../../../../services/dsh/frontend/shared/notifications/use-mobile-push-registration";
import {
  WorkforceAccessGate,
  WorkforceProfileProvider,
  useWorkforceProfile,
} from "../../../../services/dsh/frontend/shared/workforce";
import { getReadinessGate } from "../../../../services/dsh/frontend/shared/workforce/workforce.api";
import type { ReadinessGate } from "../../../../services/dsh/frontend/shared/workforce/workforce.types";
import { ReadinessGateScreen } from "./features/readiness/ReadinessGateScreen";

const CAPTAIN_DEVICE_FINGERPRINT_KEY = "bthwani.captain.device-fingerprint.v1";

async function getOrCreateCaptainDeviceFingerprint(): Promise<string> {
  const existing = await SecureStore.getItemAsync(CAPTAIN_DEVICE_FINGERPRINT_KEY);
  if (existing?.trim()) return existing;
  const created = `captain-device:${Crypto.randomUUID()}`;
  await SecureStore.setItemAsync(CAPTAIN_DEVICE_FINGERPRINT_KEY, created);
  return created;
}

if (Platform.OS !== "web") {
  configureIdentitySessionStorage({
    getItem: async (key: string) => SecureStore.getItemAsync(key),
    setItem: async (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: async (key: string) => SecureStore.deleteItemAsync(key),
  });
  configureIdentityDeviceFingerprintProvider(getOrCreateCaptainDeviceFingerprint);
}
configureIdentitySession(resolveIdentityApiBaseUrl());

function UnifiedReadinessWrapper({ children }: { children: React.ReactNode }) {
  const workforce = useWorkforceProfile();
  const [readiness, setReadiness] = useState<ReadinessGate | null>(null);

  const fetchReadiness = async () => {
    if (workforce.state.kind === "ready") {
      try {
        const gate = await getReadinessGate(workforce.state.me.actorId);
        setReadiness(gate);
      } catch (err) {
        setReadiness({
          actorId: workforce.state.me.actorId,
          status: "BLOCKED",
          blockerReasons: ["ELIGIBILITY_UNAVAILABLE"],
          checkedAt: new Date().toISOString(),
        });
      }
    }
  };

  useEffect(() => {
    fetchReadiness();
  }, [workforce.state]);

  if (readiness && readiness.status === "BLOCKED") {
    return <ReadinessGateScreen readiness={readiness} onRefresh={fetchReadiness} />;
  }

  // Only render operational surface if explicitly allowed or still loading (in which case WorkforceAccessGate might show loading)
  if (readiness && readiness.status === "ALLOWED") {
    return <>{children}</>;
  }
  return null;
}

function AppContent() {
  const identity = useIdentitySession();
  useDshMobilePushRegistration(identity.state.kind, "app-captain", "bthwani-captain-next");

  const logout = () => {
    void identity.logout();
  };

  return (
    <View style={styles.root}>
      <IdentitySessionGate requiredRole="captain" requiredSurface="app-captain">
        <WorkforceAccessGate expectedKind="captain" onLogout={logout}>
          <UnifiedReadinessWrapper>
            <DshCaptainSurface command={{ token: 0, target: "home" }} />
          </UnifiedReadinessWrapper>
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
