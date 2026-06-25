import React, { memo, useRef, useState, useEffect } from "react";
import { Image, ScrollView, YStack, XStack } from "tamagui";
import { Dimensions, Animated, Pressable } from "react-native";
import { colorRoles, neutralScale } from "../tokens/colors";
import { StyledText } from "./_shared";
import { asUiComponent } from "../internal/tamagui-compat";

const FlexYStack = asUiComponent(YStack);
const FlexXStack = asUiComponent(XStack);

// ─── 1. HERO COVER ───
export type HeroCoverProps = {
  readonly coverImage?: { uri: string } | number | null;
};

export function HeroCover({ coverImage }: HeroCoverProps) {
  return (
    <YStack style={styles.heroCoverContainer}>
      {coverImage ? (
        <Image source={coverImage} style={styles.heroCoverImage} />
      ) : (
        <YStack style={styles.heroCoverPlaceholder} />
      )}
      <YStack style={styles.heroCoverOverlay} />

      {/* Feathered fade effect matching donor's premium look */}
      <FlexYStack style={styles.heroCoverFadeContainer} pointerEvents="none">
        {Array.from({ length: 80 }, (_, i) => {
          const t = i / 79;
          const alpha = Math.pow(t, 1.5) * 0.88;
          const bg = `rgba(255, 252, 248, ${alpha.toFixed(3)})`;
          return (
            <YStack
              key={i}
              style={[
                styles.heroCoverFadeBand,
                {
                  top: `${(t * 100).toFixed(2)}%`,
                  backgroundColor: bg,
                },
              ]}
            />
          );
        })}
      </FlexYStack>
    </YStack>
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
    <XStack style={styles.segmentContainer}>
      {options.map((opt) => {
        const isActive = opt.id === selectedId;
        return (
          <FlexYStack
            key={opt.id}
            onPress={() => onChange?.(opt.id)}
            pressStyle={{ opacity: 0.85 }}
            style={[
              styles.segmentChip,
              isActive && styles.segmentChipActive,
            ]}
          >
            <XStack style={styles.segmentContent}>
              {opt.icon ? opt.icon : null}
              <StyledText
                role="bodySm"
                weight="800"
                style={[
                  styles.segmentText,
                  { color: isActive ? colorRoles.brandAction : colorRoles.textSecondary },
                ]}
              >
                {opt.label}
              </StyledText>
            </XStack>
          </FlexYStack>
        );
      })}
    </XStack>
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

export function BannerCarousel({ banners, variant = "main", itemWidth, itemGap }: BannerCarouselProps) {
  const { width: windowWidth } = Dimensions.get("window");
  const isSecondary = variant === "secondary";
  const count = banners.length;

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Premium design spacing
  const finalItemWidth = itemWidth ?? (isSecondary ? Math.round(windowWidth * 0.62) : 260);
  const finalItemGap = itemGap ?? (isSecondary ? 12 : 12);
  const snapInterval = finalItemWidth + finalItemGap;
  const sidePadding = isSecondary ? (windowWidth - finalItemWidth) / 2 : 16;

  // Tracks current page index on scroll
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
    <YStack style={{ width: "100%", alignItems: "stretch", overflow: "visible" }}>
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

          // Centered active item animations
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
                isSecondary && {
                  borderRadius: 28,
                  opacity: opacity,
                  transform: [{ scale }],
                },
              ]}
            >
              <Pressable
                onPress={() => item.onPress?.()}
                style={{ width: "100%", height: "100%", position: "relative" }}
              >
                {item.image ? (
                  <Image source={item.image} style={styles.carouselImage} />
                ) : null}

                {/* Scrim Overlay */}
                <YStack
                  style={[
                    styles.carouselOverlay,
                    isSecondary && styles.carouselOverlaySecondary,
                  ]}
                />

                {isSecondary ? (
                  <YStack style={styles.carouselContentSecondary}>
                    {item.badge ? (
                      <YStack style={styles.carouselBadgeSecondary}>
                        <StyledText
                          role="label"
                          weight="900"
                          style={styles.carouselBadgeTextSecondary}
                        >
                          {item.badge}
                        </StyledText>
                      </YStack>
                    ) : null}

                    <YStack style={styles.carouselMiddleCopy}>
                      <StyledText
                        role="bodyStrong"
                        weight="900"
                        style={styles.carouselTitleSecondary}
                        numberOfLines={2}
                      >
                        {item.title}
                      </StyledText>
                      {item.subtitle ? (
                        <StyledText
                          role="bodySm"
                          style={styles.carouselSubtitleSecondary}
                          numberOfLines={2}
                        >
                          {item.subtitle}
                        </StyledText>
                      ) : null}
                    </YStack>

                    {item.cta ? (
                      <YStack
                        style={[
                          styles.carouselCtaSecondary,
                          { backgroundColor: item.accentColor ?? colorRoles.brandAction },
                        ]}
                      >
                        <StyledText
                          role="label"
                          weight="900"
                          style={styles.carouselCtaTextSecondary}
                        >
                          {item.cta}
                        </StyledText>
                      </YStack>
                    ) : null}
                  </YStack>
                ) : (
                  <YStack style={styles.carouselContent}>
                    {item.badge ? (
                      <YStack style={styles.carouselBadge}>
                        <StyledText role="label" weight="900" style={styles.carouselBadgeText}>
                          {item.badge}
                        </StyledText>
                      </YStack>
                    ) : null}
                    <StyledText role="bodyStrong" style={styles.carouselTitle} numberOfLines={1}>
                      {item.title}
                    </StyledText>
                    {item.subtitle ? (
                      <StyledText role="bodySm" style={styles.carouselSubtitle} numberOfLines={1}>
                        {item.subtitle}
                      </StyledText>
                    ) : null}
                    {item.cta ? (
                      <YStack style={styles.carouselCta}>
                        <StyledText role="label" weight="900" style={styles.carouselCtaText}>
                          {item.cta}
                        </StyledText>
                      </YStack>
                    ) : null}
                  </YStack>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      {/* Progress Page Indicators */}
      {isSecondary && count > 1 ? (
        <XStack style={styles.progressRow}>
          {banners.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <YStack
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
        </XStack>
      ) : null}
    </YStack>
  );
}

// ─── STYLESHEETS ───
const styles = {
  // Hero Cover
  heroCoverContainer: {
    height: 380,
    width: "100%",
    position: "relative",
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  heroCoverImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroCoverPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colorRoles.brandStructure,
  },
  heroCoverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 47, 92, 0.4)",
  },
  heroCoverFadeContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    overflow: "hidden",
  },
  heroCoverFadeBand: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
  },

  // Service Mode Segment
  segmentContainer: {
    flexDirection: "row-reverse",
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
    justifyContent: "center",
    alignItems: "center",
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
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  segmentText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },

  // Banner Carousel
  carouselScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    gap: 12,
  },
  carouselCard: {
    height: 142,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  carouselImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  carouselOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  carouselOverlaySecondary: {
    backgroundColor: "rgba(0, 0, 0, 0.24)",
  },
  carouselContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  carouselContentSecondary: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    justifyContent: "space-between",
    alignItems: "stretch",
  },
  carouselBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: colorRoles.surfaceBase,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  carouselBadgeSecondary: {
    position: "absolute",
    top: 16,
    left: 16,
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
  },
  carouselBadgeTextSecondary: {
    color: neutralScale[900],
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  carouselMiddleCopy: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 54,
  },
  carouselTitle: {
    color: colorRoles.textOnMediaStrong,
    fontSize: 16,
    fontFamily: "Outfit-Bold",
    textAlign: "right",
  },
  carouselTitleSecondary: {
    color: colorRoles.textInverse,
    fontSize: 20,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
    lineHeight: 25,
    fontWeight: "900",
  },
  carouselSubtitle: {
    color: colorRoles.textOnMediaMuted,
    fontSize: 12,
    marginTop: 2,
    textAlign: "right",
  },
  carouselSubtitleSecondary: {
    color: "rgba(255, 255, 255, 0.92)",
    fontSize: 13,
    fontFamily: "Outfit",
    textAlign: "center",
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
    position: "absolute",
    bottom: 16,
    right: 16,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  carouselCtaText: {
    color: colorRoles.textInverse,
    fontSize: 11,
  },
  carouselCtaTextSecondary: {
    color: colorRoles.textInverse,
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
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
