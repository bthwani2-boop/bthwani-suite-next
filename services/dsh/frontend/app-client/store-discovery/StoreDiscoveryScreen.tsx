import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Screen, colorRoles } from "@bthwani/ui-kit";
import { StoreDiscoveryList, type DiscoveryFilter } from "./StoreDiscoveryList";
import {
  fetchStoreList,
  loadingState,
} from "../../shared/store/store-discovery.api";
import type { DshStoreListState } from "../../shared/store/store-discovery.states";

type Props = Readonly<{
  onStorePress?: (storeId: string) => void;
}>;

const FILTERS: ReadonlyArray<{ key: DiscoveryFilter; label: string; icon: string }> = [
  { key: "all", label: "الكل", icon: "◼" },
  { key: "favorites", label: "المفضلة", icon: "♥" },
  { key: "nearest", label: "الأقرب", icon: "📍" },
];

export function StoreDiscoveryScreen({ onStorePress }: Props) {
  const [state, setState] = useState<DshStoreListState>(loadingState());
  const [activeFilter, setActiveFilter] = useState<DiscoveryFilter>("all");
  const [favoriteIds, setFavoriteIds] = useState<ReadonlySet<string>>(new Set());

  const load = useCallback(async () => {
    setState(loadingState());
    const nextState = await fetchStoreList();
    setState(nextState);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStorePress = useCallback(
    (storeId: string) => {
      onStorePress?.(storeId);
    },
    [onStorePress],
  );

  const handleFavoritePress = useCallback((storeId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }
      return next;
    });
  }, []);

  return (
    <Screen padded={false}>

      {/* ── Filter Rail ── */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={({ pressed }) => [
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

      {/* ── Store Feed ── */}
      <StoreDiscoveryList
        state={state}
        activeFilter={activeFilter}
        favoriteIds={favoriteIds}
        onStorePress={handleStorePress}
        onFavoritePress={handleFavoritePress}
        onRetry={load}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Filter rail
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
