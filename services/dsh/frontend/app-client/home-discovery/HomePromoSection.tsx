import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  alpha,
  colorRoles,
  elevation,
  neutralScale,
  radius,
  spacing,
  statusScale,
} from '@bthwani/ui-kit';
import type { PromoViewModel } from '../../shared/home-discovery';

type Props = {
  promos: PromoViewModel[];
  onPromoPress?: (promo: PromoViewModel) => void;
  onCategoriesPress?: () => void;
  onVideoPress?: () => void;
};

// Donor measurements (home-screen.styles.ts):
//   categoryIconContainer: 56×56, borderRadius lg2 (→ radius.xl=20), surfaceRaised bg, shadow raised
//   heroPromoCard: flex=1.6, height=74, borderRadius lg, surfaceInset bg, borderWidth 1, shadow raised
//   heroPromoIconContainer: 44×44, borderRadius sm2 (→ radius.sm), warning 0.08 alpha bg
//   heroPromoCtaButton: height=22, borderRadius xs2 (→ radius.xs), paddingH spacing[2], paddingV 3
const ICON_BOX = 56;
const PROMO_H  = 74;

export function HomePromoSection({ promos, onPromoPress, onCategoriesPress, onVideoPress }: Props) {
  const promo = promos[0] ?? null;

  return (
    <View style={styles.container}>
      {/*
        RTL row matching donor's categoriesSelectorRow:
          [LEFT]  فيديو + الفئات (fixedIconsContainer)
          [RIGHT] heroPromoCard (flex: 1.6)
      */}
      <View style={styles.row}>

        {/* fixedIconsContainer: fixed-width pair */}
        <View style={styles.fixedIconsContainer}>
          <QuickBtn label="فيديو" onPress={onVideoPress} isVideo />
          <QuickBtn label="الفئات" onPress={onCategoriesPress} isHub />
        </View>

        {/* heroPromoCard: flex=1.6 */}
        {promo != null && (
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [
              styles.heroPromoCard,
              pressed && styles.heroPromoCardPressed,
            ]}
            onPress={() => onPromoPress?.(promo)}
            accessibilityRole="button"
            accessibilityLabel={promo.title}
          >
            <View style={styles.heroPromoContent}>
              <View style={styles.heroPromoIconContainer}>
                <RibbonIcon />
              </View>
              <View style={styles.heroPromoTextWrap}>
                <Text style={styles.heroPromoTitle} numberOfLines={1}>
                  {promo.title}
                </Text>
                {promo.subtitle ? (
                  <Text style={styles.heroPromoSubtitle} numberOfLines={1}>
                    {promo.subtitle}
                  </Text>
                ) : null}
                <View style={styles.heroPromoCtaButton}>
                  <Text style={styles.heroPromoCtaText}>اشترك الآن</Text>
                </View>
              </View>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Icon components (no react-native-svg dep in services/dsh) ───────────────

function PlayIcon() {
  return <Text style={styles.playGlyph}>▶</Text>;
}

function GridOutlineIcon() {
  return (
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
  );
}

function RibbonIcon() {
  return <Text style={styles.ribbonGlyph}>🎖️</Text>;
}

// ─── Quick-action button (CategorySelectorItem equivalent) ───────────────────

function QuickBtn({
  label,
  onPress,
  isVideo = false,
  isHub = false,
}: {
  label: string;
  onPress?: (() => void) | undefined;
  isVideo?: boolean | undefined;
  isHub?: boolean | undefined;
}) {
  return (
    <Pressable
      style={styles.categorySelectorCard}
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
        {isVideo ? <PlayIcon /> : <GridOutlineIcon />}
      </View>
      <View style={styles.categoryNameContainer}>
        <Text style={styles.categoryName} numberOfLines={1}>{label}</Text>
      </View>
    </Pressable>
  );
}

// ─── Styles — all values from ui-kit tokens ────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[1],
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[1],
  },

  fixedIconsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    flexShrink: 0,
  },

  categorySelectorCard: {
    alignItems: 'center',
    gap: spacing[1],
  },

  // categoryIconContainer: radius.xl (20), surfaceBase bg, elevation.raised shadow
  categoryIconContainer: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: radius.xl,
    backgroundColor: colorRoles.surfaceBase,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colorRoles.borderSubtle,
    ...elevation.raised,
  },
  videoIconContainer: {
    borderWidth: 1,
    borderColor: colorRoles.borderStrong,
  },
  categoryHubIconContainer: {
    borderWidth: 1,
    borderColor: colorRoles.borderStrong,
  },

  categoryNameContainer: {
    alignItems: 'center',
    minHeight: 18,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '700',
    color: colorRoles.textSecondary,
    textAlign: 'center',
  },

  // Play glyph — brand color, matches Ionicons "play" fill
  playGlyph: {
    fontSize: 20,
    color: colorRoles.brandAction,
    lineHeight: 22,
  },

  // Grid outline: 4 outlined cells matching Ionicons "grid-outline"
  gridOutline: {
    gap: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  gridCell: {
    width: 10,
    height: 10,
    borderRadius: radius.xs - 2, // 2px — tight corner for grid cell
    borderWidth: 2,
    borderColor: colorRoles.brandAction,
    backgroundColor: 'transparent',
  },

  ribbonGlyph: {
    fontSize: 26,
  },

  // heroPromoCard: flex=1.6, height=74, radius.lg, surfaceInset bg, elevation.raised
  heroPromoCard: {
    flex: 1.6,
    height: PROMO_H,
    borderRadius: radius.lg,
    backgroundColor: colorRoles.surfaceInset,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    ...elevation.raised,
  },
  heroPromoCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },

  heroPromoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },

  // heroPromoIconContainer: 44×44, radius.sm, warning color at 8% opacity
  heroPromoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: alpha(statusScale.warning, 0.08),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  heroPromoTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 1,
  },
  heroPromoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colorRoles.brandAction,
    textAlign: 'right',
    lineHeight: 18,
  },
  heroPromoSubtitle: {
    fontSize: 9,
    color: colorRoles.textSecondary,
    textAlign: 'right',
    marginBottom: 2,
  },

  // heroPromoCtaButton: height=22, radius.xs, brand bg
  heroPromoCtaButton: {
    backgroundColor: colorRoles.brandAction,
    borderRadius: radius.xs,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPromoCtaText: {
    fontSize: 9,
    fontWeight: '700',
    color: neutralScale[0],
  },
});
