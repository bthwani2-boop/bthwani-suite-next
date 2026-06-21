import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { brandScale, colorRoles, statusScale } from "../../tokens/colors";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StoreCardPremiumItem = Readonly<{
  id: string;
  displayName: string;
  cityCode: string;
  serviceAreaCode: string;
  locationLabel: string;
  isOpen: boolean;
  isServiceable: boolean;
  ratingLabel: string | null;
  ratingAverage: number | null;
  etaLabel: string | null;
  heroImageSource: { uri: string } | null;
  logoImageSource: { uri: string } | null;
  statusBadge: string | null;
  isFreeDelivery: boolean;
  placeholderEmoji: string;
  placeholderColor: string;
  deliveryModeLabels: readonly string[];
  distanceLabel: string | null;
  followerCountLabel: string | null;
  hasProBadge: boolean;
  hasCouponBadge: boolean;
  pointsMultiplier: number | null;
  isPopular: boolean;
}>;

export type StoreCardPremiumProps = Readonly<{
  store: StoreCardPremiumItem;
  onPress: (storeId: string) => void;
  onFavoritePress?: ((storeId: string) => void) | undefined;
  isFavorite?: boolean | undefined;
}>;

// ─── Layout constants ──────────────────────────────────────────────────────────
// Donor: IMAGE_SIZE = card height = 114px. Circle = card height, clips right.

const CARD_HEIGHT  = 118;
const IMAGE_SIZE   = CARD_HEIGHT;     // square image size
const LOGO_SIZE    = 46;
const LOCK_BOX     = 30;
const LEFT_COL_W   = 42;

const SVC_ICON: Record<string, string> = {
  توصيل : "🛵",
  استلام: "🏃",
  استلم : "🏃",
  ثواني : "⚡",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function StoreCardPremium({
  store,
  onPress,
  onFavoritePress,
  isFavorite = false,
}: StoreCardPremiumProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(store.id)}
      accessibilityRole="button"
      accessibilityLabel={store.displayName}
    >

      {/* ══ COL 1 — Lock (top) + Heart (bottom) ══ */}
      <View style={styles.leftCol}>

        {/* Lock box — white chip with green padlock + status dot */}
        <View style={[styles.lockBox, store.isOpen ? styles.lockBoxOpen : styles.lockBoxClosed]}>
          <Text style={[styles.lockIcon, store.isOpen ? styles.lockIconOpen : styles.lockIconClosed]}>
            {store.isOpen ? "🔓" : "🔒"}
          </Text>
          <View style={[styles.lockDot, store.isOpen ? styles.dotOpen : styles.dotClosed]} />
        </View>

        {/* Favourite heart — solid when active */}
        <Pressable
          onPress={() => onFavoritePress?.(store.id)}
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

      {/* ══ COL 2 — Main content ══ */}
      <View style={styles.content}>

        {/* Store name */}
        <Text style={styles.storeName} numberOfLines={1}>
          {store.displayName}
        </Text>

        {/* Location + distance */}
        <View style={styles.inlineRow}>
          <Text style={styles.metaText} numberOfLines={1}>
            {"📍 "}{store.locationLabel}
          </Text>
          {store.distanceLabel != null && (
            <Text style={styles.distText}>
              {"↗ "}{store.distanceLabel}
            </Text>
          )}
        </View>

        {/* ETA */}
        {store.etaLabel != null && (
          <Text style={styles.metaText}>{"⏱ "}{store.etaLabel}</Text>
        )}

        {/* Service modes */}
        {store.deliveryModeLabels.length > 0 && (
          <View style={styles.serviceRow}>
            {store.deliveryModeLabels.map((label) => {
              const clean = label.replace("⚡ ", "");
              return (
                <View key={label} style={styles.svcItem}>
                  <Text style={styles.svcIcon}>{SVC_ICON[clean] ?? "•"}</Text>
                  <Text style={styles.svcLabel}>{clean}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Closed status */}
        {!store.isOpen && store.statusBadge != null && (
          <View style={styles.closedTag}>
            <Text style={styles.closedTagTxt}>{store.statusBadge}</Text>
          </View>
        )}

        {/* Promo badges */}
        <View style={styles.badgeRow}>
          {store.hasProBadge && (
            <View style={styles.badgePro}>
              <Text style={styles.badgeProTxt}>برو</Text>
            </View>
          )}
          {store.isFreeDelivery && (
            <View style={styles.badgeFree}>
              <Text style={styles.badgeFreeTxt}>مجاني</Text>
            </View>
          )}
          {store.hasCouponBadge && (
            <View style={styles.badgeCoupon}>
              <Text style={styles.badgeCouponTxt}>كوبون</Text>
            </View>
          )}
          {store.pointsMultiplier != null && (
            <View style={styles.badgePoints}>
              <Text style={styles.badgePointsTxt}>
                {"نقاط "}{store.pointsMultiplier}{"x"}
              </Text>
            </View>
          )}
          {store.isPopular && (
            <View style={styles.badgePopular}>
              <Text style={styles.badgePopularTxt}>{"🔥 رائج"}</Text>
            </View>
          )}
        </View>

      </View>

      {/* ══ COL 3 — Square image ══ */}
      <View style={styles.imgBlock}>

        {/* Main square image */}
        <View style={[styles.imageSquare, { backgroundColor: store.placeholderColor }]}>
          {store.heroImageSource != null ? (
            <Image
              source={store.heroImageSource}
              style={StyleSheet.absoluteFill}
              accessibilityIgnoresInvertColors
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.squareEmoji}>{store.placeholderEmoji}</Text>
          )}
        </View>

        {/* Store logo — bottom-right corner of image block, white ring border */}
        <View style={styles.logoRing}>
          {store.logoImageSource != null ? (
            <Image
              source={store.logoImageSource}
              style={styles.logoImg}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.logoImg, styles.logoFallback]}>
              <Text style={styles.logoEmoji}>{store.placeholderEmoji}</Text>
            </View>
          )}
        </View>

        {/* Rating + followers pill — bottom-left of image block */}
        {store.ratingAverage != null && (
          <View style={styles.ratingPill}>
            <Text style={styles.ratingStar}>{"★"}</Text>
            <Text style={styles.ratingVal}>{store.ratingAverage.toFixed(1)}</Text>
            {store.followerCountLabel != null && (
              <>
                <Text style={styles.followerIco}>{"👥"}</Text>
                <Text style={styles.followerVal}>{store.followerCountLabel}</Text>
              </>
            )}
          </View>
        )}

      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SHADOW = Platform.select({
  ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
  android: { elevation: 3 },
  default: {},
});

const LOCK_SHADOW = Platform.select({
  ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  android: { elevation: 2 },
  default: {},
});

const LOGO_SHADOW = Platform.select({
  ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 5 },
  android: { elevation: 5 },
  default: {},
});

const styles = StyleSheet.create({

  /* ── Card shell ── */
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

  /* ── Col 1: Left icons ── */
  leftCol: {
    width: LEFT_COL_W,
    height: CARD_HEIGHT,
    paddingVertical: 10,
    paddingLeft: 10,
    justifyContent: "space-between",
    alignItems: "center",
  },

  /* Lock box */
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
  lockBoxOpen:   { borderColor: statusScale.success + "44" },
  lockBoxClosed: { borderColor: colorRoles.borderSubtle },
  lockIcon:      { fontSize: 15 },
  lockIconOpen:  { opacity: 1 },
  lockIconClosed:{ opacity: 0.5 },
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
  dotOpen:   { backgroundColor: statusScale.success },
  dotClosed: { backgroundColor: statusScale.danger },

  /* Heart button */
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
  heartIconActive: {
    color: "#EF4444",
  },

  /* ── Col 2: Content ── */
  content: {
    flex: 1,
    paddingRight: 10,
    paddingVertical: 9,
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  storeName: {
    fontSize: 15,
    fontWeight: "800",
    color: colorRoles.brandStructure,
    textAlign: "right",
    width: "100%",
  },

  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
    width: "100%",
  },
  metaText: {
    fontSize: 11,
    color: colorRoles.textMuted,
    textAlign: "right",
    flex: 1,
  },
  distText: {
    fontSize: 11,
    color: colorRoles.textMuted,
    fontWeight: "600",
    flexShrink: 0,
  },

  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    width: "100%",
  },
  svcItem: { flexDirection: "row", alignItems: "center", gap: 2 },
  svcIcon:  { fontSize: 11 },
  svcLabel: { fontSize: 11, color: colorRoles.textSecondary, fontWeight: "500" },

  closedTag: {
    alignSelf: "flex-end",
    backgroundColor: statusScale.dangerSoft,
    borderWidth: 1,
    borderColor: statusScale.danger,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  closedTagTxt: { fontSize: 10, fontWeight: "600", color: statusScale.danger },

  badgeRow: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "flex-end",
    width: "100%",
    flexWrap: "nowrap",
  },

  /* Promo badges */
  badgePro: {
    backgroundColor: colorRoles.brandAction,
    borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2,
  },
  badgeProTxt: { fontSize: 10, fontWeight: "700", color: "#fff" },

  badgeFree: {
    backgroundColor: statusScale.successSoft,
    borderWidth: 1, borderColor: statusScale.success,
    borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2,
  },
  badgeFreeTxt: { fontSize: 10, fontWeight: "700", color: statusScale.success },

  badgeCoupon: {
    backgroundColor: "#FFF3ED",
    borderWidth: 1, borderColor: colorRoles.brandAction,
    borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2,
  },
  badgeCouponTxt: { fontSize: 10, fontWeight: "600", color: colorRoles.brandAction },

  badgePoints: {
    backgroundColor: brandScale.structure[50],
    borderWidth: 1, borderColor: brandScale.structure[200],
    borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2,
  },
  badgePointsTxt: { fontSize: 10, fontWeight: "600", color: colorRoles.brandStructure },

  badgePopular: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1, borderColor: "#F97316",
    borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2,
  },
  badgePopularTxt: { fontSize: 10, fontWeight: "600", color: "#C2410C" },

  /* ── Col 3: Image block ── */
  imgBlock: {
    width: IMAGE_SIZE,
    height: CARD_HEIGHT,
    position: "relative",
  },

  /* Main square image */
  imageSquare: {
    position: "absolute",
    top: 0,
    left: 0,
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  squareEmoji: { fontSize: 40 },

  /* Logo ring — bottom-right corner of imageBlock, over the circle */
  logoRing: {
    position: "absolute",
    bottom: 8,
    right: 4,
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    borderWidth: 3,
    borderColor: colorRoles.surfaceBase,
    backgroundColor: colorRoles.surfaceBase,
    overflow: "hidden",
    ...LOGO_SHADOW,
  },
  logoImg: {
    width: "100%",
    height: "100%",
  },
  logoFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandScale.surface[100],
  },
  logoEmoji: { fontSize: 18 },

  /* Rating pill — bottom-left of imageBlock */
  ratingPill: {
    position: "absolute",
    bottom: 8,
    left: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(10,47,92,0.82)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  ratingStar:   { fontSize: 10, color: "#F59E0B" },
  ratingVal:    { fontSize: 11, fontWeight: "700", color: "#fff" },
  followerIco:  { fontSize: 9 },
  followerVal:  { fontSize: 10, color: "rgba(255,255,255,0.85)" },
});
