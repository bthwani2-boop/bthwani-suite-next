import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colorRoles, colorPalette, alpha, neutralScale, brandScale, statusScale, spacing, radius } from '@bthwani/ui-kit';
import type { BannerViewModel } from '../../shared/home-discovery';

type Props = {
  banners: BannerViewModel[];
  onBannerPress?: ((banner: BannerViewModel) => void) | undefined;
};

const { width: SCREEN_W } = Dimensions.get('window');
const BANNER_H = 220;
const BANNER_W = SCREEN_W;

export function HomeHeroBannerSection({ banners, onBannerPress }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / BANNER_W);
    setActiveIndex(page);
  };

  if (banners.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={BANNER_W}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {banners.map((banner) => (
          <Pressable
            key={banner.id}
            style={styles.bannerCard}
            onPress={() => onBannerPress?.(banner)}
            accessibilityRole="button"
            accessibilityLabel={banner.title}
          >
            {/* Background image */}
            {banner.imageUrl ? (
              <Image
                source={{ uri: banner.imageUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
                alt=""
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.bannerPlaceholder]} />
            )}

            {/* Dark gradient scrim */}
            <View style={styles.scrim} />

            {/* Badge — top right */}
            {banner.subtitle ? (
              <View style={styles.topBadge}>
                <Text style={styles.topBadgeText}>{banner.subtitle}</Text>
              </View>
            ) : null}

            {/* Bottom content: title + CTA */}
            <View style={styles.bannerBottom}>
              <Text style={styles.bannerTitle} numberOfLines={2}>{banner.title}</Text>
              {banner.actionType !== 'none' ? (
                <Pressable
                  style={styles.ctaButton}
                  onPress={() => onBannerPress?.(banner)}
                  accessibilityRole="button"
                  accessibilityLabel={`اشترك الآن — ${banner.title}`}
                >
                  <Text style={styles.ctaText}>اشترك الآن</Text>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      {banners.length > 1 ? (
        <View style={styles.dots}>
          {banners.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  scrollContent: {
    gap: 0,
  },

  bannerCard: {
    width: BANNER_W,
    height: BANNER_H,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: brandScale.action[600],
  },
  bannerPlaceholder: {
    backgroundColor: brandScale.action[500],
  },

  /* Scrim */
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colorRoles.mediaScrimStrong,
    opacity: 0.45,
  },

  /* Badge — top right */
  topBadge: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    backgroundColor: statusScale.success,
    borderRadius: radius.round,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  topBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: neutralScale[0],
  },

  /* Bottom content */
  bannerBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[4],
    paddingBottom: spacing[4],
    gap: spacing[2],
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: neutralScale[0],
    textAlign: 'right',
    textShadowColor: alpha(colorPalette.black, 0.35),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  /* CTA */
  ctaButton: {
    alignSelf: 'flex-start',
    backgroundColor: colorRoles.brandAction,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '800',
    color: neutralScale[0],
  },

  /* Dots */
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colorRoles.borderStrong,
  },
  dotActive: {
    width: 18,
    backgroundColor: colorRoles.brandAction,
  },
});
