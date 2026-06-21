import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { LoadingState } from "@bthwani/ui-kit";
import { StoreDiscoveryCard } from "./StoreDiscoveryCard";
import { StoreDiscoveryEmptyState } from "./StoreDiscoveryEmptyState";
import { StoreDiscoveryErrorState } from "./StoreDiscoveryErrorState";
import type { DshStoreListState } from "../../shared/store-discovery/store-discovery.states";
import type { DshStoreCardViewModel } from "../../shared/store-discovery/store-discovery.view-model";

export type DiscoveryFilter = "all" | "favorites" | "nearest" | "new";

type Props = Readonly<{
  state: DshStoreListState;
  activeFilter: DiscoveryFilter;
  favoriteIds: ReadonlySet<string>;
  onStorePress: (storeId: string) => void;
  onFavoritePress: (storeId: string) => void;
  onRetry: () => void;
}>;

function applyFilter(
  stores: readonly DshStoreCardViewModel[],
  filter: DiscoveryFilter,
  favoriteIds: ReadonlySet<string>,
): DshStoreCardViewModel[] {
  const base = stores as DshStoreCardViewModel[];
  switch (filter) {
    case "favorites":
      return base.filter((s) => favoriteIds.has(s.id));
    case "new":
      return base.filter((s) => s.isOpen && s.isServiceable);
    case "nearest":
      return [...base].sort((a, b) => a.serviceAreaCode.localeCompare(b.serviceAreaCode));
    default:
      return base;
  }
}

export function StoreDiscoveryList({
  state,
  activeFilter,
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

  const displayed = applyFilter(state.stores, activeFilter, favoriteIds);

  if (displayed.length === 0) {
    return <StoreDiscoveryEmptyState />;
  }

  return (
    <FlatList<DshStoreCardViewModel>
      data={displayed}
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
