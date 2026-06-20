import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { LoadingState } from "@bthwani/ui-kit";
import { StoreDiscoveryCard } from "./StoreDiscoveryCard.js";
import { StoreDiscoveryEmptyState } from "./StoreDiscoveryEmptyState.js";
import { StoreDiscoveryErrorState } from "./StoreDiscoveryErrorState.js";
import type { DshStoreListState } from "../../shared/store-discovery/store-discovery.states.js";
import type { DshStoreCardViewModel } from "../../shared/store-discovery/store-discovery.view-model.js";

type Props = {
  state: DshStoreListState;
  onStorePress: (storeId: string) => void;
  onRetry: () => void;
};

export function StoreDiscoveryList({ state, onStorePress, onRetry }: Props) {
  if (state.kind === "loading") {
    return <LoadingState title="Loading stores…" />;
  }

  if (state.kind === "error") {
    return <StoreDiscoveryErrorState message={state.message} onRetry={onRetry} />;
  }

  if (state.kind === "service_unavailable") {
    return (
      <StoreDiscoveryErrorState
        message="The store service is currently unavailable. Please try again later."
        onRetry={onRetry}
      />
    );
  }

  if (state.kind === "empty") {
    return <StoreDiscoveryEmptyState />;
  }

  return (
    <FlatList<DshStoreCardViewModel>
      data={state.stores as DshStoreCardViewModel[]}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.cardWrapper}>
          <StoreDiscoveryCard store={item} onPress={onStorePress} />
        </View>
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  cardWrapper: { marginBottom: 12 },
});
