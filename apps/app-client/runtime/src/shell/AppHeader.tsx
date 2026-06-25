import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { alpha, brandRoots, colorRoles, radius, spacing } from "@bthwani/ui-kit";

const BRAND = brandRoots.brandAction;
const WHITE = brandRoots.surfaceBase;
const CORNER = 32;

export type AppHeaderAction = {
  icon: React.ReactNode;
  onPress?: () => void;
  badgeCount?: number;
  accessibilityLabel: string;
};

export type AppHeaderProps = {
  title?: string;
  locationLabel?: string;
  onLocationPress?: () => void;
  leadingSlot?: React.ReactNode;
  actions?: AppHeaderAction[];
  tickerMessage?: string;
  tickerStatusLabel?: string;
  onTickerPress?: () => void;
  direction?: "ltr" | "rtl";
  topInset?: number;
};

function AppHeaderTicker({
  message,
  statusLabel,
  onPress,
}: {
  message: string;
  statusLabel: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.ticker, { backgroundColor: alpha(WHITE, 0.12) }]}
      accessibilityRole="button"
    >
      <View style={[styles.tickerBadge, { backgroundColor: alpha(colorRoles.shadowBase, 0.22) }]}>
        <Text style={styles.tickerBadgeText}>{statusLabel}</Text>
      </View>
      <Text style={styles.tickerMessage} numberOfLines={1}>{message}</Text>
    </Pressable>
  );
}

function AppHeaderIconButton({ action }: { action: AppHeaderAction }) {
  return (
    <Pressable
      onPress={action.onPress}
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel}
      style={[styles.iconButton, { backgroundColor: alpha(WHITE, 0.15) }]}
    >
      {action.icon}
      {action.badgeCount !== undefined && action.badgeCount > 0 ? (
        <View style={[styles.badge, { backgroundColor: colorRoles.danger, borderColor: BRAND }]} />
      ) : null}
    </Pressable>
  );
}

export function AppHeader({
  title = "بثواني",
  locationLabel,
  onLocationPress,
  leadingSlot,
  actions = [],
  tickerMessage,
  tickerStatusLabel = "مباشر",
  onTickerPress,
  direction = "rtl",
  topInset = 0,
}: AppHeaderProps) {
  const rowDir = direction === "rtl" ? "row-reverse" : "row";

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: BRAND, paddingTop: topInset + spacing[2] },
      ]}
    >
      <View style={[styles.row, { flexDirection: rowDir }]}>
        <View style={[styles.actionsRow, { flexDirection: rowDir }]}>
          {actions.map((action, i) => (
            <AppHeaderIconButton key={i} action={action} />
          ))}
        </View>
        <Pressable
          onPress={onLocationPress}
          disabled={onLocationPress === undefined}
          style={styles.titleArea}
        >
          <Text style={styles.titleText}>{title}</Text>
          {locationLabel !== undefined ? (
            <Text style={[styles.locationText, { color: alpha(WHITE, 0.88) }]} numberOfLines={1}>
              {locationLabel}
            </Text>
          ) : null}
        </Pressable>
        <View style={styles.leadingSlot}>{leadingSlot}</View>
      </View>
      {tickerMessage !== undefined ? (
        <AppHeaderTicker
          message={tickerMessage}
          statusLabel={tickerStatusLabel}
          {...(onTickerPress !== undefined ? { onPress: onTickerPress } : {})}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomLeftRadius: CORNER,
    borderBottomRightRadius: CORNER,
    paddingBottom: spacing[2],
    paddingHorizontal: spacing[4],
    shadowColor: colorRoles.shadowBase,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  row: {
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  actionsRow: {
    alignItems: "center",
    gap: spacing[1],
  },
  titleArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[2],
  },
  titleText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  locationText: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  leadingSlot: {
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  ticker: {
    flexDirection: "row",
    borderRadius: radius.md,
    height: 26,
    paddingHorizontal: spacing[2],
    alignItems: "center",
    gap: spacing[2],
    overflow: "hidden",
    marginTop: spacing[1],
  },
  tickerBadge: {
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  tickerBadgeText: {
    color: WHITE,
    fontSize: 9,
    fontWeight: "900",
  },
  tickerMessage: {
    flex: 1,
    color: WHITE,
    fontSize: 11,
    fontWeight: "700",
  },
});
