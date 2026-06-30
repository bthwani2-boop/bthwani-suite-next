import { colorRoles } from '@bthwani/ui-kit';
import React from 'react';
import { View } from 'react-native';
import { Text } from '../Text';
import { spacing } from '../../tokens/spacing';

export type KeyValueItem = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger" | "info" | "action" | "secondary" | "muted" | "inverse" | "brand" | undefined;
};

export type KeyValueListProps = {
  items: readonly KeyValueItem[];
  dense?: boolean;
};

export function KeyValueList({ items, dense }: KeyValueListProps) {
  return (
    <View style={{ gap: spacing[2], backgroundColor: colorRoles.surfaceBase, padding: spacing[3], borderRadius: 12 }}>
      {items.map((item, index) => (
        <View key={index} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: dense ? 2 : 6 }}>
          <Text role="bodySm" tone="muted">{item.label}</Text>
          <Text role="bodySm" tone={item.tone === 'brand' ? 'action' : (item.tone || 'default')}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}
