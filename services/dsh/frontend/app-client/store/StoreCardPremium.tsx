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
  neutralScale,
  radius,
  statusScale,
} from "@bthwani/ui-kit";
import type { DshStoreCardViewModel } from "../../shared/store";

export type StoreCardPremiumProps = Readonly<{
  store: DshStoreCardViewModel;
  onPress: (storeId: string) => void;
  onFavoritePress?: ((storeId: string) => void) | undefined;
  isFavorite?: boolean | undefined;
}>;

const CARD_HEIGHT = 118;
const IMAGE_SIZE = CARD_HEIGHT;
const LOGO_SIZE = 52;
const LOCK_BOX = 30;
const LEFT_COL_W = 42;

const PLACEHOLDER_COLORS: Record<string, string> = {
  brandAction: colorRoles.brandAction,
  success: statusScale.success,
  info: statusScale.info,
  warning: statusScale.warning,
  default: colorRoles.brandStructure,
};

type ServiceChip = Readonly<{ label: string; tone: "bthwani" | "partner" | "pickup" | "default" }>;

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
  const serviceModes = useMemo(() => buildServiceModeLabels(store), [store]);
  const marketingChips = useMemo(() => buildMarketingChips(store), [store]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(store.id)}
      accessibilityRole="button"
      accessibilityLabel={store.displayName}
    >
      <View style={styles.leftCol}>
        <View style={[styles.lockBox, store.isOpen ? styles.lockBoxOpen : styles.lockBoxClosed]}>
          <Text style={[styles.lockIcon, store.isOpen ? styles.lockIconOpen : styles.lockIconClosed]}>
            {store.isOpen ? "🔓" : "🔒"}
          </Text>
          <View style={[styles.lockDot, store.isOpen ? styles.dotOpen : styles.dotClosed]} />
        </View>

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
        <Text style={styles.storeName} numberOfLines={1}>
          {store.displayName}
        </Text>

        <Text style={styles.locationText} numberOfLines={1}>
          {store.locationLabel}
        </Text>

        {metaLine ? (
          <Text style={styles.metaLine} numberOfLines={1}>{metaLine}</Text>
        ) : null}

        {serviceModes.length > 0 ? (
          <View style={styles.serviceRow}>
            {serviceModes.map((mode) => (
              <View
                key={mode.label}
                style={[
                  styles.svcItem,
                  mode.tone === "bthwani" && styles.svcBthwani,
                  mode.tone === "partner" && styles.svcPartner,
                  mode.tone === "pickup" && styles.svcPickup,
                ]}
              >
                <Text
                  style={[
                    styles.svcLabel,
                    mode.tone === "bthwani" && styles.svcBthwaniLabel,
                    mode.tone === "partner" && styles.svcPartnerLabel,
                    mode.tone === "pickup" && styles.svcPickupLabel,
                  ]}
                  numberOfLines={1}
                >
                  {mode.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.badgeRow}>
          {marketingChips.map((chip) => (
            <View key={chip.label} style={[styles.badge, chip.tone === "strong" && styles.badgeStrong]}>
              <Text
                style={[styles.badgeText, chip.tone === "strong" && styles.badgeStrongText]}
                numberOfLines={1}
              >
                {chip.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.imgBlock}>
        <View style={[styles.imageSquare, { backgroundColor: placeholderBgColor }]}>
          {showHeroImage ? (
            <Image
              source={{ uri: heroUri }}
              style={StyleSheet.absoluteFill}
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              alt=""
              onError={() => setHeroFailed(true)}
            />
          ) : (
            <Text style={styles.squareEmoji}>{store.placeholderEmoji}</Text>
          )}
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

        {store.ratingAverage != null ? (
          <View style={styles.ratingPill}>
            <Text style={styles.ratingStar}>★</Text>
            <Text style={styles.ratingVal}>{store.ratingAverage.toFixed(1)}</Text>
            {store.followerCountLabel != null ? (
              <>
                <Text style={styles.separator}>•</Text>
                <Text style={styles.followerVal}>{store.followerCountLabel}</Text>
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function buildMetaLine(store: DshStoreCardViewModel): string {
  const pieces: string[] = [];
  if (store.ratingAverage != null) pieces.push(`★ ${store.ratingAverage.toFixed(1)}`);
  if (store.etaLabel != null) pieces.push(store.etaLabel);
  if (store.distanceLabel != null) pieces.push(store.distanceLabel);
  return pieces.join(" · ");
}

function buildServiceModeLabels(store: DshStoreCardViewModel): readonly ServiceChip[] {
  const modes = new Set(store.availableFulfillmentModes);
  const labels: ServiceChip[] = [];

  if (modes.has("bthwani_delivery")) {
    labels.push({ label: "بثواني", tone: "bthwani" });
  }
  if (modes.has("partner_delivery")) {
    labels.push({ label: "توصيل المتجر", tone: "partner" });
  }
  if (modes.has("pickup")) {
    labels.push({ label: "استلام", tone: "pickup" });
  }

  if (labels.length > 0) return labels.slice(0, 3);

  return store.deliveryModeLabels
    .map(compactDeliveryMode)
    .filter((mode): mode is ServiceChip => mode !== null)
    .slice(0, 3);
}

function buildMarketingChips(store: DshStoreCardViewModel): readonly { label: string; tone?: "strong" }[] {
  const chips: { label: string; tone?: "strong" }[] = [];
  if (store.isFreeDelivery) chips.push({ label: "مجاني", tone: "strong" });
  if (store.hasCouponBadge) chips.push({ label: "كوبون", tone: "strong" });
  if (store.pointsMultiplier != null) chips.push({ label: `${store.pointsMultiplier}x نقاط` });
  if (store.hasProBadge) chips.push({ label: "Pro" });
  if (store.isPopular) chips.push({ label: "رائج", tone: "strong" });
  if (!store.isOpen && store.statusBadge != null) chips.push({ label: store.statusBadge });
  return chips.slice(0, 4);
}

function compactDeliveryMode(label: string): ServiceChip | null {
  const value = label.replace("⚡", "").trim();
  if (!value) return null;
  if (value.includes("ثواني") || value.includes("سريع")) {
    return { label: "بثواني", tone: "bthwani" };
  }
  if (value.includes("الشريك")) {
    return { label: "توصيل المتجر", tone: "partner" };
  }
  if (value.includes("استلام") || value.includes("استلم")) {
    return { label: "استلام", tone: "pickup" };
  }
  if (value.includes("توصيل")) {
    return { label: "توصيل", tone: "default" };
  }
  return value.length > 12 ? null : { label: value, tone: "default" };
}

const SHADOW = Platform.select({
  ios: { shadowColor: colorRoles.shadowBase, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
  android: { elevation: 3 },
  default: {},
});

const LOCK_SHADOW = Platform.select({
  ios: { shadowColor: colorRoles.shadowBase, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  android: { elevation: 2 },
  default: {},
});

const LOGO_SHADOW = Platform.select({
  ios: { shadowColor: colorRoles.shadowBase, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 5 },
  android: { elevation: 5 },
  default: {},
});

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    flexDirection: "row",
    overflow: "hidden",
    ...SHADOW,
  },
  cardPressed: {
    opacity: 0.91,
    transform: [{ scale: 0.984 }],
  },
  leftCol: {
    width: LEFT_COL_W,
    height: CARD_HEIGHT,
    paddingVertical: 10,
    paddingLeft: 10,
    justifyContent: "space-between",
    alignItems: "center",
  },
  lockBox: {
    width: LOCK_BOX,
    height: LOCK_BOX,
    borderRadius: 8,
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...LOCK_SHADOW,
  },
  lockBoxOpen: { borderColor: alpha(statusScale.success, 0.28) },
  lockBoxClosed: { borderColor: colorRoles.borderSubtle },
  lockIcon: { fontSize: 15 },
  lockIconOpen: { opacity: 1 },
  lockIconClosed: { opacity: 0.5 },
  lockDot: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colorRoles.surfaceBase,
  },
  dotOpen: { backgroundColor: statusScale.success },
  dotClosed: { backgroundColor: statusScale.danger },
  heartBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  heartIcon: {
    fontSize: 19,
    color: colorRoles.borderStrong,
  },
  heartIconActive: { color: statusScale.danger },
  content: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
    paddingVertical: 8,
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  storeName: {
    width: "100%",
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900",
    color: colorRoles.brandStructure,
    textAlign: "right",
  },
  locationText: {
    width: "100%",
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "700",
    color: colorRoles.textMuted,
    textAlign: "right",
  },
  metaLine: {
    width: "100%",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    color: colorRoles.brandStructure,
    textAlign: "right",
  },
  serviceRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 5,
    width: "100%",
  },
  svcItem: {
    maxWidth: 78,
    borderRadius: radius.round,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: alpha(colorRoles.brandStructure, 0.06),
    borderWidth: 1,
    borderColor: alpha(colorRoles.brandStructure, 0.08),
  },
  svcBthwani: {
    backgroundColor: alpha(colorRoles.brandAction, 0.1),
    borderColor: alpha(colorRoles.brandAction, 0.2),
  },
  svcPartner: {
    backgroundColor: alpha(statusScale.info, 0.09),
    borderColor: alpha(statusScale.info, 0.2),
  },
  svcPickup: {
    backgroundColor: alpha(statusScale.success, 0.09),
    borderColor: alpha(statusScale.success, 0.2),
  },
  svcLabel: {
    fontSize: 9.5,
    lineHeight: 12,
    color: colorRoles.textSecondary,
    fontWeight: "800",
    textAlign: "center",
  },
  svcBthwaniLabel: { color: colorRoles.brandAction },
  svcPartnerLabel: { color: statusScale.info },
  svcPickupLabel: { color: statusScale.success },
  badgeRow: {
    flexDirection: "row-reverse",
    gap: 4,
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
    flexWrap: "nowrap",
    overflow: "hidden",
  },
  badge: {
    maxWidth: 62,
    backgroundColor: colorRoles.surfaceMuted,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeStrong: {
    backgroundColor: alpha(colorRoles.brandAction, 0.08),
    borderColor: alpha(colorRoles.brandAction, 0.22),
  },
  badgeText: {
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: "800",
    color: colorRoles.textSecondary,
    textAlign: "center",
  },
  badgeStrongText: { color: colorRoles.brandAction },
  imgBlock: {
    width: IMAGE_SIZE,
    height: CARD_HEIGHT,
    position: "relative",
    flexShrink: 0,
  },
  imageSquare: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  squareEmoji: { fontSize: 32 },
  logoRing: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 999,
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
    borderRadius: 999,
  },
  logoFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorRoles.surfaceMuted,
  },
  logoEmoji: { fontSize: 18 },
  ratingPill: {
    position: "absolute",
    left: 6,
    bottom: 6,
    minHeight: 19,
    borderRadius: 999,
    backgroundColor: alpha(neutralScale[950], 0.78),
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingStar: { fontSize: 9, color: statusScale.warning, fontWeight: "900" },
  ratingVal: { fontSize: 9, color: neutralScale[0], fontWeight: "900" },
  separator: { fontSize: 8, color: alpha(neutralScale[0], 0.72), fontWeight: "900" },
  followerVal: { fontSize: 8.5, color: neutralScale[0], fontWeight: "800" },
});
