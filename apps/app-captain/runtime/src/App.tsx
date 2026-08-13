import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, View } from "react-native";
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
import { captainNavigationTargetFromDeepLink } from "../../../../services/dsh/frontend/shared/delivery/captain-deep-link";
import type { DshCaptainNavigationCommand } from "../../../../services/dsh/frontend/shared/delivery/captain.surface.types";
import { IdentitySessionGate } from "../../../../services/dsh/frontend/shared/session/IdentitySessionGate";
import { useDshMobilePushRegistration } from "../../../../services/dsh/frontend/shared/notifications/use-mobile-push-registration";
import {
  WorkforceAccessGate,
  WorkforceProfileProvider,
  useWorkforceProfile,
} from "../../../../services/dsh/frontend/shared/workforce";
import { fetchWorkforceReadiness } from "../../../../services/dsh/frontend/shared/workforce/workforce-me.api";
import type { ReadinessGate } from "../../../../services/dsh/frontend/shared/workforce/workforce.types";
import { ReadinessGateScreen } from "./features/readiness/ReadinessGateScreen";
import {
  classifyCaptainReadiness,
  createCaptainEligibilityUnavailableGate,
} from "./features/readiness/captain-readiness.policy";

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
  const [readinessRefreshToken, setReadinessRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    setReadiness(null);
    if (workforce.state.kind !== "ready") {
      return () => {
        active = false;
      };
    }

    const { actorId, workforceKind } = workforce.state.me;
    void fetchWorkforceReadiness(actorId)
      .then((gate) => {
        if (!active) return;
        if (gate.actorId !== actorId || gate.workforceKind !== workforceKind) {
          setReadiness(createCaptainEligibilityUnavailableGate({ actorId, workforceKind }));
          return;
        }
        setReadiness(gate);
      })
      .catch(() => {
        if (!active) return;
        setReadiness(createCaptainEligibilityUnavailableGate({ actorId, workforceKind }));
      });

    return () => {
      active = false;
    };
  }, [readinessRefreshToken, workforce.state]);

  const currentReadiness = workforce.state.kind === "ready"
    && readiness?.actorId === workforce.state.me.actorId
    && readiness.workforceKind === workforce.state.me.workforceKind
    ? readiness
    : null;

  const presentation = classifyCaptainReadiness(currentReadiness);
  if (presentation === "loading") {
    return (
      <View style={styles.readinessState}>
        <ActivityIndicator accessibilityLabel="جارٍ التحقق من جاهزية الكابتن..." />
      </View>
    );
  }

  if (presentation === "blocked" && currentReadiness) {
    return (
      <ReadinessGateScreen
        readiness={currentReadiness}
        onRefresh={() => setReadinessRefreshToken((value) => value + 1)}
      />
    );
  }

  if (presentation === "allowed") {
    return <>{children}</>;
  }

  return (
    <View style={styles.readinessState}>
      <Text style={styles.readinessError}>حالة جاهزية غير معروفة. يرجى المحاولة مرة أخرى.</Text>
    </View>
  );
}

function CaptainSessionEffects() {
  const identity = useIdentitySession();
  useDshMobilePushRegistration(identity.state.kind, "app-captain", "bthwani-captain-next");
  return null;
}

function AppContent() {
  const identity = useIdentitySession();
  const [navigationCommand, setNavigationCommand] = useState<DshCaptainNavigationCommand>({ token: 0, target: "home" });

  useEffect(() => {
    let active = true;
    const consumeDeepLink = (url: string) => {
      const target = captainNavigationTargetFromDeepLink(url);
      if (!active || !target) return;
      setNavigationCommand({ token: Date.now(), target });
    };
    void Linking.getInitialURL().then((url) => {
      if (url) consumeDeepLink(url);
    });
    const subscription = Linking.addEventListener("url", ({ url }) => consumeDeepLink(url));
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const logout = () => {
    void identity.logout();
  };

  return (
    <View style={styles.root}>
      <IdentitySessionGate requiredRole="captain" requiredSurface="app-captain">
        <WorkforceAccessGate expectedKind="captain" onLogout={logout}>
          <CaptainSessionEffects />
          <UnifiedReadinessWrapper>
            <DshCaptainSurface command={navigationCommand} />
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
  readinessState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colorRoles.surfaceBase,
  },
  readinessError: {
    textAlign: "center",
  },
});
