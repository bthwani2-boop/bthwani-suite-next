import { Linking, Platform, StyleSheet, View } from "react-native";

import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
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
  configureIdentitySession,
  configureIdentitySessionStorage,
  type SessionStorageAdapter,
  useIdentitySession,
} from "@bthwani/core-identity";
import { resolveIdentityApiBaseUrl } from "../../../../services/dsh/frontend/shared/_kernel/identity-api-base-url";
import { IdentitySessionGate } from "../../../../services/dsh/frontend/shared/session/IdentitySessionGate";

function createSecureStoreSessionStorageAdapter(): SessionStorageAdapter {
  return {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  };
}

if (Platform.OS !== "web") {
  configureIdentitySessionStorage(createSecureStoreSessionStorageAdapter());
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
    const afterScheme = schemeSeparator >= 0 ? trimmed.slice(schemeSeparator + 3) : trimmed;
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

function parseNotificationData(data: Record<string, unknown>): DshFieldNavigationCommand | null {
  const route = data.route as string | undefined;
  if (!route) return null;
  return parseDeepLink(
    `bthwani-field-next://${route}?storeId=${encodeURIComponent(String(data.storeId ?? ""))}&visitId=${encodeURIComponent(String(data.visitId ?? ""))}&partnerId=${encodeURIComponent(String(data.partnerId ?? ""))}`,
  );
}

function AppContent() {
  const identity = useIdentitySession();
  useDshMobilePushRegistration(identity.state.kind, "app-field", "bthwani-field-next");

  const [navCommand, setNavCommand] = useState<DshFieldNavigationCommand | undefined>();
  const notifListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Handle legacy route payloads while governed actionUrl payloads are handled
    // by useDshMobilePushRegistration for foreground, background and cold start.
    notifListenerRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const cmd = parseNotificationData(data);
      if (cmd) setNavCommand(cmd);
    });

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
      notifListenerRef.current?.remove();
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
