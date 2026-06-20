import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text as RNText,
  useWindowDimensions,
  View,
} from "react-native";
import { alpha, brandRoots, colorRoles } from "../../tokens/colors";
import { spacing } from "../../tokens/spacing";

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
      style={ns.navButton}
    >
      {isActive ? item.activeIcon : item.icon}
      <RNText style={[ns.navLabel, { color: iconColor }]} numberOfLines={1}>
        {item.label}
      </RNText>
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
  const { width } = useWindowDimensions();
  const rowDir = direction === "rtl" ? "row-reverse" : "row";
  const totalHeight = NAV_BASE_HEIGHT + bottomInset;

  const leftItems = items.slice(0, 2);
  const rightItems = items.slice(2, 4);

  return (
    <View style={[ns.container, { width, height: totalHeight }]}>
      <View style={[ns.surface, { height: totalHeight, paddingBottom: bottomInset }]}>
        <View style={[ns.content, { flexDirection: rowDir }]}>
          {leftItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={activeId === item.id}
              onPress={() => onSelect(item.id)}
            />
          ))}

          <View style={ns.launcherPlaceholder}>
            <Pressable onPress={onLauncherPress} style={ns.launcherLabelArea}>
              <RNText style={ns.launcherLabel}>{launcherLabel}</RNText>
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
        style={({ pressed }) => [ns.launcher, pressed && { opacity: 0.88 }]}
      >
        {launcherIcon}
      </Pressable>
    </View>
  );
}

const ns = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
  },
  surface: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: WHITE,
    borderTopLeftRadius: NAV_CORNER,
    borderTopRightRadius: NAV_CORNER,
    ...Platform.select({
      ios: {
        shadowColor: colorRoles.shadowBase,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 16 },
    }),
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[2],
    alignItems: "center",
    justifyContent: "space-around",
  },
  navButton: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
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
  launcherLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: colorRoles.textMuted,
    textAlign: "center",
  },
  launcher: {
    position: "absolute",
    top: -LAUNCHER_FLOAT,
    alignSelf: "center",
    width: LAUNCHER_SIZE,
    height: LAUNCHER_SIZE,
    borderRadius: LAUNCHER_SIZE / 2,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: alpha(WHITE, 0.28),
    ...Platform.select({
      ios: {
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 20 },
    }),
    zIndex: 10,
  },
});
