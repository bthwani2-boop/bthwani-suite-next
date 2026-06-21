import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { brandRoots, colorRoles } from "@bthwani/ui-kit";

export function App() {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Partner App — Coming Soon</Text>
    </View>
  );
}

export default App;

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: brandRoots.surfaceBase },
  text: { fontSize: 16, color: colorRoles.textPrimary },
});
