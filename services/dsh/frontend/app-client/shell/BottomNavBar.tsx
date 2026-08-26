import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { alpha, brandRoots, colorRoles, spacing } from "@bthwani/ui-kit";

const BRAND = brandRoots.brandAction;
const WHITE = brandRoots.surfaceBase;
const NAV_CORNER = 32;
const NAV_BASE_HEIGHT = 64;
const LAUNCHER_SIZE = 56;
const LAUNCHER_FLOAT = 12;

export type BottomNavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
};

export type BottomNavBarProps = {
  items: readonly BottomNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  launcherIcon: React.ReactNode;
  launcherLabel?: string;
  onLauncherPress?: () => void;
  direction?: "ltr" | "rtl";
  bottomInset?: number;
};

function NavButton({
  item,
  isActive,
  onPress,
}: {
  item: BottomNavItem;
  isActive: boolean;
  onPress: () => void;
}) {
  const iconColor = isActive ? colorRoles.brandAction : colorRoles.textMuted;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      style={styles.navButton}
    >
      {isActive ? item.activeIcon : item.icon}
      <Text style={[styles.navLabel, { color: iconColor }]} numberOfLines={1}>
        {item.label}
      </Text>
    </Pressable>
  );
}

export function BottomNavBar({
  items,
  activeId,
  onSelect,
  launcherIcon,
  launcherLabel = "الخدمات",
  onLauncherPress,
  direction = "rtl",
  bottomInset = 0,
}: BottomNavBarProps) {
  const rowDir = direction === "rtl" ? "row-reverse" : "row";
  const totalHeight = NAV_BASE_HEIGHT + bottomInset;

  const leftItems = items.slice(0, 2);
  const rightItems = items.slice(2, 4);

  return (
    <View style={[styles.wrapper, { height: totalHeight }]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: WHITE,
            borderTopLeftRadius: NAV_CORNER,
            borderTopRightRadius: NAV_CORNER,
            height: totalHeight,
            paddingBottom: bottomInset,
          },
        ]}
      >
        <View style={[styles.row, { flexDirection: rowDir }]}>
          {leftItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={activeId === item.id}
              onPress={() => onSelect(item.id)}
            />
          ))}
          <View style={styles.launcherPlaceholder}>
            <Pressable onPress={onLauncherPress} style={styles.launcherLabelArea}>
              <Text style={styles.launcherLabelText}>{launcherLabel}</Text>
            </Pressable>
          </View>
          {rightItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={activeId === item.id}
              onPress={() => onSelect(item.id)}
            />
          ))}
        </View>
      </View>
      <Pressable
        onPress={onLauncherPress}
        accessibilityRole="button"
        accessibilityLabel={launcherLabel}
        style={[
          styles.launcher,
          { top: -LAUNCHER_FLOAT, backgroundColor: BRAND, borderColor: alpha(WHITE, 0.28), shadowColor: BRAND },
        ]}
      >
        {launcherIcon}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    width: "100%",
    alignItems: "center",
  },
  bar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: colorRoles.shadowBase,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  row: {
    flex: 1,
    paddingHorizontal: spacing[2],
    alignItems: "center",
    justifyContent: "space-around",
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: NAV_BASE_HEIGHT - spacing[2],
    gap: 2,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  launcherPlaceholder: {
    width: LAUNCHER_SIZE + spacing[2],
    alignItems: "center",
    justifyContent: "flex-end",
    height: NAV_BASE_HEIGHT - spacing[2],
    paddingBottom: spacing[1],
  },
  launcherLabelArea: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing[8],
  },
  launcherLabelText: {
    fontSize: 10,
    fontWeight: "900",
    color: colorRoles.textMuted,
    textAlign: "center",
  },
  launcher: {
    position: "absolute",
    alignSelf: "center",
    width: LAUNCHER_SIZE,
    height: LAUNCHER_SIZE,
    borderRadius: LAUNCHER_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 20,
    zIndex: 10,
  },
});
