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
import {
  DshCaptainSurface,
  IdentitySessionGate,
  WorkforceAccessGate,
  WorkforceProfileProvider,
  captainNavigationTargetFromDeepLink,
  fetchCaptainOperationalReadiness,
  useDshMobilePushRegistration,
  type CaptainOperationalReadiness,
  type DshCaptainNavigationCommand,
} from "@bthwani/dsh/app-captain";
import { Button, colorRoles } from "@bthwani/ui-kit";

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

type CaptainReadinessState =
  | { readonly kind: "loading" }
  | { readonly kind: "decision"; readonly readiness: CaptainOperationalReadiness }
  | { readonly kind: "unavailable" };

function UnifiedReadinessWrapper({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CaptainReadinessState>({ kind: "loading" });
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ kind: "loading" });

    void fetchCaptainOperationalReadiness()
      .then((readiness) => {
        if (active) setState({ kind: "decision", readiness });
      })
      .catch(() => {
        if (active) setState({ kind: "unavailable" });
      });

    return () => {
      active = false;
    };
  }, [refreshToken]);

  if (state.kind === "loading") {
    return (
      <View style={styles.readinessState}>
        <ActivityIndicator accessibilityLabel="جارٍ التحقق من جاهزية الكابتن..." />
      </View>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <View style={styles.readinessState}>
        <Text style={styles.readinessError}>
          تعذر التحقق من الجاهزية التشغيلية الآن. أعد المحاولة قبل بدء العمل.
        </Text>
        <Button label="تحديث الحالة" onPress={() => setRefreshToken((value) => value + 1)} />
      </View>
    );
  }

  if (!state.readiness.ready) {
    return (
      <ReadinessGateScreen
        readiness={state.readiness}
        onRefresh={() => setRefreshToken((value) => value + 1)}
      />
    );
  }

  return <>{children}</>;
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
