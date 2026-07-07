import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { BthwaniUiProvider, colorRoles } from "@bthwani/ui-kit";
import { DshFieldSurface } from "../../../../services/dsh/frontend/app-field";

function AppContent() {
  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        <DshFieldSurface />
      </View>
    </View>
  );
}

function App() {
  return (
    <BthwaniUiProvider>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </BthwaniUiProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceMuted },
  screen: { flex: 1 },
});

export default App;
