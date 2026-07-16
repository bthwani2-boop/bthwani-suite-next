import React from 'react';
import { Box, Surface, Text } from '@bthwani/ui-kit';

export function OperationHeader({
  title,
  subtitle,
  chips,
  actions,
}: {
  title: string;
  subtitle: string;
  chips?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <Surface tone="raised" padding={3} gap={3}>
      <Text role="titleSm">{title}</Text>
      <Text role="bodySm" tone="muted">
        {subtitle}
      </Text>
      {chips ? <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>{chips}</Box> : null}
      {actions ? <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>{actions}</Box> : null}
    </Surface>
  );
}
