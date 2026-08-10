import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colorRoles } from "@bthwani/ui-kit";
import { File as ExpoFile } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { DshPartnerSurface } from "../../../../services/dsh/frontend/app-partner";
import { PartnerFieldRatingGate } from "../../../../services/dsh/frontend/app-partner/ratings/PartnerFieldRatingGate";
import {
  configureCatalogMobileFilePicker,
  type CatalogMobileFileKind,
  type UploadFileSource,
} from "../../../../services/dsh/frontend/shared/catalog";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import {
  configureIdentityDeviceFingerprintProvider,
  configureIdentitySession,
  configureIdentitySessionStorage,
  type SessionStorageAdapter,
  resolveIdentityApiBaseUrl,
  useIdentitySession,
} from "@bthwani/core-identity";
import { IdentitySessionGate } from "../../../../services/dsh/frontend/shared/session/IdentitySessionGate";
import { useDshMobilePushRegistration } from "../../../../services/dsh/frontend/shared/notifications/use-mobile-push-registration";

const PARTNER_DEVICE_FINGERPRINT_KEY = "bthwani.partner.device-fingerprint.v1";

function createSecureStoreSessionStorageAdapter(): SessionStorageAdapter {
  return {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  };
}

async function getOrCreatePartnerDeviceFingerprint(): Promise<string> {
  const existing = await SecureStore.getItemAsync(PARTNER_DEVICE_FINGERPRINT_KEY);
  if (existing?.trim()) return existing;
  const created = `partner-device:${Crypto.randomUUID()}`;
  await SecureStore.setItemAsync(PARTNER_DEVICE_FINGERPRINT_KEY, created);
  return created;
}

async function pickCatalogFile(kind: CatalogMobileFileKind): Promise<UploadFileSource | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: kind === "video" ? "video/mp4" : ["image/jpeg", "image/png", "image/webp"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  const file = new ExpoFile(asset.uri);
  return {
    name: asset.name || file.name,
    type: asset.mimeType?.trim() || file.type,
    size: asset.size ?? file.size,
    body: file,
  };
}

if (Platform.OS !== "web") {
  configureIdentitySessionStorage(createSecureStoreSessionStorageAdapter());
  configureIdentityDeviceFingerprintProvider(getOrCreatePartnerDeviceFingerprint);
  configureCatalogMobileFilePicker(pickCatalogFile);
}
configureIdentitySession(resolveIdentityApiBaseUrl());

function AppContent() {
  const insets = useSafeAreaInsets();
  const identity = useIdentitySession();
  useDshMobilePushRegistration(identity.state.kind, "app-partner", "bthwani-partner-next");

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <View style={styles.screen}>
        <IdentitySessionGate requiredRole="partner" requiredSurface="app-partner">
          <PartnerFieldRatingGate>
            <DshPartnerSurface />
          </PartnerFieldRatingGate>
        </IdentitySessionGate>
      </View>
    </View>
  );
}

export default function App() {
  return <AppContent />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceMuted },
  screen: { flex: 1 },
});
