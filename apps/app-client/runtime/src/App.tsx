import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BthwaniUiProvider } from "@bthwani/ui-kit";
import { DshClientSurface } from "../../../../services/dsh/frontend/app-client";

export default function App() {
  return (
    <BthwaniUiProvider>
      <SafeAreaProvider>
        <View style={styles.root}>
          <DshClientSurface />
        </View>
      </SafeAreaProvider>
    </BthwaniUiProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
