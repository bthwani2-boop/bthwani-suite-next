import React from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Box, borders, Icon, radius, spacing, Text, useTheme } from '@bthwani/ui-kit';

export function CaptainAccountNavRow({
  title,
  subtitle,
  icon,
  badgeLabel,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  badgeLabel?: string;
  onPress: () => void;
 }) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[3],
        backgroundColor: pressed ? theme.surfaceInset : 'transparent',
        gap: spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: theme.line + '22',
      })}
    >
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: spacing[3],
          flex: 1,
          minWidth: 0,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.brandSurface,
            borderWidth: borders.hairline,
            borderColor: theme.brand + '33',
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={20} tone="brand" />
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 2, alignItems: 'flex-end' }}>
          <Box layoutDirection="row" align="center" gap={2} style={{ flexDirection: 'row-reverse' }}>
            <Text role="bodyStrong" numberOfLines={1} style={{ textAlign: 'right' }}>
              {title}
            </Text>
            {badgeLabel ? <Badge label={badgeLabel} tone="brand" /> : null}
          </Box>
          <Text role="bodySm" tone="muted" numberOfLines={2} style={{ textAlign: 'right' }}>
            {subtitle}
          </Text>
        </View>
      </View>

      <Icon name="chevron-forward-outline" mirrored tone="muted" size={18} />
    </Pressable>
  );
}
