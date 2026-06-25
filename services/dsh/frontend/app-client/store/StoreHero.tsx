import React from 'react';
import {
  Animated,
  I18nManager,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type DimensionValue,
  type ImageSourcePropType,
} from 'react-native';
import { Svg, Circle, Path } from 'react-native-svg';
import { colorRoles, statusScale } from '@bthwani/ui-kit';

const ORANGE = colorRoles.brandAction;
const NAVY = colorRoles.brandStructure;
const GOLD = '#F59E0B';

function hexToRgba(hex: string, alpha = 0.9): string {
  const clean = (hex || '#ffffff').replace('#', '').trim();
  const short = clean.length === 3;
  const r = parseInt(short ? clean.slice(0, 1).repeat(2) : clean.slice(0, 2), 16);
  const g = parseInt(short ? clean.slice(1, 2).repeat(2) : clean.slice(2, 4), 16);
  const b = parseInt(short ? clean.slice(2, 3).repeat(2) : clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function SearchIcon({ color }: { readonly color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2} />
      <Path d="M16.5 16.5L21 21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CartIcon({ color }: { readonly color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M3 6h18" stroke={color} strokeWidth={2} />
      <Path d="M16 10a4 4 0 01-8 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ShareIcon({ color }: { readonly color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 6l-4-4-4 4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 2v13" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export type StoreHeroFulfillmentMode = {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
};

export type StoreHeroProps = {
  readonly coverImage?: ImageSourcePropType | null | undefined;
  readonly logoImage?: ImageSourcePropType | null | undefined;
  readonly name: string;
  readonly locationLabel?: string | undefined;
  readonly isOpen?: boolean | undefined;
  readonly hasBthwaniPro?: boolean | undefined;
  readonly distanceLabel?: string | undefined;
  readonly deliveryTimeLabel?: string | undefined;
  readonly rating?: number | undefined;
  readonly contactNumber?: string | undefined;
  readonly onSearchPress?: (() => void) | undefined;
  readonly onCartPress?: (() => void) | undefined;
  readonly onSharePress?: (() => void) | undefined;
  readonly onBackPress?: (() => void) | undefined;
  readonly scrollY?: Animated.Value | undefined;
  readonly deliveryModes?: readonly StoreHeroFulfillmentMode[] | undefined;
  readonly selectedMode?: string | undefined;
  readonly onModeChange?: ((id: string) => void) | undefined;
};

export function StoreHero({
  coverImage,
  logoImage,
  name,
  locationLabel,
  isOpen = true,
  hasBthwaniPro = false,
  distanceLabel,
  deliveryTimeLabel,
  rating,
  contactNumber,
  onSearchPress,
  onCartPress,
  onSharePress,
  onBackPress,
  scrollY,
  deliveryModes = [],
  selectedMode,
  onModeChange,
}: StoreHeroProps) {
  const isRTL = I18nManager.isRTL;

  const localScrollY = React.useRef(new Animated.Value(0)).current;
  const activeScrollY = scrollY ?? localScrollY;

  // Light-mode glass action buttons — exactly matching donor lightPremium chrome
  const actionBg = hexToRgba('#FFFFFF', 0.45);
  const actionBorder = hexToRgba('#000000', 0.12);
  const primaryText = NAVY;
  const secondaryText = colorRoles.textSecondary;

  return (
    <View style={styles.heroPremiumWrap}>
      {/* ── Cover area (480 px tall) ── */}
      <View style={styles.heroCoverWrap}>
        {coverImage ? (
          <Animated.Image
            source={coverImage}
            style={[
              styles.heroCoverImage,
              {
                transform: [
                  {
                    scale: activeScrollY.interpolate({
                      inputRange: [-200, 0, 480],
                      outputRange: [1.3, 1, 1.1],
                      extrapolate: 'clamp',
                    }),
                  },
                  {
                    translateY: activeScrollY.interpolate({
                      inputRange: [-200, 0, 480],
                      outputRange: [-60, 0, 80],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          />
        ) : (
          <View style={styles.heroCoverPlaceholder} />
        )}

        {/* Dark overlay rgba(0,0,0,0.3) — donor exact value */}
        <View style={styles.heroCoverOverlay} />

        {/* 120-band feathered fade — donor exact: pow(t,1.5)*0.88 over 160px */}
        <View style={styles.heroCoverFade} pointerEvents="none">
          {Array.from({ length: 120 }, (_, i) => {
            const t = i / 119;
            const alpha = Math.pow(t, 1.5) * 0.88;
            return (
              <View
                key={i}
                style={[
                  styles.heroCoverFadeBand,
                  {
                    top: `${(t * 100).toFixed(2)}%` as DimensionValue,
                    backgroundColor: `rgba(255, 255, 255, ${alpha.toFixed(3)})`,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Floating Top Actions Bar — donor: top:32, left:20, right:20 */}
        <View
          style={[styles.heroTopActions, isRTL && styles.rowReverse]}
          pointerEvents="box-none"
        >
          <View style={styles.heroTopActionsLeft} pointerEvents="box-none">
            {onSearchPress && (
              <TouchableOpacity
                style={styles.heroActionCircle}
                activeOpacity={0.7}
                onPress={onSearchPress}
                hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
              >
                <SearchIcon color={primaryText} />
              </TouchableOpacity>
            )}
            {onCartPress && (
              <TouchableOpacity
                style={styles.heroActionCircle}
                activeOpacity={0.7}
                onPress={onCartPress}
                hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
              >
                <CartIcon color={primaryText} />
              </TouchableOpacity>
            )}
            {onSharePress && (
              <TouchableOpacity
                style={styles.heroActionCircle}
                activeOpacity={0.7}
                onPress={onSharePress}
                hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
              >
                <ShareIcon color={primaryText} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Content block — overlaps cover by 140 px, donor exact */}
      <View style={styles.contentBlock}>
        <View style={styles.heroLuxuryCard}>
          {/* Identity cluster */}
          <View style={[styles.heroLuxuryIdentityRow, isRTL && styles.rowReverse]}>
            <View style={[styles.heroLuxuryInfo, isRTL ? styles.alignEnd : styles.alignStart]}>
              <Text style={[styles.heroNameText, { color: primaryText }]} numberOfLines={1}>
                {name}
              </Text>

              {locationLabel ? (
                <View style={[styles.heroLocationRow, isRTL && styles.rowReverse]}>
                  <Text style={styles.heroLocationPin}>📍</Text>
                  <Text
                    style={[styles.heroLocationText, { color: secondaryText }]}
                    numberOfLines={1}
                  >
                    {locationLabel}
                  </Text>
                </View>
              ) : null}

              <View
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 4,
                  alignSelf: isRTL ? 'flex-end' : 'flex-start',
                }}
              >
                <View
                  style={[
                    styles.heroStatusBadge,
                    isRTL && styles.rowReverse,
                    {
                      backgroundColor: isOpen
                        ? hexToRgba(statusScale.success, 0.12)
                        : hexToRgba(statusScale.danger, 0.12),
                      borderColor: isOpen
                        ? hexToRgba(statusScale.success, 0.25)
                        : hexToRgba(statusScale.danger, 0.25),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.heroStatusDot,
                      { backgroundColor: isOpen ? statusScale.success : statusScale.danger },
                    ]}
                  />
                  <Text
                    style={[
                      styles.heroStatusText,
                      { color: isOpen ? statusScale.success : statusScale.danger },
                    ]}
                  >
                    {isOpen ? 'مفتوح الآن' : 'مغلق الآن'}
                  </Text>
                </View>

                {contactNumber ? (
                  <View
                    style={[
                      styles.heroStatusBadge,
                      isRTL && styles.rowReverse,
                      {
                        backgroundColor: hexToRgba(ORANGE, 0.1),
                        borderColor: hexToRgba(ORANGE, 0.25),
                      },
                    ]}
                  >
                    <Text style={[styles.heroStatusText, { color: ORANGE }]}>
                      📞 {contactNumber}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {logoImage ? (
              <View style={styles.heroLogoWrap}>
                <Animated.Image
                  source={logoImage}
                  style={styles.heroLogoImage}
                  resizeMode="contain"
                />
              </View>
            ) : null}
          </View>

          {/* Metrics chips row */}
          <View style={[styles.heroLuxuryMetricsRow, isRTL && styles.rowReverse]}>
            {hasBthwaniPro ? (
              <View style={[styles.heroFeatureChip, styles.heroBadgePro]}>
                <Text style={styles.heroBadgeText}>برو</Text>
              </View>
            ) : null}
            {distanceLabel ? (
              <View
                style={[
                  styles.heroFeatureChip,
                  isRTL && styles.rowReverse,
                  { backgroundColor: hexToRgba('#000000', 0.04) },
                ]}
              >
                <Text style={[styles.heroFeatureIcon, { color: secondaryText }]}>↗</Text>
                <Text style={[styles.heroFeatureValue, { color: primaryText }]}>{distanceLabel}</Text>
              </View>
            ) : null}
            {deliveryTimeLabel ? (
              <View
                style={[
                  styles.heroFeatureChip,
                  isRTL && styles.rowReverse,
                  { backgroundColor: hexToRgba('#000000', 0.04) },
                ]}
              >
                <Text style={[styles.heroFeatureIcon, { color: secondaryText }]}>⏱</Text>
                <Text style={[styles.heroFeatureValue, { color: primaryText }]}>{deliveryTimeLabel}</Text>
              </View>
            ) : null}
            {rating !== undefined ? (
              <View
                style={[
                  styles.heroFeatureChip,
                  isRTL && styles.rowReverse,
                  { backgroundColor: hexToRgba('#000000', 0.04) },
                ]}
              >
                <Text style={[styles.heroFeatureIcon, { color: GOLD }]}>⭐</Text>
                <Text style={[styles.heroFeatureValue, { color: primaryText }]}>
                  {rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Delivery mode tabs — donor exact: borderRadius:16, padding:4, chip height:40, radius:12 */}
          {deliveryModes.length > 0 ? (
            <View
              style={[
                styles.heroLuxuryDeliveryRow,
                isRTL && styles.rowReverse,
                { backgroundColor: hexToRgba('#000000', 0.04) },
              ]}
            >
              {deliveryModes.map((mode) => {
                const active = selectedMode === mode.id;
                return (
                  <TouchableOpacity
                    key={mode.id}
                    style={[
                      styles.heroLuxuryDeliveryChip,
                      active && {
                        backgroundColor: '#FFFFFF',
                        ...Platform.select({
                          ios: {
                            shadowColor: '#000',
                            shadowOpacity: 0.08,
                            shadowRadius: 4,
                            shadowOffset: { width: 0, height: 2 },
                          },
                          android: { elevation: 2 },
                        }),
                      },
                    ]}
                    onPress={() => onModeChange?.(mode.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.heroLuxuryDeliveryContent, isRTL && styles.rowReverse]}>
                      <Text style={styles.heroLuxuryDeliveryModeIcon}>{mode.icon}</Text>
                      <Text
                        style={[
                          styles.heroLuxuryDeliveryTitle,
                          { color: active ? ORANGE : secondaryText },
                        ]}
                        numberOfLines={1}
                      >
                        {mode.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroPremiumWrap: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },

  // ── Cover ──
  heroCoverWrap: {
    height: 480,
    width: '100%',
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  heroCoverImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroCoverPlaceholder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: NAVY,
  },
  heroCoverOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  heroCoverFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    overflow: 'hidden',
  },
  heroCoverFadeBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
  },

  // ── Floating top actions ──
  heroTopActions: {
    position: 'absolute',
    top: 32,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
  },
  heroTopActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroActionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(10, 47, 92, 0.08)',
    shadowColor: colorRoles.shadowBase || '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  // ── Content block (overlaps cover) ──
  contentBlock: {
    marginTop: -140,
    paddingBottom: 8,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#FFFFFF',
  },
  heroLuxuryCard: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },

  // ── Identity row ──
  heroLuxuryIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroLuxuryInfo: {
    flex: 1,
    gap: 2,
  },
  heroNameText: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Outfit-Bold',
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroLocationPin: {
    fontSize: 13,
    color: ORANGE,
  },
  heroLocationText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Outfit-Medium',
  },
  heroStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  heroStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroStatusText: {
    fontSize: 10.5,
    fontWeight: '900',
    fontFamily: 'Outfit-Bold',
  },

  // ── Logo ──
  heroLogoWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: ORANGE,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 6 },
    }),
  },
  heroLogoImage: {
    width: '100%',
    height: '100%',
  },

  // ── Metrics chips ──
  heroLuxuryMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroFeatureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 6,
    minHeight: 32,
  },
  heroFeatureIcon: {
    fontSize: 12,
  },
  heroFeatureValue: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Outfit-Bold',
  },
  heroBadgePro: {
    backgroundColor: NAVY,
    borderColor: 'transparent',
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'Outfit-Bold',
  },

  // ── Delivery mode tabs ──
  heroLuxuryDeliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 16,
    gap: 4,
  },
  heroLuxuryDeliveryChip: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroLuxuryDeliveryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLuxuryDeliveryModeIcon: {
    fontSize: 14,
  },
  heroLuxuryDeliveryTitle: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Outfit-Bold',
  },

  // ── Shared ──
  rowReverse: { flexDirection: 'row-reverse' },
  alignEnd: { alignItems: 'flex-end' },
  alignStart: { alignItems: 'flex-start' },
});
