import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colorRoles } from "@bthwani/ui-kit";
import { File as ExpoFile } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import {
  configureCatalogMobileFilePicker,
  DshPartnerSurface,
  IdentitySessionGate,
  PartnerFieldRatingGate,
  useDshMobilePushRegistration,
  type CatalogMobileFileKind,
  type DshPartnerNavigation,
  type DshPartnerNavigationRoute,
  type UploadFileSource,
} from "@bthwani/dsh/app-partner";
import {
  configureIdentityDeviceFingerprintProvider,
  configureIdentitySession,
  configureIdentitySessionStorage,
  type SessionStorageAdapter,
  resolveIdentityApiBaseUrl,
  useIdentitySession,
} from "@bthwani/core-identity";
import { getOrCreatePartnerDeviceFingerprint } from "./config/partner-device-fingerprint";

function createSecureStoreSessionStorageAdapter(): SessionStorageAdapter {
  return {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  };
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
  configureIdentityDeviceFingerprintProvider(() =>
    getOrCreatePartnerDeviceFingerprint(
      {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
      },
      () => Crypto.randomUUID(),
    ),
  );
  configureCatalogMobileFilePicker(pickCatalogFile);
}
configureIdentitySession(resolveIdentityApiBaseUrl());

export type PartnerAppProps = {
  readonly route: DshPartnerNavigationRoute;
  readonly navigation: DshPartnerNavigation;
};

function AppContent({ route, navigation }: PartnerAppProps) {
  const insets = useSafeAreaInsets();
  const identity = useIdentitySession();
  useDshMobilePushRegistration(identity.state.kind, "app-partner", "bthwani-partner-next");

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <View style={styles.screen}>
        <IdentitySessionGate requiredRole="partner" requiredSurface="app-partner">
          <PartnerFieldRatingGate>
            <DshPartnerSurface route={route} navigation={navigation} />
          </PartnerFieldRatingGate>
        </IdentitySessionGate>
      </View>
    </View>
  );
}

export default function App(props: PartnerAppProps) {
  return <AppContent {...props} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceMuted },
  screen: { flex: 1 },
});
