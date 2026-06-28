import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Icon, Text } from '@bthwani/ui-kit';

// Design system tokens
const BRAND_ACTION = '#FF500D';
const BRAND_STRUCTURE = '#0A2F5C';
const SURFACE_BASE = '#FFFFFF';
const TEXT_MUTED = 'rgba(10, 47, 92, 0.45)';
const BORDER_SUBTLE = 'rgba(10, 47, 92, 0.10)';
const SHADOW_COLOR = '#000000';

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
  const rowDirection: 'row' | 'row-reverse' = isRTL ? 'row-reverse' : 'row';

  // Split items to place launcher button in the middle
  const leftItems = items.slice(0, 2);
  const rightItems = items.slice(2, 4);

  const renderItem = (item: typeof items[0]) => {
    const isActive = activeId === item.id && !launcherActive;
    const iconName = isActive ? item.activeIcon : item.icon;
    const tintColor = isActive ? BRAND_ACTION : TEXT_MUTED;

    return (
      <Pressable
        key={item.id}
        onPress={() => onSelect(item.id)}
        style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        <Icon name={iconName} size={22} color={tintColor} />
        <Text
          role="caption"
          style={[styles.navLabel, { color: tintColor }]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrapper}>
      {/* Main pill container */}
      <View style={styles.pill}>
        <View style={[styles.navContent, { flexDirection: rowDirection }]}>
          {leftItems.map(renderItem)}

          {/* Spacer for floating center button */}
          <View style={styles.launcherSpacer}>
            <Pressable
              onPress={onLauncherPress}
              style={styles.launcherLabelArea}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.launcherLabel, { color: launcherActive ? BRAND_ACTION : TEXT_MUTED }]}>
                {launcherLabel}
              </Text>
            </Pressable>
          </View>

          {rightItems.map(renderItem)}
        </View>
      </View>

      {/* Floating center launcher button */}
      <Pressable
        onPress={onLauncherPress}
        style={({ pressed }) => [
          styles.floatingBtn,
          launcherActive && styles.floatingBtnActive,
          pressed && styles.floatingBtnPressed,
        ]}
      >
        <Icon name={launcherIcon} size={26} color={SURFACE_BASE} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: 64,
    alignItems: 'center',
  },
  pill: {
    width: '100%',
    height: 64,
    backgroundColor: SURFACE_BASE,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    ...Platform.select({
      ios: {
        shadowColor: SHADOW_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  navContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 2,
    borderRadius: 28,
  },
  navButtonPressed: {
    backgroundColor: 'rgba(255, 80, 13, 0.06)',
  },
  navLabel: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  launcherSpacer: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    paddingBottom: 6,
  },
  launcherLabelArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  launcherLabel: {
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  floatingBtn: {
    position: 'absolute',
    top: -18,
    alignSelf: 'center',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: BRAND_STRUCTURE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: SURFACE_BASE,
    ...Platform.select({
      ios: {
        shadowColor: BRAND_STRUCTURE,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 18,
      },
    }),
    zIndex: 10,
  },
  floatingBtnActive: {
    backgroundColor: BRAND_ACTION,
    ...Platform.select({
      ios: {
        shadowColor: BRAND_ACTION,
      },
    }),
  },
  floatingBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
});

export default BottomNavBar;
