import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  alpha,
  colorRoles,
  elevation,
  neutralScale,
  radius,
  spacing,
  statusScale,
} from "@bthwani/ui-kit";
import type { DshStoreCardViewModel } from "../../shared/store";

export type StoreCardPremiumProps = Readonly<{
  store: DshStoreCardViewModel;
  onPress: (storeId: string) => void;
  onFavoritePress?: ((storeId: string) => void) | undefined;
  isFavorite?: boolean | undefined;
}>;

const CARD_HEIGHT = 136;
const MEDIA_WIDTH = 132;
const LOGO_SIZE = 46;
const ACTION_COL_W = 40;

const PLACEHOLDER_COLORS: Record<string, string> = {
  brandAction: colorRoles.brandAction,
  success: statusScale.success,
  info: statusScale.info,
  warning: statusScale.warning,
  default: colorRoles.brandStructure,
};

export function StoreCardPremium({
  store,
  onPress,
  onFavoritePress,
  isFavorite = false,
}: StoreCardPremiumProps) {
  const placeholderBgColor = PLACEHOLDER_COLORS[store.placeholderTone] ?? colorRoles.brandStructure;
  const heroUri = store.heroImageSource?.uri ?? null;
  const logoUri = store.logoImageSource?.uri ?? null;
  const [heroFailed, setHeroFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setHeroFailed(false);
  }, [heroUri]);

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUri]);

  const showHeroImage = heroUri !== null && !heroFailed;
  const showLogoImage = logoUri !== null && !logoFailed;
  const metaLine = useMemo(() => buildMetaLine(store), [store]);
  const chips = useMemo(() => buildMarketingChips(store), [store]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(store.id)}
      accessibilityRole="button"
      accessibilityLabel={store.displayName}
    >
      <View style={styles.actionCol}>
        <StatusChip isOpen={store.isOpen} />
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onFavoritePress?.(store.id);
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
          style={styles.heartBtn}
        >
          <Text style={[styles.heartIcon, isFavorite && styles.heartIconActive]}>
            {isFavorite ? "♥" : "♡"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.storeName} numberOfLines={1}>{store.displayName}</Text>
        <Text style={styles.locationLine} numberOfLines={1}>
          {store.locationLabel}
        </Text>
        {metaLine ? (
          <Text style={styles.metaLine} numberOfLines={1}>{metaLine}</Text>
        ) : null}
        <View style={styles.chipRow}>
          {chips.map((chip) => (
            <View key={chip.label} style={[styles.chip, chip.kind === "strong" && styles.chipStrong]}>
              <Text style={[styles.chipText, chip.kind === "strong" && styles.chipStrongText]} numberOfLines={1}>
                {chip.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.mediaBlock}>
        <View style={[styles.heroWrap, { backgroundColor: placeholderBgColor }]}> 
          {showHeroImage ? (
            <Image
              source={{ uri: heroUri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
              alt=""
              onError={() => setHeroFailed(true)}
            />
          ) : (
            <Text style={styles.heroEmoji}>{store.placeholderEmoji}</Text>
          )}
          <View style={styles.mediaScrim} />
          {store.isPopular ? (
            <View style={styles.popularPill}>
              <Text style={styles.popularText}>رائج</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.logoRing}>
          {showLogoImage ? (
            <Image
              source={{ uri: logoUri }}
              style={styles.logoImg}
              resizeMode="contain"
              alt=""
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <View style={[styles.logoImg, styles.logoFallback]}>
              <Text style={styles.logoEmoji}>{store.placeholderEmoji}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function StatusChip({ isOpen }: { readonly isOpen: boolean }) {
  return (
    <View style={[styles.statusChip, isOpen ? styles.statusOpen : styles.statusClosed]}>
      <Text style={[styles.statusText, isOpen ? styles.statusOpenText : styles.statusClosedText]}>
        {isOpen ? "مفتوح" : "مغلق"}
      </Text>
    </View>
  );
}

function buildMetaLine(store: DshStoreCardViewModel): string {
  const pieces: string[] = [];
  if (store.ratingAverage != null) pieces.push(`★ ${store.ratingAverage.toFixed(1)}`);
  if (store.etaLabel != null) pieces.push(store.etaLabel);
  if (store.distanceLabel != null) pieces.push(store.distanceLabel);
  return pieces.join(" • ");
}

function buildMarketingChips(store: DshStoreCardViewModel): readonly { label: string; kind?: "strong" }[] {
  const chips: { label: string; kind?: "strong" }[] = [];
  if (store.isFreeDelivery) chips.push({ label: "مجاني", kind: "strong" });
  if (store.hasCouponBadge) chips.push({ label: "كوبون", kind: "strong" });
  if (store.pointsMultiplier != null) chips.push({ label: `${store.pointsMultiplier}x نقاط` });
  if (store.hasProBadge) chips.push({ label: "Pro" });

  for (const label of store.deliveryModeLabels) {
    const shortLabel = compactDeliveryMode(label);
    if (shortLabel && !chips.some((chip) => chip.label === shortLabel)) {
      chips.push({ label: shortLabel });
    }
  }

  if (!store.isOpen && store.statusBadge != null) chips.push({ label: store.statusBadge });
  return chips.slice(0, 5);
}

function compactDeliveryMode(label: string): string | null {
  const value = label.replace("⚡", "").trim();
  if (!value) return null;
  if (value.includes("استلام") || value.includes("استلم")) return "استلام";
  if (value.includes("الشريك")) return "توصيل المتجر";
  if (value.includes("ثواني") || value.includes("سريع")) return "سريع";
  if (value.includes("توصيل")) return "توصيل";
  return value.length > 11 ? null : value;
}

const SHADOW = Platform.select({
  ios: { shadowColor: colorRoles.shadowBase, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.09, shadowRadius: 10 },
  android: { elevation: 3 },
  default: {},
});

const LOGO_SHADOW = Platform.select({
  ios: { shadowColor: colorRoles.shadowBase, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 5 },
  android: { elevation: 5 },
  default: {},
});

const styles = StyleSheet.create({
  card: {
    minHeight: CARD_HEIGHT,
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: alpha(colorRoles.brandStructure, 0.08),
    flexDirection: "row",
    overflow: "hidden",
    ...SHADOW,
  },
  cardPressed: {
    opacity: 0.93,
    transform: [{ scale: 0.988 }],
  },
  actionCol: {
    width: ACTION_COL_W,
    paddingVertical: spacing[2],
    paddingLeft: spacing[2],
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusChip: {
    minWidth: 34,
    minHeight: 21,
    borderRadius: radius.round,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  statusOpen: {
    backgroundColor: alpha(statusScale.success, 0.12),
  },
  statusClosed: {
    backgroundColor: alpha(statusScale.danger, 0.1),
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
  },
  statusOpenText: {
    color: statusScale.success,
  },
  statusClosedText: {
    color: statusScale.danger,
  },
  heartBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  heartIcon: {
    fontSize: 20,
    color: colorRoles.borderStrong,
  },
  heartIconActive: {
    color: statusScale.danger,
  },
  content: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 5,
  },
  storeName: {
    width: "100%",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  locationLine: {
    width: "100%",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: colorRoles.textSecondary,
    textAlign: "right",
  },
  metaLine: {
    width: "100%",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    color: colorRoles.brandStructure,
    textAlign: "right",
  },
  chipRow: {
    width: "100%",
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  chip: {
    maxWidth: 92,
    borderRadius: radius.round,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    backgroundColor: colorRoles.surfaceMuted,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
  },
  chipStrong: {
    backgroundColor: alpha(colorRoles.brandAction, 0.1),
    borderColor: alpha(colorRoles.brandAction, 0.18),
  },
  chipText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
    color: colorRoles.textSecondary,
    textAlign: "center",
  },
  chipStrongText: {
    color: colorRoles.brandAction,
  },
  mediaBlock: {
    width: MEDIA_WIDTH,
    minHeight: CARD_HEIGHT,
    position: "relative",
  },
  heroWrap: {
    flex: 1,
    minHeight: CARD_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: alpha(neutralScale[1000], 0.05),
  },
  heroEmoji: {
    fontSize: 32,
  },
  popularPill: {
    position: "absolute",
    top: spacing[2],
    right: spacing[2],
    borderRadius: radius.round,
    backgroundColor: alpha(statusScale.warning, 0.94),
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  popularText: {
    fontSize: 9,
    fontWeight: "900",
    color: neutralScale[0],
  },
  logoRing: {
    position: "absolute",
    right: spacing[2],
    bottom: spacing[2],
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: radius.round,
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 3,
    borderColor: colorRoles.surfaceBase,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...LOGO_SHADOW,
  },
  logoImg: {
    width: "100%",
    height: "100%",
    borderRadius: radius.round,
  },
  logoFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorRoles.surfaceMuted,
  },
  logoEmoji: {
    fontSize: 18,
  },
});
