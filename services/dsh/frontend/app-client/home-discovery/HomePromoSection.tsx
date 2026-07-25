import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  alpha,
  colorRoles,
  elevation,
  neutralScale,
  radius,
  spacing,
  statusScale,
} from "@bthwani/ui-kit";
import type { PromoViewModel } from "../../shared/home-discovery";

type Props = {
  readonly promos: readonly PromoViewModel[];
  readonly onPromoPress?: ((promo: PromoViewModel) => void) | undefined;
};

export function HomePromoSection({ promos, onPromoPress }: Props) {
  if (promos.length === 0) return null;

  const primary = promos[0];
  const secondary = promos.slice(1, 3);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>عروض مختارة</Text>
        <Text style={styles.title}>وفرها بثواني</Text>
      </View>

      {primary ? (
        <Pressable
          style={({ pressed }) => [styles.heroPromoCard, pressed && styles.cardPressed]}
          onPress={() => onPromoPress?.(primary)}
          accessibilityRole="button"
          accessibilityLabel={primary.title}
        >
          <View style={styles.heroIconContainer}>
            <Text style={styles.heroIcon}>🎁</Text>
          </View>
          <View style={styles.heroTextWrap}>
            {primary.badgeLabel ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{primary.badgeLabel}</Text>
              </View>
            ) : null}
            <Text style={styles.heroTitle} numberOfLines={1}>{primary.title}</Text>
            {primary.subtitle ? (
              <Text style={styles.heroSubtitle} numberOfLines={1}>{primary.subtitle}</Text>
            ) : null}
          </View>
          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>استفد الآن</Text>
          </View>
        </Pressable>
      ) : null}

      {secondary.length > 0 ? (
        <View style={styles.miniRow}>
          {secondary.map((promo) => (
            <Pressable
              key={promo.id}
              style={({ pressed }) => [styles.miniCard, pressed && styles.cardPressed]}
              onPress={() => onPromoPress?.(promo)}
              accessibilityRole="button"
              accessibilityLabel={promo.title}
            >
              <Text style={styles.miniTitle} numberOfLines={1}>{promo.title}</Text>
              {promo.badgeLabel ? <Text style={styles.miniBadge} numberOfLines={1}>{promo.badgeLabel}</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  headerRow: {
    marginBottom: spacing[2],
    alignItems: "flex-end",
  },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    color: statusScale.warning,
    textAlign: "right",
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  heroPromoCard: {
    minHeight: 82,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: alpha(statusScale.warning, 0.22),
    backgroundColor: colorRoles.surfaceBase,
    padding: spacing[3],
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing[3],
    ...elevation.overlay,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.988 }],
  },
  heroIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: alpha(statusScale.warning, 0.12),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroIcon: {
    fontSize: 25,
  },
  heroTextWrap: {
    flex: 1,
    alignItems: "flex-end",
    minWidth: 0,
  },
  badge: {
    borderRadius: radius.round,
    backgroundColor: alpha(statusScale.warning, 0.15),
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    marginBottom: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: statusScale.warning,
  },
  heroTitle: {
    width: "100%",
    fontSize: 14,
    fontWeight: "900",
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  heroSubtitle: {
    width: "100%",
    marginTop: 1,
    fontSize: 11,
    fontWeight: "700",
    color: colorRoles.textSecondary,
    textAlign: "right",
  },
  ctaButton: {
    height: 30,
    borderRadius: radius.round,
    paddingHorizontal: spacing[3],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorRoles.brandAction,
    flexShrink: 0,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: "900",
    color: neutralScale[0],
  },
  miniRow: {
    flexDirection: "row-reverse",
    gap: spacing[2],
    marginTop: spacing[2],
  },
  miniCard: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceMuted,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    alignItems: "flex-end",
    justifyContent: "center",
  },
  miniTitle: {
    width: "100%",
    fontSize: 12,
    fontWeight: "900",
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  miniBadge: {
    width: "100%",
    marginTop: 1,
    fontSize: 10,
    fontWeight: "800",
    color: colorRoles.brandAction,
    textAlign: "right",
  },
});
