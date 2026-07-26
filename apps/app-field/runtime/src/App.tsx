import { Linking, Platform, StyleSheet, View } from "react-native";

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
} from "../../../../services/dsh/frontend/shared/workforce";
import {
  configureIdentityDeviceFingerprintProvider,
  configureIdentitySession,
  configureIdentitySessionStorage,
  type SessionStorageAdapter,
  useIdentitySession,
} from "@bthwani/core-identity";
import { resolveIdentityApiBaseUrl } from "../../../../services/dsh/frontend/shared/_kernel/identity-api-base-url";
import { IdentitySessionGate } from "../../../../services/dsh/frontend/shared/session/IdentitySessionGate";

const FIELD_APP_SCHEME = "bthwani-field-next";
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

// URL scheme: bthwani-field-next://route?storeId=X&visitId=Y&partnerId=Z
function decodeQueryValue(value: string): string {
  return decodeURIComponent(value.replaceAll("+", " "));
}

function parseQuery(query: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const separator = pair.indexOf("=");
    const key = decodeQueryValue(separator >= 0 ? pair.slice(0, separator) : pair);
    const value = decodeQueryValue(separator >= 0 ? pair.slice(separator + 1) : "");
    if (key) result[key] = value;
  }
  return result;
}

function parseDeepLink(url: string): DshFieldNavigationCommand | null {
  try {
    const trimmed = url.trim();
    if (!trimmed) return null;

    const schemeSeparator = trimmed.indexOf("://");
    if (schemeSeparator <= 0) return null;
    const scheme = trimmed.slice(0, schemeSeparator).toLowerCase();
    if (scheme !== FIELD_APP_SCHEME) return null;

    const afterScheme = trimmed.slice(schemeSeparator + 3);
    const withoutFragment = afterScheme.split("#", 1)[0] ?? "";
    const querySeparator = withoutFragment.indexOf("?");
    const location = querySeparator >= 0 ? withoutFragment.slice(0, querySeparator) : withoutFragment;
    const query = querySeparator >= 0 ? withoutFragment.slice(querySeparator + 1) : "";
    const path = location.replace(/^\/+|\/+$/g, "").split("/")[0] ?? "";
    const params = parseQuery(query);

    const base: Partial<DshFieldNavigationCommand> = { token: Date.now() };
    if (params.storeId) base.storeId = params.storeId;
    if (params.visitId) base.visitId = params.visitId;
    if (params.partnerId) base.partnerId = params.partnerId;

    const routeMap: Record<string, DshFieldNavigationCommand["target"]> = {
      "work-queue": "work-queue",
      visit: "visit",
      checklist: "checklist",
      verification: "verification",
      escalation: "escalation",
      finance: "finance",
      "partner-progress": "partner-progress",
      products: "products-upload",
    };
    const target = routeMap[path];
    if (!target) return null;
    return { ...base, target } as DshFieldNavigationCommand;
  } catch {
    return null;
  }
}

function AppContent() {
  const identity = useIdentitySession();
  useDshMobilePushRegistration(identity.state.kind, "app-field", FIELD_APP_SCHEME);

  const [navCommand, setNavCommand] = useState<DshFieldNavigationCommand | undefined>();

  useEffect(() => {
    // Governed notification actionUrl payloads are handled by
    // useDshMobilePushRegistration. Only the application URL scheme is accepted here.
    void Linking.getInitialURL().then((url) => {
      if (url) {
        const cmd = parseDeepLink(url);
        if (cmd) setNavCommand(cmd);
      }
    });

    const linkSub = Linking.addEventListener("url", ({ url }) => {
      const cmd = parseDeepLink(url);
      if (cmd) setNavCommand(cmd);
    });

    return () => {
      linkSub.remove();
    };
  }, []);

  const logout = () => {
    void identity.logout();
  };

  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        <IdentitySessionGate requiredRole="field" requiredSurface="app-field">
          <WorkforceAccessGate
            expectedKind="field"
            onLogout={logout}
            incompleteContent={<DshFieldProfileCompletionScreen onLogout={logout} />}
          >
            <DshFieldSurface {...(navCommand ? { command: navCommand } : {})} />
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
});
