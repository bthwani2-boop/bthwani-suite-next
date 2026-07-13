import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colorRoles } from "@bthwani/ui-kit";
import { DshFieldSurface } from "../../../../services/dsh/frontend/app-field";
import { WorkforceProfileProvider } from "../../../../services/dsh/frontend/shared/workforce/use-workforce-profile";
import {
  configureIdentitySession,
  configureIdentitySessionStorage,
} from "@bthwani/core-identity";
import { createSecureStoreSessionStorageAdapter } from "../../../../services/dsh/frontend/shared/runtime/secure-identity-session-storage";
import { resolveIdentityApiBaseUrl } from "../../../../services/dsh/frontend/shared/_kernel/identity-api-base-url";

if (Platform.OS !== "web") {
  configureIdentitySessionStorage(createSecureStoreSessionStorageAdapter());
}
configureIdentitySession(resolveIdentityApiBaseUrl());

function AppContent() {
  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        <DshFieldSurface />
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
