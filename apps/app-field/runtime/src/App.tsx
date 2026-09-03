import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { colorRoles } from "@bthwani/ui-kit";
import {
  DshFieldApplication,
  type DshFieldNavigation,
  type DshFieldRouteState,
} from "@bthwani/dsh/app-field";
import { secureRandomId } from "@bthwani/dsh/mobile-capabilities";
import {
  configureIdentityDeviceFingerprintProvider,
  configureIdentitySession,
  configureIdentitySessionStorage,
  type SessionStorageAdapter,
  resolveIdentityApiBaseUrl,
} from "@bthwani/core-identity";

const FIELD_DEVICE_FINGERPRINT_KEY = "bthwani.field.device-fingerprint.v1";
const FIELD_PUSH_SCHEME = "bthwani-field-next";

type InstallationState =
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly installationId: string }
  | { readonly kind: "error" };

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
  const created = `field-device:${secureRandomId()}`;
  await SecureStore.setItemAsync(FIELD_DEVICE_FINGERPRINT_KEY, created);
  return created;
}

if (Platform.OS !== "web") {
  configureIdentitySessionStorage(createSecureStoreSessionStorageAdapter());
  configureIdentityDeviceFingerprintProvider(getOrCreateFieldDeviceFingerprint);
}
configureIdentitySession(resolveIdentityApiBaseUrl());

export default function App({
  route,
  navigation,
}: {
  readonly route: DshFieldRouteState;
  readonly navigation: DshFieldNavigation;
}) {
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
    <DshFieldApplication
      route={route}
      navigation={navigation}
      installationId={installationState.installationId}
      pushScheme={FIELD_PUSH_SCHEME}
    />
  );
}

const styles = StyleSheet.create({
  installationState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colorRoles.surfaceMuted,
  },
  installationError: { textAlign: "center" },
});
