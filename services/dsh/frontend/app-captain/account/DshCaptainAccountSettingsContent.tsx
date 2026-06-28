import React from 'react';
import { Pressable, View } from 'react-native';
import { Box, borders, Icon, radius, spacing, Text, useTheme } from '@bthwani/ui-kit';
import type { BThwaniAppearanceMode } from '@bthwani/ui-kit';

let RNSwitch: React.ComponentType<{
  value: boolean;
  onValueChange: (v: boolean) => void;
  thumbColor?: string;
  trackColor?: { false?: string; true?: string };
  ios_backgroundColor?: string;
}> | null = null;
try {
  // eslint-disable-next-line no-eval
  RNSwitch = eval('require')('react-native').Switch;
} catch { /* noop */ }

type AppearanceOption = {
  mode: BThwaniAppearanceMode;
  title: string;
};

const appearanceOptions: AppearanceOption[] = [
  { mode: 'lightPremium', title: 'فاتح' },
  { mode: 'darkGlass', title: 'داكن' },
];

type Props = {
  appearanceHydrated: boolean;
  appearanceMode: BThwaniAppearanceMode;
  isStoreCourierMode: boolean;
  onSetAppearanceMode: (mode: BThwaniAppearanceMode) => void;
  onToggleStoreCourierMode: (next: boolean) => void;
};

export function DshCaptainAccountSettingsContent({
  appearanceHydrated,
  appearanceMode,
  isStoreCourierMode,
  onSetAppearanceMode,
  onToggleStoreCourierMode,
}: Props) {
  const { theme } = useTheme();
  const rowDirection = 'row-reverse' as const;

  const iconBox = (name: React.ComponentProps<typeof Icon>['name']) => (
    <View style={{ width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceInset, borderWidth: borders.hairline, borderColor: theme.line, flexShrink: 0 }}>
      <Icon name={name} size={17} tone="default" />
    </View>
  );

  return (
    <Box gap={4}>
      <Box padding={0} gap={0}>
        {/* Appearance row */}
        <View style={{ flexDirection: rowDirection, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: 14, backgroundColor: theme.surface }}>
          <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing[3], flexShrink: 1, minWidth: 0 }}>
            {iconBox('color-palette-outline')}
            <View style={{ flexShrink: 1, minWidth: 0, gap: 2, alignItems: 'flex-end' }}>
              <Text role="bodyStrong" style={{ textAlign: 'right' }} numberOfLines={1}>المظهر</Text>
              <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }} numberOfLines={1}>
                {appearanceHydrated ? 'فاتح أبيض أو داكن زجاجي' : 'جارٍ الاستعادة...'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: rowDirection, backgroundColor: theme.surfaceInset, borderRadius: radius.sm, padding: 3, borderWidth: borders.hairline, borderColor: theme.line, gap: spacing[1] }}>
            {appearanceOptions.map((opt) => (
              <Pressable key={opt.mode} onPress={() => onSetAppearanceMode(opt.mode)} style={{ paddingHorizontal: spacing[3], paddingVertical: 6, borderRadius: 9, backgroundColor: appearanceMode === opt.mode ? theme.brand : 'transparent' }}>
                <Text role="bodyStrong" style={{ color: appearanceMode === opt.mode ? theme.brandContrast : theme.text }}>{opt.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* App mode row */}
        <View style={{ flexDirection: rowDirection, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: 14, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.line }}>
          <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing[3], flexShrink: 1, minWidth: 0 }}>
            {iconBox('storefront-outline')}
            <View style={{ flexShrink: 1, minWidth: 0, gap: 2, alignItems: 'flex-end' }}>
              <Text role="bodyStrong" style={{ textAlign: 'right' }} numberOfLines={1}>وضع موصل المتجر</Text>
              <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }} numberOfLines={2}>
                {isStoreCourierMode ? 'مفعّل — طلبات المتجر فقط' : 'غير مفعّل — الوضع الافتراضي'}
              </Text>
            </View>
          </View>
          {RNSwitch ? (
            <RNSwitch
              value={isStoreCourierMode}
              onValueChange={onToggleStoreCourierMode}
              thumbColor={isStoreCourierMode ? theme.brandContrast : theme.surfaceRaised}
              trackColor={{ false: theme.lineStrong, true: theme.brand }}
              ios_backgroundColor={theme.lineStrong}
            />
          ) : null}
        </View>
      </Box>
    </Box>
  );
}
