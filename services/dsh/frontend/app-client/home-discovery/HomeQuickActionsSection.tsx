import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  alpha,
  colorRoles,
  elevation,
  neutralScale,
  radius,
  spacing,
  statusScale,
} from "@bthwani/ui-kit";

export function HomeQuickActionsSection({
  hasCategories,
  hasReels,
  onCategoriesPress,
  onVideoPress,
}: {
  readonly hasCategories: boolean;
  readonly hasReels: boolean;
  readonly onCategoriesPress?: (() => void) | undefined;
  readonly onVideoPress?: (() => void) | undefined;
}) {
  if (!hasCategories && !hasReels) return null;

  return (
    <View style={styles.container}>
      {hasReels ? (
        <QuickActionCard
          title="فيديو"
          subtitle="لقطات مختارة"
          icon="▶"
          tone="video"
          onPress={onVideoPress}
        />
      ) : null}
      {hasCategories ? (
        <QuickActionCard
          title="الفئات"
          subtitle="تصفح أسرع"
          icon="▦"
          tone="category"
          onPress={onCategoriesPress}
        />
      ) : null}
    </View>
  );
}

function QuickActionCard({
  title,
  subtitle,
  icon,
  tone,
  onPress,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly icon: string;
  readonly tone: "video" | "category";
  readonly onPress?: (() => void) | undefined;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        tone === "video" ? styles.videoCard : styles.categoryCard,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.iconWrap, tone === "video" ? styles.videoIconWrap : styles.categoryIconWrap]}>
        <Text style={[styles.icon, tone === "video" ? styles.videoIcon : styles.categoryIcon]}>{icon}</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  card: {
    flex: 1,
    minHeight: 64,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceBase,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing[2],
    ...elevation.raised,
  },
  videoCard: {
    backgroundColor: alpha(statusScale.danger, 0.055),
  },
  categoryCard: {
    backgroundColor: alpha(colorRoles.brandAction, 0.055),
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  videoIconWrap: {
    backgroundColor: statusScale.danger,
  },
  categoryIconWrap: {
    backgroundColor: colorRoles.brandAction,
  },
  icon: {
    fontSize: 19,
    fontWeight: "900",
    color: neutralScale[0],
  },
  videoIcon: {
    paddingLeft: 2,
  },
  categoryIcon: {
    fontSize: 22,
    lineHeight: 24,
  },
  textWrap: {
    flex: 1,
    alignItems: "flex-end",
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: "900",
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  subtitle: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: "700",
    color: colorRoles.textSecondary,
    textAlign: "right",
  },
});
