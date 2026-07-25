import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  alpha,
  colorRoles,
  elevation,
  neutralScale,
  radius,
  spacing,
  statusScale,
} from "@bthwani/ui-kit";
import type { PublicReel } from "../../shared/catalog/central-catalog.types";

type Props = {
  readonly reels: readonly PublicReel[];
  readonly onReelPress?: ((reel: PublicReel) => void) | undefined;
};

export function HomeReelsSection({ reels, onReelPress }: Props) {
  if (reels.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>مختارات مرئية</Text>
        <Text style={styles.title}>شاهد قبل أن تطلب</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {reels.map((reel) => (
          <Pressable
            key={reel.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => onReelPress?.(reel)}
            accessibilityRole="button"
            accessibilityLabel={reel.titleAr || reel.titleEn || "فيديو"}
          >
            <View style={styles.videoPlane}>
              <View style={styles.playButton}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
              <View style={styles.videoBadge}>
                <Text style={styles.videoBadgeText}>فيديو</Text>
              </View>
            </View>
            <View style={styles.copyWrap}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {reel.titleAr || reel.titleEn || "عرض مختار"}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                اضغط للتفاصيل
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  headerRow: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
    alignItems: "flex-end",
  },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    color: statusScale.danger,
    textAlign: "right",
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  rail: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
    flexDirection: "row-reverse",
  },
  card: {
    width: 132,
    borderRadius: radius.lg,
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    overflow: "hidden",
    ...elevation.raised,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  videoPlane: {
    height: 164,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorRoles.brandStructure,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: radius.round,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: alpha(neutralScale[0], 0.9),
  },
  playIcon: {
    paddingLeft: 2,
    fontSize: 19,
    fontWeight: "900",
    color: statusScale.danger,
  },
  videoBadge: {
    position: "absolute",
    top: spacing[2],
    right: spacing[2],
    borderRadius: radius.round,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    backgroundColor: alpha(statusScale.danger, 0.92),
  },
  videoBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: neutralScale[0],
  },
  copyWrap: {
    padding: spacing[2],
    alignItems: "flex-end",
  },
  cardTitle: {
    width: "100%",
    fontSize: 12,
    fontWeight: "900",
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  cardSubtitle: {
    width: "100%",
    marginTop: 1,
    fontSize: 10,
    fontWeight: "700",
    color: colorRoles.textSecondary,
    textAlign: "right",
  },
});
