import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
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
  fetchCaptainOperationalReadiness,
  configureDshCaptainLocationStorage,
  useDshMobilePushRegistration,
  type CaptainOperationalReadiness,
  type DshCaptainNavigation,
  type DshCaptainNavigationRoute,
} from "@bthwani/dsh/app-captain";
import { secureRandomId } from "@bthwani/dsh/mobile-capabilities";
import { Button, colorRoles } from "@bthwani/ui-kit";

import { getOrCreateCaptainDeviceFingerprint } from "./config/captain-device-fingerprint";
import { ReadinessGateScreen } from "./features/readiness/ReadinessGateScreen";

const NATIVE_LOCATION_KEY_PREFIX = "bthwani-captain-location-key-v1.";
const NATIVE_LOCATION_INDEX_KEY = "bthwani-captain-location-index-v1";

function encodeNativeLocationKey(value: string): string {
  let encoded = "";
  for (let index = 0; index < value.length; index += 1) {
    encoded += value.charCodeAt(index).toString(16).padStart(4, "0");
  }
  return `${NATIVE_LOCATION_KEY_PREFIX}${encoded}`;
}

function configureNativeCaptainLocationStorage(): void {
  let indexPromise: Promise<Set<string>> | null = null;
  const readIndex = async (): Promise<Set<string>> => {
    if (!indexPromise) {
      indexPromise = SecureStore.getItemAsync(NATIVE_LOCATION_INDEX_KEY).then((raw) => {
        if (!raw) return new Set<string>();
        try {
          const parsed: unknown = JSON.parse(raw);
          return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []);
        } catch {
          throw new Error("NATIVE_LOCATION_STORAGE_INDEX_CORRUPT");
        }
      });
    }
    return indexPromise;
  };
  const writeIndex = async (keys: Set<string>): Promise<void> => {
    await SecureStore.setItemAsync(NATIVE_LOCATION_INDEX_KEY, JSON.stringify([...keys].sort()));
  };
  let mutation = Promise.resolve();
  const withIndexMutation = <T,>(operation: () => Promise<T>): Promise<T> => {
    const next = mutation.then(operation, operation);
    mutation = next.then(() => undefined, () => undefined);
    return next;
  };

  configureDshCaptainLocationStorage({
    getItem: (key) => SecureStore.getItemAsync(encodeNativeLocationKey(key)),
    setItem: (key, value) => withIndexMutation(async () => {
      await SecureStore.setItemAsync(encodeNativeLocationKey(key), value);
      const keys = await readIndex();
      keys.add(key);
      await writeIndex(keys);
    }),
    removeItem: (key) => withIndexMutation(async () => {
      await SecureStore.deleteItemAsync(encodeNativeLocationKey(key));
      const keys = await readIndex();
      keys.delete(key);
      await writeIndex(keys);
    }),
    getAllKeys: async () => [...await readIndex()],
  });
}

if (Platform.OS !== "web") {
  configureNativeCaptainLocationStorage();
  configureIdentitySessionStorage({
    getItem: async (key: string) => SecureStore.getItemAsync(key),
    setItem: async (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: async (key: string) => SecureStore.deleteItemAsync(key),
  });
  configureIdentityDeviceFingerprintProvider(() =>
    getOrCreateCaptainDeviceFingerprint(
      {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
      },
      secureRandomId,
    ),
  );
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

function AppContent({ route, navigation }: { readonly route: DshCaptainNavigationRoute; readonly navigation: DshCaptainNavigation }) {
  const identity = useIdentitySession();

  const logout = () => {
    void identity.logout();
  };

  return (
    <View style={styles.root}>
      <IdentitySessionGate requiredRole="captain" requiredSurface="app-captain">
        <WorkforceAccessGate expectedKind="captain" onLogout={logout}>
          <CaptainSessionEffects />
          <UnifiedReadinessWrapper>
            <DshCaptainSurface route={route} navigation={navigation} />
          </UnifiedReadinessWrapper>
        </WorkforceAccessGate>
      </IdentitySessionGate>
    </View>
  );
}

export default function App({ route, navigation }: { readonly route: DshCaptainNavigationRoute; readonly navigation: DshCaptainNavigation }) {
  return (
    <WorkforceProfileProvider>
      <AppContent route={route} navigation={navigation} />
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
