import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Button, colorRoles } from "@bthwani/ui-kit";

import {
  DshFieldProfileCompletionScreen,
  DshFieldSurface,
  IdentitySessionGate,
  WorkforceAccessGate,
  WorkforceProfileProvider,
  fetchFieldOperationalReadiness,
  useDshMobilePushRegistration,
  type FieldOperationalReadiness,
  type DshFieldNavigation,
  type DshFieldRouteState,
} from "@bthwani/dsh/app-field";
import {
  configureIdentityDeviceFingerprintProvider,
  configureIdentitySession,
  configureIdentitySessionStorage,
  type SessionStorageAdapter,
  resolveIdentityApiBaseUrl,
  useIdentitySession,
} from "@bthwani/core-identity";
import { ReadinessGateScreen } from "./features/readiness/ReadinessGateScreen";

const FIELD_DEVICE_FINGERPRINT_KEY = "bthwani.field.device-fingerprint.v1";
const FIELD_APP_SCHEME = "bthwani-field-next";

function createSecureStoreSessionStorageAdapter(): SessionStorageAdapter {
  return {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  };
}

async function getOrCreateFieldDeviceFingerprint(): Promise<string> {
  const existing = await SecureStore.getItemAsync(FIELD_DEVICE_FINGERPRINT_KEY);
  if (existing?.trim()) return existing;
  const created = `field-device:${Crypto.randomUUID()}`;
  await SecureStore.setItemAsync(FIELD_DEVICE_FINGERPRINT_KEY, created);
  return created;
}

if (Platform.OS !== "web") {
  configureIdentitySessionStorage(createSecureStoreSessionStorageAdapter());
  configureIdentityDeviceFingerprintProvider(getOrCreateFieldDeviceFingerprint);
}
configureIdentitySession(resolveIdentityApiBaseUrl());

type InstallationState =
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly installationId: string }
  | { readonly kind: "error" };

function UnifiedReadinessWrapper({ children }: { children: React.ReactNode }) {
  const [readiness, setReadiness] = useState<FieldOperationalReadiness | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [readinessRefreshToken, setReadinessRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    setReadiness(null);
    setUnavailable(false);

    void fetchFieldOperationalReadiness()
      .then((gate) => {
        if (active) setReadiness(gate);
      })
      .catch(() => {
        if (active) setUnavailable(true);
      });

    return () => {
      active = false;
    };
  }, [readinessRefreshToken]);

  if (unavailable) {
    return (
      <View style={styles.installationState}>
        <Text style={styles.installationError}>تعذر التحقق من جاهزية العمل الآن.</Text>
        <Button label="تحديث الحالة" onPress={() => setReadinessRefreshToken((value) => value + 1)} />
      </View>
    );
  }

  if (!readiness) {
    return (
      <View style={styles.installationState}>
        <ActivityIndicator accessibilityLabel="جارٍ التحقق من الجاهزية..." />
      </View>
    );
  }

  if (!readiness.ready) {
    return (
      <ReadinessGateScreen
        readiness={readiness}
        onRefresh={() => setReadinessRefreshToken((value) => value + 1)}
      />
    );
  }

  return <>{children}</>;
}

function AppContent({ route, navigation }: { readonly route: DshFieldRouteState; readonly navigation: DshFieldNavigation }) {
  const identity = useIdentitySession();
  useDshMobilePushRegistration(identity.state.kind, "app-field", FIELD_APP_SCHEME);

  const [installationState, setInstallationState] = useState<InstallationState>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    const installationPromise = Platform.OS === "web"
      ? Promise.resolve("field-web")
      : getOrCreateFieldDeviceFingerprint();

    void installationPromise
      .then((installationId) => {
        if (active) setInstallationState({ kind: "ready", installationId });
      })
      .catch(() => {
        if (active) setInstallationState({ kind: "error" });
      });

    return () => {
      active = false;
    };
  }, []);

  const logout = () => {
    void identity.logout();
  };

  if (installationState.kind !== "ready") {
    return (
      <View style={styles.installationState}>
        {installationState.kind === "loading" ? (
          <ActivityIndicator accessibilityLabel="تهيئة هوية تثبيت التطبيق" />
        ) : (
          <Text style={styles.installationError}>
            تعذر تهيئة هوية الجهاز الآمنة. أعد فتح التطبيق قبل تنفيذ أي عمل ميداني.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        <IdentitySessionGate requiredRole="field" requiredSurface="app-field">
          <WorkforceAccessGate
            expectedKind="field"
            onLogout={logout}
            incompleteContent={<DshFieldProfileCompletionScreen onLogout={logout} />}
          >
            <UnifiedReadinessWrapper>
              <DshFieldSurface
                route={route}
                navigation={navigation}
                installationId={installationState.installationId}
              />
            </UnifiedReadinessWrapper>
          </WorkforceAccessGate>
        </IdentitySessionGate>
      </View>
    </View>
  );
}

export default function App({ route, navigation }: { readonly route: DshFieldRouteState; readonly navigation: DshFieldNavigation }) {
  return (
    <WorkforceProfileProvider>
      <AppContent route={route} navigation={navigation} />
    </WorkforceProfileProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceMuted },
  screen: { flex: 1 },
  installationState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colorRoles.surfaceMuted,
  },
  installationError: { textAlign: "center" },
});
