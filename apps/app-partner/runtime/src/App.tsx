import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { File as ExpoFile } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as SecureStore from "expo-secure-store";
import {
  configureCatalogMobileFilePicker,
  DshPartnerApplication,
  type CatalogMobileFileKind,
  type DshPartnerNavigation,
  type DshPartnerNavigationRoute,
  type UploadFileSource,
} from "@bthwani/dsh/app-partner";
import { secureRandomId } from "@bthwani/dsh/mobile-capabilities";
import {
  configureIdentityDeviceFingerprintProvider,
  configureIdentitySession,
  configureIdentitySessionStorage,
  type SessionStorageAdapter,
  resolveIdentityApiBaseUrl,
} from "@bthwani/core-identity";
import { getOrCreatePartnerDeviceFingerprint } from "./config/partner-device-fingerprint";
import { usePartnerAppearance } from "./appearance";

const PARTNER_PUSH_SCHEME = "bthwani-partner-next";

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
      secureRandomId,
    ),
  );
  configureCatalogMobileFilePicker(pickCatalogFile);
}
configureIdentitySession(resolveIdentityApiBaseUrl());

export type PartnerAppProps = {
  readonly route: DshPartnerNavigationRoute;
  readonly navigation: DshPartnerNavigation;
};

export default function App(props: PartnerAppProps) {
  const insets = useSafeAreaInsets();
  const appearance = usePartnerAppearance();

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <DshPartnerApplication
        {...props}
        appearance={appearance}
        pushScheme={PARTNER_PUSH_SCHEME}
      />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
