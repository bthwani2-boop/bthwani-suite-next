import { ActivityIndicator, Linking, Platform, StyleSheet, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { colorRoles } from "@bthwani/ui-kit";

import { DshFieldSurface } from "../../../../services/dsh/frontend/app-field";
import type { DshFieldNavigationCommand } from "../../../../services/dsh/frontend/app-field/dsh-field.routes";
import { DshFieldProfileCompletionScreen } from "../../../../services/dsh/frontend/app-field/account/DshFieldProfileCompletionScreen";
import { useDshMobilePushRegistration } from "../../../../services/dsh/frontend/shared/notifications/use-mobile-push-registration";
import {
  WorkforceAccessGate,
  WorkforceProfileProvider,
  useWorkforceProfile,
} from "../../../../services/dsh/frontend/shared/workforce";
import {
  configureIdentityDeviceFingerprintProvider,
  configureIdentitySession,
  configureIdentitySessionStorage,
  type SessionStorageAdapter,
  resolveIdentityApiBaseUrl,
  useIdentitySession,
} from "@bthwani/core-identity";
import { IdentitySessionGate } from "../../../../services/dsh/frontend/shared/session/IdentitySessionGate";
import { fetchWorkforceReadiness } from "../../../../services/dsh/frontend/shared/workforce/workforce-me.api";
import type { ReadinessGate } from "../../../../services/dsh/frontend/shared/workforce/workforce.types";
import { ReadinessGateScreen } from "./features/readiness/ReadinessGateScreen";
import { FIELD_APP_SCHEME, parseFieldDeepLink } from "./navigation/field-deep-link";

const FIELD_DEVICE_FINGERPRINT_KEY = "bthwani.field.device-fingerprint.v1";

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
  const workforce = useWorkforceProfile();
  const [readiness, setReadiness] = useState<ReadinessGate | null>(null);

  const fetchReadiness = async () => {
    if (workforce.state.kind === "ready") {
      try {
        const gate = await fetchWorkforceReadiness(workforce.state.me.actorId);
        setReadiness(gate);
      } catch (err) {
        setReadiness({
          actorId: workforce.state.me.actorId,
          workforceKind: workforce.state.me.workforceKind,
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

  if (!readiness) {
    return (
      <View style={styles.installationState}>
        <ActivityIndicator accessibilityLabel="جارٍ التحقق من الجاهزية..." />
      </View>
    );
  }

  if (readiness.status === "BLOCKED") {
    return <ReadinessGateScreen readiness={readiness} onRefresh={fetchReadiness} />;
  }

  if (readiness.status === "ALLOWED") {
    return <>{children}</>;
  }

  return (
    <View style={styles.installationState}>
      <Text style={styles.installationError}>حالة جاهزية غير معروفة. يرجى المحاولة مرة أخرى.</Text>
    </View>
  );
}

function AppContent() {
  const identity = useIdentitySession();
  useDshMobilePushRegistration(identity.state.kind, "app-field", FIELD_APP_SCHEME);

  const [installationState, setInstallationState] = useState<InstallationState>({ kind: "loading" });
  const [navCommand, setNavCommand] = useState<DshFieldNavigationCommand | undefined>();

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

  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      if (url) {
        const cmd = parseFieldDeepLink(url);
        if (cmd) setNavCommand(cmd);
      }
    });

    const linkSub = Linking.addEventListener("url", ({ url }) => {
      const cmd = parseFieldDeepLink(url);
      if (cmd) setNavCommand(cmd);
    });

    return () => {
      linkSub.remove();
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
                {...(navCommand ? { command: navCommand } : {})}
                installationId={installationState.installationId}
              />
            </UnifiedReadinessWrapper>
          </WorkforceAccessGate>
        </IdentitySessionGate>
      </View>
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
