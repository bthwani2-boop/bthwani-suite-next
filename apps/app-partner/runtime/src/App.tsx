import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { colorRoles } from "@bthwani/ui-kit";
import { DshPartnerSurface } from "../../../../services/dsh/frontend/app-partner";

function AppContent() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <View style={styles.screen}>
        <DshPartnerSurface />
      </View>
    </View>
  );
}

export function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceMuted },
  screen: { flex: 1 },
});

export default App;
