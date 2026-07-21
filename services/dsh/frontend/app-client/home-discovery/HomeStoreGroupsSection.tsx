import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { alpha, colorRoles, radius, spacing } from "@bthwani/ui-kit";
import type { HomeStoreGroupViewModel } from "../../shared/home-discovery";

type Props = Readonly<{
  groups: readonly HomeStoreGroupViewModel[];
  onStorePress?: (storeId: string, slug: string) => void;
}>;

export function HomeStoreGroupsSection({ groups, onStorePress }: Props) {
  if (groups.length === 0) return null;

  return (
    <View style={styles.container}>
      {groups.map((group) => (
        <View key={group.id} style={styles.group}>
          <View style={styles.heading}>
            <Text style={styles.title}>{group.title}</Text>
            <Text style={styles.description}>{group.description}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
          >
            {group.stores.map((store) => (
              <Pressable
                key={`${group.id}:${store.id}`}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => onStorePress?.(store.id, store.slug)}
                accessibilityRole="button"
                accessibilityLabel={`${group.title}: ${store.displayName}`}
              >
                {store.heroImageUrl ? (
                  <Image source={{ uri: store.heroImageUrl }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={styles.placeholder}>
                    <Text style={styles.placeholderText}>🏪</Text>
                  </View>
                )}
                <View style={styles.copy}>
                  <Text numberOfLines={1} style={styles.storeName}>{store.displayName}</Text>
                  <Text numberOfLines={1} style={styles.meta}>
                    {store.categoryLabel || "متجر"} · {store.ratingDisplay === "—" ? "دون تقييم" : `★ ${store.ratingDisplay}`}
                  </Text>
                  <View style={styles.badges}>
                    {store.isFreeDelivery ? <Text style={styles.badge}>توصيل مجاني</Text> : null}
                    {store.hasCouponBadge ? <Text style={styles.badge}>قسيمة</Text> : null}
                    {(store.pointsMultiplier ?? 0) > 1 ? (
                      <Text style={styles.badge}>×{store.pointsMultiplier} نقاط</Text>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[5], paddingVertical: spacing[3] },
  group: { gap: spacing[2] },
  heading: { paddingHorizontal: spacing[4], gap: spacing[1] },
  title: { fontSize: 17, fontWeight: "800", color: colorRoles.textPrimary, textAlign: "right" },
  description: { fontSize: 12, color: colorRoles.textMuted, textAlign: "right" },
  rail: { paddingHorizontal: spacing[4], gap: spacing[3] },
  card: {
    width: 180,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
  },
  cardPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  image: { width: "100%", height: 105, backgroundColor: colorRoles.surfaceMuted },
  placeholder: {
    width: "100%",
    height: 105,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorRoles.brandStructureSoft,
  },
  placeholderText: { fontSize: 30 },
  copy: { padding: spacing[3], gap: spacing[1] },
  storeName: { fontSize: 14, fontWeight: "800", color: colorRoles.textPrimary, textAlign: "right" },
  meta: { fontSize: 11, color: colorRoles.textMuted, textAlign: "right" },
  badges: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[1], marginTop: spacing[1] },
  badge: {
    fontSize: 10,
    fontWeight: "700",
    color: colorRoles.brandAction,
    backgroundColor: alpha(colorRoles.brandAction, 0.08),
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
});
