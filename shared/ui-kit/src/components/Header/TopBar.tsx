import React from 'react';
import { View, Pressable, I18nManager } from 'react-native';
import { Text } from '../Text';
import { spacing } from '../../tokens/spacing';

export type TopBarProps = {
  title: string;
  subtitle?: string;
  variant?: 'primary' | 'secondary';
  onBack?: () => void;
  style?: any;
};

export function TopBar({ title, subtitle, variant = 'primary', onBack, style }: TopBarProps) {
  const isRTL = I18nManager.isRTL;
  const rowDirection = isRTL ? 'row-reverse' : 'row';

  return (
    <View
      style={[
        {
          flexDirection: rowDirection,
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 56,
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          backgroundColor: variant === 'secondary' ? '#F8FAFC' : '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
        },
        style,
      ]}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text role="titleMd" style={{ textAlign: 'center' }}>{title}</Text>
        {subtitle ? (
          <Text role="bodySm" tone="muted" style={{ marginTop: 2, textAlign: 'center' }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onBack ? (
        <Pressable onPress={onBack} style={{ padding: spacing[2] }}>
          <Text role="bodySm" tone="action">
            {isRTL ? '→' : '←'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
