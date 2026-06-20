import React from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { Card, Text, Badge, brandScale } from "@bthwani/ui-kit";
import type { DshStoreCardViewModel } from "../../shared/store-discovery/store-discovery.view-model.js";

type Props = {
  store: DshStoreCardViewModel;
  onPress: (storeId: string) => void;
};

export function StoreDiscoveryCard({ store, onPress }: Props) {
  return (
    <Card interactive onPress={() => onPress(store.id)}>
      <TouchableOpacity
        onPress={() => onPress(store.id)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={store.displayName}
      >
        {store.heroImageUrl !== null ? (
          <Image
            source={{ uri: store.heroImageUrl }}
            style={styles.hero}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.heroPlaceholder} />
        )}
        <View style={styles.body}>
          <View style={styles.row}>
            <Text role="label" numberOfLines={1}>
              {store.displayName}
            </Text>
            {store.ratingLabel !== null && (
              <Badge tone="success" label={store.ratingLabel} />
            )}
          </View>
          <Text role="caption" tone="muted">
            {store.cityCode.toUpperCase()} · {store.serviceAreaCode}
          </Text>
          {store.etaLabel !== null && (
            <Text role="caption" tone="secondary">
              {store.etaLabel}
            </Text>
          )}
          {store.statusBadge !== null && (
            <Badge
              tone={store.isOpen ? "warning" : "danger"}
              label={store.statusBadge}
            />
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  heroPlaceholder: {
    width: "100%",
    height: 140,
    backgroundColor: brandScale.surface[200],
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  body: { padding: 12, gap: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
});
