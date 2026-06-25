import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  type ImageSourcePropType,
} from "react-native";
import { colorRoles, spacing, radius } from "@bthwani/ui-kit";

export type BannerCarouselItem = {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly badge?: string;
  readonly image?: { uri: string } | number | null;
  readonly cta?: string;
  readonly onPress?: () => void;
};

type Props = {
  readonly banners: readonly BannerCarouselItem[];
  readonly variant?: "primary" | "secondary";
};

export function BannerCarousel({ banners, variant = "primary" }: Props) {
  if (banners.length === 0) return null;
  const bg = variant === "primary" ? colorRoles.brandAction : colorRoles.brandStructure;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {banners.map((item) => (
        <Pressable
          key={item.id}
          onPress={item.onPress}
          style={[styles.card, { backgroundColor: bg }]}
        >
          {item.image ? (
            <Image
              source={item.image as ImageSourcePropType}
              style={styles.image}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.content}>
            {item.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            ) : null}
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            {item.subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text>
            ) : null}
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const CARD_WIDTH = 260;
const CARD_HEIGHT = 130;

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radius.xl,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.55,
  },
  content: {
    flex: 1,
    padding: spacing[3],
    justifyContent: "flex-end",
    gap: spacing[1],
  },
  badge: {
    alignSelf: "flex-end",
    backgroundColor: colorRoles.brandAction,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  badgeText: {
    color: colorRoles.textInverse,
    fontSize: 10,
    fontWeight: "800",
  },
  title: {
    color: colorRoles.textInverse,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
  },
  subtitle: {
    color: colorRoles.textInverse,
    fontSize: 11,
    opacity: 0.85,
    textAlign: "right",
  },
});
