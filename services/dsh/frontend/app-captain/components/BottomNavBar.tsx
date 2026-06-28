/**
 * BottomNavBar — DSH Captain Surface
 * Fully compliant with @bthwani/ui-kit design tokens:
 *   brandAction  #FF500D  → active icons / launcher active state
 *   brandStructure #0A2F5C → floating button default
 *   textMuted    rgba(10,47,92,0.68) → inactive items
 *   surfaceBase  #FFFFFF  → pill background
 *   borderSubtle rgba(10,47,92,0.10) → pill border
 */
import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Icon, Text } from '@bthwani/ui-kit';
import { colorRoles, lightThemeColors } from '@bthwani/ui-kit';

export type BottomNavBarProps = {
  activeId: string;
  direction?: 'ltr' | 'rtl';
  launcherLabel: string;
  launcherIcon: string;
  launcherActive: boolean;
  onLauncherPress: () => void;
  onSelect: (id: string) => void;
  items: readonly { id: string; label: string; icon: string; activeIcon: string }[];
};

export function BottomNavBar({
  activeId,
  direction = 'rtl',
  launcherLabel,
  launcherIcon,
  launcherActive,
  onLauncherPress,
  onSelect,
  items,
}: BottomNavBarProps) {
  const isRTL = direction === 'rtl';
  const rowDir: 'row' | 'row-reverse' = isRTL ? 'row-reverse' : 'row';

  // 4 items split around the centre launcher
  const leftItems = items.slice(0, 2);
  const rightItems = items.slice(2, 4);

  const renderNavItem = (item: typeof items[0]) => {
    const isActive = activeId === item.id && !launcherActive;
    return (
      <Pressable
        key={item.id}
        onPress={() => onSelect(item.id)}
        style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
      >
        <Icon
          name={isActive ? item.activeIcon : item.icon}
          size={22}
          tone={isActive ? 'action' : 'muted'}
        />
        <Text
          role="caption"
          tone={isActive ? 'action' : 'muted'}
          align="center"
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      {/* Pill */}
      <View style={styles.pill}>
        <View style={[styles.row, { flexDirection: rowDir }]}>
          {leftItems.map(renderNavItem)}

          {/* Centre gap + label beneath launcher */}
          <View style={styles.centreSlot}>
            <Pressable onPress={onLauncherPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text
                role="caption"
                tone={launcherActive ? 'action' : 'muted'}
                align="center"
                numberOfLines={1}
              >
                {launcherLabel}
              </Text>
            </Pressable>
          </View>

          {rightItems.map(renderNavItem)}
        </View>
      </View>

      {/* Floating centre button */}
      <Pressable
        onPress={onLauncherPress}
        style={({ pressed }) => [
          styles.floatingBtn,
          launcherActive && styles.floatingBtnActive,
          pressed && styles.floatingBtnPressed,
        ]}
      >
        <Icon name={launcherIcon} size={26} color={lightThemeColors.surface} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: 64,
    alignItems: 'center',
  },

  // White pill with subtle border
  pill: {
    width: '100%',
    height: 64,
    backgroundColor: lightThemeColors.surface,          // #FFFFFF
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,                // rgba(10,47,92,0.10)
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colorRoles.shadowBase,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 14,
      },
      android: { elevation: 10 },
    }),
  },

  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },

  navBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: '100%',
    borderRadius: 28,
  },
  navBtnPressed: {
    backgroundColor: lightThemeColors.actionSoft,        // rgba(255,80,13,0.12)
  },

  // Space where the floating button lives
  centreSlot: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    height: '100%',
  },

  // Floating circle button
  floatingBtn: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colorRoles.brandStructure,          // #0A2F5C
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: lightThemeColors.surface,               // white ring
    ...Platform.select({
      ios: {
        shadowColor: colorRoles.brandStructure,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.30,
        shadowRadius: 10,
      },
      android: { elevation: 16 },
    }),
    zIndex: 10,
  },
  floatingBtnActive: {
    backgroundColor: colorRoles.brandAction,             // #FF500D
    ...Platform.select({
      ios: { shadowColor: colorRoles.brandAction },
    }),
  },
  floatingBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.95 }],
  },
});

export default BottomNavBar;
