import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

export default function App() {
  return <AppContent />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceMuted },
  screen: { flex: 1 },
});
