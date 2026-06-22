import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { LoadingState } from "@bthwani/ui-kit";
import { StoreDiscoveryCard } from "./StoreDiscoveryCard";
import { StoreDiscoveryEmptyState } from "./StoreDiscoveryEmptyState";
import { StoreDiscoveryErrorState } from "./StoreDiscoveryErrorState";
import type { DshStoreListState } from "../../shared/store";
import type { DshStoreCardViewModel } from "../../shared/store";

type Props = Readonly<{
  state: DshStoreListState;
  favoriteIds: ReadonlySet<string>;
  onStorePress: (storeId: string) => void;
  onFavoritePress: (storeId: string) => void;
  onRetry: () => void;
}>;

export function StoreDiscoveryList({
  state,
  favoriteIds,
  onStorePress,
  onFavoritePress,
  onRetry,
}: Props) {
  if (state.kind === "loading") {
    return <LoadingState title="جارٍ تحميل المتاجر…" />;
  }

  if (state.kind === "error") {
    return <StoreDiscoveryErrorState message={state.message} onRetry={onRetry} />;
  }

  if (state.kind === "service_unavailable") {
    return (
      <StoreDiscoveryErrorState
        message="الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً."
        onRetry={onRetry}
      />
    );
  }

  if (state.kind === "empty") {
    return <StoreDiscoveryEmptyState />;
  }

  if (state.stores.length === 0) {
    return <StoreDiscoveryEmptyState />;
  }

  return (
    <FlatList<DshStoreCardViewModel>
      data={state.stores}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.cardWrapper}>
          <StoreDiscoveryCard
            store={item}
            onPress={onStorePress}
            isFavorite={favoriteIds.has(item.id)}
            onFavoritePress={onFavoritePress}
          />
        </View>
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32 },
  cardWrapper: { marginBottom: 14 },
});
