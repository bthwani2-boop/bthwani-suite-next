import React from 'react';
import { Button, Surface, Text, spacing } from '@bthwani/ui-kit';

import { DshPartnerOperationalScope } from '../../shared/partner/partner.types';

export function PartnerStoreScopeSheet({
  visible, onClose, options, selectedId, onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  options: readonly DshPartnerOperationalScope[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (!visible) return null;
  const scopeLabel = options.length > 1 ? 'الفروع' : 'المتجر';

  return (
    <Surface tone="raised" padding={5} gap={4} radiusToken="xl" border={false} style={{ margin: spacing[4] }}>
      <Text role="titleMd">{scopeLabel}</Text>
      {options.map((option) => (
        <Button key={option.scopeId} label={option.displayName} tone={option.scopeId === selectedId ? 'primary' : 'secondary'} onPress={() => onSelect(option.scopeId)} />
      ))}
      <Button label="إغلاق" onPress={onClose} />
    </Surface>
  );
}
