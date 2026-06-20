import React from "react";
import { View, StyleSheet } from "react-native";
import { ErrorState, Button } from "@bthwani/ui-kit";

type Props = {
  message?: string;
  onRetry?: () => void;
};

export function StoreDiscoveryErrorState({ message, onRetry }: Props) {
  return (
    <View style={styles.root}>
      <ErrorState
        title="Could Not Load Stores"
        description={message ?? "An error occurred while loading stores."}
      />
      {onRetry !== undefined && (
        <View style={styles.action}>
          <Button label="Retry" onPress={onRetry} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  action: { marginTop: 12 },
});
