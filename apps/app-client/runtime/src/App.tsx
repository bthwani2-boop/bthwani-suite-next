import React from "react";
import { StyleSheet, View } from "react-native";
import { DshClientSurface } from "../../../../services/dsh/frontend/app-client";

export default function App() {
  return (
    <View style={styles.root}>
      <DshClientSurface />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
