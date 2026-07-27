import React from "react";
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import {
  alpha,
  colorRoles,
  elevation,
  neutralScale,
  radius,
  spacing,
  statusScale,
} from "@bthwani/ui-kit";
import { ClientRemoteImage } from "../../../../../apps/app-client/runtime/src/media/ClientRemoteImage";
import type { PromoViewModel } from "../../shared/home-discovery";

type Props = {
  readonly promos: readonly PromoViewModel[];
  readonly onPromoPress?: ((promo: PromoViewModel) => void) | undefined;
  readonly onCategoriesPress?: ((event: GestureResponderEvent) => void) | undefined;
  readonly onVideoPress?: (() => void) | undefined;
};

const ICON_BOX = 56;
const PROMO_H = 74;

function promoActionLabel(promo: PromoViewModel): string {
  switch (promo.actionType) {
    case "store":
      return "فتح المتجر";
    case "category":
      return "عرض الفئة";
    case "external":
      return "معرفة المزيد";
    case "none":
    default:
      return "";
  }
}

export function HomePromoSection({ promos, onPromoPress, onCategoriesPress, onVideoPress }: Props) {
  const promo = promos[0] ?? null;
  const actionLabel = promo ? promoActionLabel(promo) : "";
  const interactive = promo != null
    && actionLabel.length > 0
    && promo.actionTarget.trim().length > 0
    && onPromoPress != null;
  const hasQuickActions = onVideoPress != null || onCategoriesPress != null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {hasQuickActions ? (
          <View style={styles.fixedIconsContainer}>
            {onVideoPress ? <QuickBtn label="فيديو" onPress={onVideoPress} isVideo /> : null}
            {onCategoriesPress ? <QuickBtn label="الفئات" onPress={onCategoriesPress} isHub /> : null}
          </View>
        ) : null}

        {promo != null ? (
          <Pressable
            disabled={!interactive}
            style={({ pressed }) => [
              styles.heroPromoCard,
              pressed && interactive && styles.heroPromoCardPressed,
            ]}
            onPress={() => onPromoPress?.(promo)}
            accessibilityRole={interactive ? "button" : "text"}
            accessibilityLabel={interactive ? `${promo.title}، ${actionLabel}` : promo.title}
            accessibilityState={{ disabled: !interactive }}
          >
            {promo.imageUrl ? (
              <ClientRemoteImage
                uri={promo.imageUrl}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                accessibilityLabel={`صورة عرض ${promo.title}`}
              />
            ) : null}
            {promo.imageUrl ? <View style={styles.promoScrim} /> : null}
            <View style={styles.heroPromoContent}>
              {!promo.imageUrl ? (
                <View style={styles.heroPromoIconContainer}>
                  <Text style={styles.ribbonGlyph}>🎖️</Text>
                </View>
              ) : null}
              <View style={styles.heroPromoTextWrap}>
                {promo.badgeLabel ? (
                  <Text
                    style={[styles.heroPromoBadge, promo.imageUrl && styles.textOnMedia]}
                    numberOfLines={1}
                  >
                    {promo.badgeLabel}
                  </Text>
                ) : null}
                <Text
                  style={[styles.heroPromoTitle, promo.imageUrl && styles.textOnMedia]}
                  numberOfLines={1}
                >
                  {promo.title}
                </Text>
                {promo.subtitle ? (
                  <Text
                    style={[styles.heroPromoSubtitle, promo.imageUrl && styles.textOnMediaMuted]}
                    numberOfLines={1}
                  >
                    {promo.subtitle}
                  </Text>
                ) : null}
                {interactive ? (
                  <View style={styles.heroPromoCtaButton}>
                    <Text style={styles.heroPromoCtaText}>{actionLabel}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Pressable>
        ) : (
          <View style={styles.heroPromoFallback}>
            <Text style={styles.fallbackTitle} numberOfLines={1}>عروض بثواني</Text>
            <Text style={styles.fallbackSubtitle} numberOfLines={1}>ستظهر هنا عند نشرها</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function QuickBtn({
  label,
  onPress,
  isVideo = false,
  isHub = false,
}: {
  readonly label: string;
  readonly onPress: (event: GestureResponderEvent) => void;
  readonly isVideo?: boolean | undefined;
  readonly isHub?: boolean | undefined;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.categorySelectorCard, pressed && styles.quickPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.categoryIconContainer,
          isVideo && styles.videoIconContainer,
          isHub && styles.categoryHubIconContainer,
        ]}
      >
        {isVideo ? (
          <Text style={styles.playGlyph}>▶</Text>
        ) : (
          <View style={styles.gridOutline}>
            <View style={styles.gridRow}>
              <View style={styles.gridCell} />
              <View style={styles.gridCell} />
            </View>
            <View style={styles.gridRow}>
              <View style={styles.gridCell} />
              <View style={styles.gridCell} />
            </View>
          </View>
        )}
      </View>
      <View style={styles.categoryNameContainer}>
        <Text style={styles.categoryName} numberOfLines={1}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[1],
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing[1],
  },
  fixedIconsContainer: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing[2],
    flexShrink: 0,
  },
  categorySelectorCard: {
    alignItems: "center",
    gap: spacing[1],
  },
  quickPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  categoryIconContainer: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: radius.xl,
    backgroundColor: colorRoles.surfaceBase,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: colorRoles.borderSubtle,
    ...elevation.raised,
  },
  videoIconContainer: {
    borderWidth: 1,
    borderColor: alpha(colorRoles.brandAction, 0.32),
    backgroundColor: alpha(statusScale.danger, 0.04),
  },
  categoryHubIconContainer: {
    borderWidth: 1,
    borderColor: alpha(colorRoles.brandAction, 0.32),
    backgroundColor: alpha(colorRoles.brandAction, 0.04),
  },
  categoryNameContainer: {
    alignItems: "center",
    minHeight: 18,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: "800",
    color: colorRoles.textSecondary,
    textAlign: "center",
  },
  playGlyph: {
    fontSize: 20,
    color: colorRoles.brandAction,
    lineHeight: 22,
  },
  gridOutline: {
    gap: 4,
  },
  gridRow: {
    flexDirection: "row",
    gap: 4,
  },
  gridCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: colorRoles.brandAction,
  },
  ribbonGlyph: {
    fontSize: 24,
  },
  heroPromoCard: {
    flex: 1.6,
    height: PROMO_H,
    borderRadius: radius.lg,
    backgroundColor: colorRoles.surfaceInset,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    overflow: "hidden",
    justifyContent: "center",
    paddingHorizontal: spacing[3],
    ...elevation.raised,
  },
  heroPromoCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  promoScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: alpha(colorRoles.shadowBase, 0.5),
  },
  heroPromoContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  heroPromoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: alpha(statusScale.warning, 0.08),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroPromoTextWrap: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 1,
    minWidth: 0,
  },
  heroPromoBadge: {
    fontSize: 9,
    fontWeight: "900",
    color: statusScale.warning,
    textAlign: "right",
  },
  heroPromoTitle: {
    width: "100%",
    fontSize: 13,
    fontWeight: "900",
    color: colorRoles.brandAction,
    textAlign: "right",
    lineHeight: 18,
  },
  heroPromoSubtitle: {
    width: "100%",
    fontSize: 9,
    color: colorRoles.textSecondary,
    textAlign: "right",
    marginBottom: 2,
  },
  textOnMedia: {
    color: neutralScale[0],
  },
  textOnMediaMuted: {
    color: alpha(neutralScale[0], 0.9),
  },
  heroPromoCtaButton: {
    backgroundColor: colorRoles.brandAction,
    borderRadius: radius.xs,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    minHeight: 22,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  heroPromoCtaText: {
    fontSize: 9,
    fontWeight: "800",
    color: neutralScale[0],
  },
  heroPromoFallback: {
    flex: 1.6,
    height: PROMO_H,
    borderRadius: radius.lg,
    backgroundColor: colorRoles.surfaceInset,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: spacing[3],
    ...elevation.raised,
  },
  fallbackTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: colorRoles.brandAction,
    textAlign: "right",
  },
  fallbackSubtitle: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: "700",
    color: colorRoles.textSecondary,
    textAlign: "right",
  },
});
