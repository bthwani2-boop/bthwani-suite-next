import React from "react";
import { StyleSheet, View } from "react-native";
import { colorRoles } from "@bthwani/ui-kit";
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

export default function App() {
  return <AppContent />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceMuted },
  screen: { flex: 1 },
});
