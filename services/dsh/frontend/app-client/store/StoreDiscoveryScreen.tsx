import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Screen, colorRoles } from "@bthwani/ui-kit";
import { StoreDiscoveryList } from "./StoreDiscoveryList";
import {
  useStoreDiscoveryController,
  type DiscoveryFilter,
} from "../../shared/store";

type Props = Readonly<{
  onStorePress?: (storeId: string) => void;
}>;

const FILTERS: ReadonlyArray<{ key: DiscoveryFilter; label: string; icon: string }> = [
  { key: "all", label: "الكل", icon: "◼" },
  { key: "favorites", label: "المفضلة", icon: "♥" },
  { key: "nearest", label: "الأقرب", icon: "📍" },
];

export function StoreDiscoveryScreen({ onStorePress }: Props) {
  const c = useStoreDiscoveryController();

  const handleStorePress = React.useCallback(
    (storeId: string) => { onStorePress?.(storeId); },
    [onStorePress],
  );

  return (
    <Screen padded={false}>
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((f) => {
            const isActive = c.activeFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => c.setActiveFilter(f.key)}
                style={({ pressed }: { pressed: boolean }) => [
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                  pressed && styles.filterChipPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={f.label}
              >
                <Text style={[styles.filterIcon, isActive && styles.filterIconActive]}>
                  {f.icon}
                </Text>
                <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <StoreDiscoveryList
        state={c.visibleState}
        favoriteIds={c.favoriteIds}
        onStorePress={handleStorePress}
        onFavoritePress={c.toggleFavorite}
        onRetry={c.retry}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterWrap: {
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.borderSubtle,
    marginBottom: 4,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row-reverse",
    gap: 8,
  },
  filterChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceBase,
  },
  filterChipActive: {
    backgroundColor: colorRoles.brandAction,
    borderColor: colorRoles.brandAction,
  },
  filterChipPressed: {
    opacity: 0.82,
  },
  filterIcon: {
    fontSize: 12,
    color: colorRoles.textMuted,
  },
  filterIconActive: {
    color: colorRoles.textInverse,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colorRoles.textSecondary,
  },
  filterLabelActive: {
    color: colorRoles.textInverse,
  },
});
