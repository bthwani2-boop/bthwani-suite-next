import React, { memo } from "react";
import { Image, ScrollView, YStack, XStack } from "tamagui";
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
  readonly onPress?: () => void;
};

export type BannerCarouselProps = {
  readonly banners: readonly BannerCarouselItem[];
};

export function BannerCarousel({ banners }: BannerCarouselProps) {
  const itemWidth = 260; // fixed premium width for all screens

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={itemWidth + 12}
      decelerationRate="fast"
    >
      <XStack style={styles.carouselScroll}>
        {banners.map((item) => (
          <FlexYStack
            key={item.id}
            onPress={item.onPress}
            pressStyle={{ opacity: 0.9 }}
            style={[styles.carouselCard, { width: itemWidth }]}
          >
            {item.image ? (
              <Image source={item.image} style={styles.carouselImage} />
            ) : (
              <YStack style={styles.carouselImagePlaceholder} />
            )}
            <YStack style={styles.carouselOverlay} />
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
          </FlexYStack>
        ))}
      </XStack>
    </ScrollView>
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
    flexDirection: "row-reverse",
    gap: 12,
  },
  carouselCard: {
    height: 142,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: neutralScale[900],
  },
  carouselImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  carouselImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colorRoles.brandAction,
  },
  carouselOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
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
  carouselBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: colorRoles.surfaceBase,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  carouselBadgeText: {
    color: colorRoles.brandStructure,
    fontSize: 10,
    fontFamily: "Outfit-Bold",
  },
  carouselTitle: {
    color: colorRoles.textOnMediaStrong,
    fontSize: 16,
    fontFamily: "Outfit-Bold",
    textAlign: "right",
  },
  carouselSubtitle: {
    color: colorRoles.textOnMediaMuted,
    fontSize: 12,
    marginTop: 2,
    textAlign: "right",
  },
  carouselCta: {
    marginTop: 8,
    backgroundColor: "rgba(0, 0, 0, 0.18)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  carouselCtaText: {
    color: colorRoles.textInverse,
    fontSize: 11,
  },
} as const;
