import React from 'react';
import { View, Pressable, I18nManager, StyleSheet } from 'react-native';
import { Text } from '../Text';
import { Icon } from '../Icon';
import { colorRoles } from '../../tokens/colors';
import { spacing } from '../../tokens/spacing';
import { radius } from '../../tokens/radius';

export type TopBarProps = {
  title: string;
  subtitle?: string | undefined;
  variant?: 'primary' | 'secondary' | undefined;
  onBack?: (() => void) | undefined;
  rightSlot?: React.ReactNode | undefined;
  style?: any;
};

export function TopBar({ title, subtitle, variant = 'primary', onBack, rightSlot, style }: TopBarProps) {
  const isRTL = I18nManager.isRTL;
  const rowDirection = isRTL ? 'row-reverse' : 'row';

  return (
    <View
      style={[
        styles.topBar,
        {
          flexDirection: rowDirection,
          backgroundColor: variant === 'secondary' ? colorRoles.surfaceWarm : colorRoles.surfaceBase,
        },
        style,
      ]}
    >
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الرجوع"
          onPress={onBack}
          style={styles.backButton}
        >
          <Icon
            name={isRTL ? "chevron-forward" : "chevron-back"}
            size={22}
            color={colorRoles.textPrimary}
          />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}

      <View style={styles.titleContainer}>
        <Text role="titleMd" style={styles.titleText}>{title}</Text>
        {subtitle ? (
          <Text role="caption" tone="muted" style={styles.subtitleText}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightSlot ? (
        <View style={styles.rightSlotContainer}>{rightSlot}</View>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  spacer: {
    width: 36,
    height: 36,
  },
  rightSlotContainer: {
    minWidth: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: 'bold',
    color: colorRoles.textPrimary,
  },
  subtitleText: {
    marginTop: 1,
    textAlign: 'center',
    fontSize: 11,
  },
});
