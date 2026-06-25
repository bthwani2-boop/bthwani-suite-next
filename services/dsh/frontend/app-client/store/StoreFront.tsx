import React, { memo, useRef, useState } from "react";
import { Animated, Dimensions, Image, Pressable, Text, View } from "react-native";
import { colorRoles, neutralScale } from "@bthwani/ui-kit";

// ─── 1. HERO COVER ───
export type HeroCoverProps = {
  readonly coverImage?: { uri: string } | number | null;
};

export function HeroCover({ coverImage }: HeroCoverProps) {
  return (
    <View style={styles.heroCoverContainer}>
      {coverImage ? (
        <Image source={coverImage as any} style={styles.heroCoverImage} />
      ) : (
        <View style={styles.heroCoverPlaceholder} />
      )}
      <View style={styles.heroCoverOverlay} />
      <View style={styles.heroCoverFadeContainer} pointerEvents="none">
        {Array.from({ length: 80 }, (_, i) => {
          const t = i / 79;
          const alpha = Math.pow(t, 1.5) * 0.88;
          const bg = `rgba(255, 252, 248, ${alpha.toFixed(3)})`;
          return (
            <View
              key={i}
              style={[
                styles.heroCoverFadeBand,
                { top: `${(t * 100).toFixed(2)}%` as any, backgroundColor: bg },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── 2. SERVICE MODE SEGMENT ───
export type ServiceModeOption = {
  readonly id: string;
  readonly label: string;
  readonly icon?: React.ReactNode;
};

export type ServiceModeSegmentProps = {
  readonly options: readonly ServiceModeOption[];
  readonly selectedId?: string;
  readonly onChange?: (id: string) => void;
};

export function ServiceModeSegment({ options, selectedId, onChange }: ServiceModeSegmentProps) {
  return (
    <View style={styles.segmentContainer}>
      {options.map((opt) => {
        const isActive = opt.id === selectedId;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange?.(opt.id)}
            style={[styles.segmentChip, isActive && styles.segmentChipActive]}
          >
            <View style={styles.segmentContent}>
              {opt.icon ? opt.icon : null}
              <Text
                style={[
                  styles.segmentText,
                  { color: isActive ? colorRoles.brandAction : colorRoles.textSecondary },
                ]}
              >
                {opt.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── 3. BANNER CAROUSEL ───
export type BannerCarouselItem = {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly badge?: string;
  readonly image?: { uri: string } | number | null;
  readonly cta?: string;
  readonly accentColor?: string;
  readonly onPress?: () => void;
};

export type BannerCarouselProps = {
  readonly banners: readonly BannerCarouselItem[];
  readonly variant?: "main" | "secondary";
  readonly itemWidth?: number;
  readonly itemGap?: number;
};

export const BannerCarousel = memo(function BannerCarousel({
  banners,
  variant = "main",
  itemWidth,
  itemGap,
}: BannerCarouselProps) {
  const { width: windowWidth } = Dimensions.get("window");
  const isSecondary = variant === "secondary";
  const count = banners.length;

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const finalItemWidth = itemWidth ?? (isSecondary ? Math.round(windowWidth * 0.62) : 260);
  const finalItemGap = itemGap ?? 12;
  const snapInterval = finalItemWidth + finalItemGap;
  const sidePadding = isSecondary ? (windowWidth - finalItemWidth) / 2 : 16;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / snapInterval);
        if (index >= 0 && index < count && index !== activeIndex) {
          setActiveIndex(index);
        }
      },
    }
  );

  if (count === 0) return null;

  return (
    <View style={{ width: "100%", alignItems: "stretch", overflow: "hidden" }}>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        decelerationRate={isSecondary ? "normal" : "fast"}
        bounces={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        contentContainerStyle={{
          paddingHorizontal: sidePadding,
          paddingVertical: 8,
          flexDirection: "row",
        }}
      >
        {banners.map((item, index) => {
          const cardBackground = item.image
            ? "transparent"
            : (item.accentColor ?? colorRoles.brandAction);

          const scale = scrollX.interpolate({
            inputRange: [
              (index - 1) * snapInterval,
              index * snapInterval,
              (index + 1) * snapInterval,
            ],
            outputRange: [0.94, 1, 0.94],
            extrapolate: "clamp",
          });

          const opacity = scrollX.interpolate({
            inputRange: [
              (index - 1) * snapInterval,
              index * snapInterval,
              (index + 1) * snapInterval,
            ],
            outputRange: [0.78, 1, 0.78],
            extrapolate: "clamp",
          });

          return (
            <Animated.View
              key={item.id}
              style={[
                styles.carouselCard,
                {
                  width: finalItemWidth,
                  backgroundColor: cardBackground,
                  marginRight: index === count - 1 ? 0 : finalItemGap,
                },
                isSecondary && { borderRadius: 28, opacity, transform: [{ scale }] },
              ]}
            >
              <Pressable
                onPress={() => item.onPress?.()}
                style={{ width: "100%", height: "100%", position: "relative" }}
              >
                {item.image ? (
                  <Image source={item.image as any} style={styles.carouselImage} />
                ) : null}

                <View
                  style={[
                    styles.carouselOverlay,
                    isSecondary && styles.carouselOverlaySecondary,
                  ]}
                />

                {isSecondary ? (
                  <View style={styles.carouselContentSecondary}>
                    {item.badge ? (
                      <View style={styles.carouselBadgeSecondary}>
                        <Text style={styles.carouselBadgeTextSecondary}>{item.badge}</Text>
                      </View>
                    ) : null}
                    <View style={styles.carouselMiddleCopy}>
                      <Text style={styles.carouselTitleSecondary} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {item.subtitle ? (
                        <Text style={styles.carouselSubtitleSecondary} numberOfLines={2}>
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    {item.cta ? (
                      <View
                        style={[
                          styles.carouselCtaSecondary,
                          { backgroundColor: item.accentColor ?? colorRoles.brandAction },
                        ]}
                      >
                        <Text style={styles.carouselCtaTextSecondary}>{item.cta}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.carouselContent}>
                    {item.badge ? (
                      <View style={styles.carouselBadge}>
                        <Text style={styles.carouselBadgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.carouselTitle} numberOfLines={1}>{item.title}</Text>
                    {item.subtitle ? (
                      <Text style={styles.carouselSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                    ) : null}
                    {item.cta ? (
                      <View style={styles.carouselCta}>
                        <Text style={styles.carouselCtaText}>{item.cta}</Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      {isSecondary && count > 1 ? (
        <View style={styles.progressRow}>
          {banners.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <View
                key={item.id}
                style={[
                  styles.progressTrack,
                  isActive && [
                    styles.progressTrackActive,
                    { backgroundColor: item.accentColor ?? colorRoles.brandAction },
                  ],
                ]}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
});

// ─── STYLES ───
const styles = {
  heroCoverContainer: {
    height: 380,
    width: "100%",
    position: "relative" as const,
    backgroundColor: "transparent",
    overflow: "hidden" as const,
  },
  heroCoverImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover" as const,
  },
  heroCoverPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colorRoles.brandStructure,
  },
  heroCoverOverlay: {
    position: "absolute" as const,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(10, 47, 92, 0.4)",
  },
  heroCoverFadeContainer: {
    position: "absolute" as const,
    bottom: 0, left: 0, right: 0,
    height: 120,
    overflow: "hidden" as const,
  },
  heroCoverFadeBand: {
    position: "absolute" as const,
    left: 0, right: 0, bottom: 0,
    height: 2,
  },
  segmentContainer: {
    flexDirection: "row-reverse" as const,
    backgroundColor: colorRoles.surfaceBase,
    padding: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    width: "100%",
  },
  segmentChip: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  segmentChipActive: {
    backgroundColor: colorRoles.surfaceBase,
    shadowColor: colorRoles.shadowBase,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentContent: {
    flexDirection: "row-reverse" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: "800" as const,
    fontFamily: "Outfit-Bold",
  },
  carouselCard: {
    height: 142,
    borderRadius: 16,
    overflow: "hidden" as const,
    position: "relative" as const,
  },
  carouselImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover" as const,
  },
  carouselOverlay: {
    position: "absolute" as const,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  carouselOverlaySecondary: {
    backgroundColor: "rgba(0, 0, 0, 0.24)",
  },
  carouselContent: {
    position: "absolute" as const,
    top: 0, left: 0, right: 0, bottom: 0,
    padding: 12,
    justifyContent: "flex-end" as const,
    alignItems: "flex-end" as const,
  },
  carouselContentSecondary: {
    position: "absolute" as const,
    top: 0, left: 0, right: 0, bottom: 0,
    padding: 16,
    justifyContent: "space-between" as const,
    alignItems: "stretch" as const,
  },
  carouselBadge: {
    position: "absolute" as const,
    top: 12, right: 12,
    backgroundColor: colorRoles.surfaceBase,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  carouselBadgeSecondary: {
    position: "absolute" as const,
    top: 16, left: 16,
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
  },
  carouselBadgeText: {
    color: colorRoles.brandStructure,
    fontSize: 10,
    fontFamily: "Outfit-Bold",
    fontWeight: "900" as const,
  },
  carouselBadgeTextSecondary: {
    color: neutralScale[900],
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    fontWeight: "900" as const,
  },
  carouselMiddleCopy: {
    position: "absolute" as const,
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 54,
  },
  carouselTitle: {
    color: colorRoles.textOnMediaStrong,
    fontSize: 16,
    fontFamily: "Outfit-Bold",
    textAlign: "right" as const,
    fontWeight: "700" as const,
  },
  carouselTitleSecondary: {
    color: colorRoles.textInverse,
    fontSize: 20,
    fontFamily: "Outfit-Bold",
    textAlign: "center" as const,
    lineHeight: 25,
    fontWeight: "900" as const,
  },
  carouselSubtitle: {
    color: colorRoles.textOnMediaMuted,
    fontSize: 12,
    marginTop: 2,
    textAlign: "right" as const,
  },
  carouselSubtitleSecondary: {
    color: "rgba(255, 255, 255, 0.92)",
    fontSize: 13,
    fontFamily: "Outfit",
    textAlign: "center" as const,
    marginTop: 4,
    lineHeight: 16,
  },
  carouselCta: {
    marginTop: 8,
    backgroundColor: "rgba(0, 0, 0, 0.18)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  carouselCtaSecondary: {
    position: "absolute" as const,
    bottom: 16, right: 16,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  carouselCtaText: {
    color: colorRoles.textInverse,
    fontSize: 11,
    fontWeight: "900" as const,
  },
  carouselCtaTextSecondary: {
    color: colorRoles.textInverse,
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    fontWeight: "900" as const,
  },
  progressRow: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 12,
    width: "100%",
  },
  progressTrack: {
    width: 7,
    height: 4,
    borderRadius: 999,
    backgroundColor: neutralScale[300],
  },
  progressTrackActive: {
    width: 22,
  },
} as const;
