import React from 'react';
import { Button, Surface, Text, spacing } from '@bthwani/ui-kit';

export type PartnerStoreScopeOption = { id: string; label: string; description: string };

export function PartnerStoreScopeSheet({
  visible, onClose, options, selectedId, onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  options: readonly PartnerStoreScopeOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (!visible) return null;
  return (
    <Surface tone="raised" padding={5} gap={4} radiusToken="xl" border={false} style={{ margin: spacing[4] }}>
      <Text role="titleMd">نطاق الفرع</Text>
      {options.map((option) => (
        <Button key={option.id} label={option.label} variant={option.id === selectedId ? 'primary' : 'secondary'} onPress={() => onSelect(option.id)} />
      ))}
      <Button label="إغلاق" onPress={onClose} />
    </Surface>
  );
}
