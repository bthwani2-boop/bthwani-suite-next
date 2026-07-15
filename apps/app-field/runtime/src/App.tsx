import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { useEffect, useRef, useState } from "react";
import { colorRoles } from "@bthwani/ui-kit";
import { DshFieldSurface } from "../../../../services/dsh/frontend/app-field";
import type { DshFieldNavigationCommand } from "../../../../services/dsh/frontend/app-field/dsh-field.routes";
import { WorkforceProfileProvider } from "../../../../services/dsh/frontend/shared/workforce/use-workforce-profile";
import {
  configureIdentitySession,
  configureIdentitySessionStorage,
  type SessionStorageAdapter,
} from "@bthwani/core-identity";
import { resolveIdentityApiBaseUrl } from "../../../../services/dsh/frontend/shared/_kernel/identity-api-base-url";

// Only call this from app-field's own tree — expo-secure-store is only
// installed there, not in app-partner/app-client/app-captain.
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

// ─── Deep-link / notification URL → navigation command ───────────────────────
// URL scheme: dsh-field://route?storeId=X&visitId=Y&partnerId=Z
function parseDeepLink(url: string): DshFieldNavigationCommand | null {
  try {
    const parsed = Linking.parse(url);
    const path = parsed.path ?? parsed.scheme ?? "";
    const p = parsed.queryParams ?? {};
    const base: Partial<DshFieldNavigationCommand> = {
      token: Date.now(),
    };
    if (typeof p.storeId === "string") base.storeId = p.storeId;
    if (typeof p.visitId === "string") base.visitId = p.visitId;
    if (typeof p.partnerId === "string") base.partnerId = p.partnerId;
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
  return parseDeepLink(`dsh-field://${route}?storeId=${data.storeId ?? ""}&visitId=${data.visitId ?? ""}&partnerId=${data.partnerId ?? ""}`);
}

function AppContent() {
  const [navCommand, setNavCommand] = useState<DshFieldNavigationCommand | undefined>();
  const notifListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Handle notification taps (foreground + background)
    notifListenerRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const cmd = parseNotificationData(data);
      if (cmd) setNavCommand(cmd);
    });

    // Handle initial deep link (app launched via URL)
    void Linking.getInitialURL().then((url) => {
      if (url) {
        const cmd = parseDeepLink(url);
        if (cmd) setNavCommand(cmd);
      }
    });

    // Handle deep links while app is running
    const linkSub = Linking.addEventListener("url", ({ url }) => {
      const cmd = parseDeepLink(url);
      if (cmd) setNavCommand(cmd);
    });

    return () => {
      notifListenerRef.current?.remove();
      linkSub.remove();
    };
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        <DshFieldSurface {...(navCommand ? { command: navCommand } : {})} />
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <WorkforceProfileProvider>
        <AppContent />
      </WorkforceProfileProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceMuted },
  screen: { flex: 1 },
});

