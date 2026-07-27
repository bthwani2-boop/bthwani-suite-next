import React, { useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  alpha,
  brandScale,
  colorPalette,
  colorRoles,
  neutralScale,
  radius,
  spacing,
  statusScale,
} from "@bthwani/ui-kit";
import { ClientRemoteImage } from "../../../../../apps/app-client/runtime/src/media/ClientRemoteImage";
import type { BannerViewModel } from "../../shared/home-discovery";

type Props = {
  banners: BannerViewModel[];
  onBannerPress?: ((banner: BannerViewModel) => void) | undefined;
};

const BANNER_H = 220;

function bannerActionLabel(banner: BannerViewModel): string {
  switch (banner.actionType) {
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

export function HomeHeroBannerSection({ banners, onBannerPress }: Props) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const bannerWidth = Math.max(1, width);

  React.useEffect(() => {
    if (activeIndex >= banners.length) setActiveIndex(0);
    scrollRef.current?.scrollTo({ x: activeIndex * bannerWidth, animated: false });
  }, [activeIndex, bannerWidth, banners.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / bannerWidth);
    setActiveIndex(Math.max(0, Math.min(page, banners.length - 1)));
  };

  if (banners.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={bannerWidth}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {banners.map((banner) => {
          const actionLabel = bannerActionLabel(banner);
          const interactive = actionLabel.length > 0 && onBannerPress != null;
          return (
            <Pressable
              key={banner.id}
              disabled={!interactive}
              style={({ pressed }) => [
                styles.bannerCard,
                { width: bannerWidth },
                pressed && interactive && styles.bannerPressed,
              ]}
              onPress={() => onBannerPress?.(banner)}
              accessibilityRole={interactive ? "button" : "image"}
              accessibilityLabel={interactive
                ? `${banner.title}، ${actionLabel}`
                : banner.title}
            >
              {banner.imageUrl ? (
                <ClientRemoteImage
                  uri={banner.imageUrl}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  accessibilityLabel={`صورة ${banner.title}`}
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.bannerPlaceholder]} />
              )}

              <View style={styles.scrim} />

              {banner.subtitle ? (
                <View style={styles.topBadge}>
                  <Text style={styles.topBadgeText}>{banner.subtitle}</Text>
                </View>
              ) : null}

              <View style={styles.bannerBottom}>
                <Text style={styles.bannerTitle} numberOfLines={2}>{banner.title}</Text>
                {actionLabel ? (
                  <View style={styles.ctaButton}>
                    <Text style={styles.ctaText}>{actionLabel}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {banners.length > 1 ? (
        <View style={styles.dots} accessibilityRole="none">
          {banners.map((banner, index) => (
            <View
              key={banner.id}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
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
  bannerCard: {
    height: BANNER_H,
    overflow: "hidden",
    backgroundColor: brandScale.action[600],
  },
  bannerPressed: {
    opacity: 0.94,
  },
  bannerPlaceholder: {
    backgroundColor: brandScale.action[500],
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colorRoles.mediaScrimStrong,
    opacity: 0.45,
  },
  topBadge: {
    position: "absolute",
    top: spacing[3],
    right: spacing[3],
    backgroundColor: statusScale.success,
    borderRadius: radius.round,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  topBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: neutralScale[0],
  },
  bannerBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[4],
    gap: spacing[2],
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: neutralScale[0],
    textAlign: "right",
    textShadowColor: alpha(colorPalette.black, 0.35),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  ctaButton: {
    alignSelf: "flex-start",
    backgroundColor: colorRoles.brandAction,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "800",
    color: neutralScale[0],
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
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
