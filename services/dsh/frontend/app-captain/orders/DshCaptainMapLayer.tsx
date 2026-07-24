import React from 'react';
import { View } from 'react-native';
import { Badge, Box, Surface, Text, alpha, colorRoles, statusScale } from '@bthwani/ui-kit';

const SurfaceAny = Surface as any;

type DshCaptainMapLayerProps = {
  readonly orderLabel: string;
  readonly assignmentLabel: string;
  readonly currentStageLabel: string;
  readonly gpsLabel: string;
  readonly locationMessage?: string | null;
  readonly locationTone?: 'success' | 'warning' | 'danger' | 'info';
};

export function DshCaptainMapLayer({
  orderLabel,
  assignmentLabel,
  currentStageLabel,
  gpsLabel,
  locationMessage,
  locationTone = 'info',
}: DshCaptainMapLayerProps) {
  return (
    <SurfaceAny tone="inset" padding={0} gap={0} radiusToken="xl" style={{ minHeight: 260, overflow: 'hidden' } as any}>
      <Box style={{ minHeight: 260, backgroundColor: alpha(colorRoles.brandStructure, 0.06), overflow: 'hidden' }}>
        <Box style={{ position: 'absolute', inset: 0, backgroundColor: alpha(colorRoles.surfaceBase, 0.40) }} />
        <Box style={{ position: 'absolute', top: 56, left: 36, width: 6, height: 164, borderRadius: 999, backgroundColor: alpha(colorRoles.brandStructure, 0.14) }} />
        <Box style={{ position: 'absolute', top: 118, left: 36, right: 44, height: 6, borderRadius: 999, backgroundColor: alpha(colorRoles.brandStructure, 0.10) }} />
        <Box style={{ position: 'absolute', top: 186, right: 38, width: 158, height: 6, borderRadius: 999, backgroundColor: alpha(colorRoles.brandStructure, 0.10), transform: [{ rotate: '-14deg' }] }} />
        <Box style={{ position: 'absolute', bottom: 52, left: 86, right: 34, height: 6, borderRadius: 999, backgroundColor: alpha(colorRoles.brandStructure, 0.08), transform: [{ rotate: '12deg' }] }} />

        <Box style={{ position: 'absolute', top: 126, left: 144, alignItems: 'center', gap: 6 }}>
          <Box style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colorRoles.brandAction, borderWidth: 4, borderColor: colorRoles.surfaceBase }} />
          <Text role="caption" tone="muted">موقع الكابتن</Text>
        </Box>

        <Box style={{ position: 'absolute', left: 12, right: 12, top: 12 }}>
          <SurfaceAny tone="raised" padding={3} gap={2} radiusToken="xl">
            <Box layoutDirection="row" align="center" justify="space-between" gap={2} style={{ flexDirection: 'row-reverse' }}>
              <Text role="bodyStrong">{orderLabel}</Text>
              <Badge label={gpsLabel} tone={locationTone === 'danger' ? 'danger' : locationTone === 'success' ? 'success' : 'warning'} />
            </Box>
            <Text role="bodySm" tone="muted">{assignmentLabel}</Text>
            <Text role="caption" tone="muted">{currentStageLabel}</Text>
          </SurfaceAny>
        </Box>

        {locationMessage ? (
          <Box style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
            <SurfaceAny tone={locationTone === 'danger' ? 'danger' : 'raised'} padding={3} gap={1} radiusToken="lg">
              <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: locationTone === 'success' ? statusScale.success : locationTone === 'danger' ? statusScale.danger : colorRoles.brandAction }} />
              <Text role="bodySm" tone={locationTone === 'danger' ? 'danger' : 'muted'}>{locationMessage}</Text>
            </SurfaceAny>
          </Box>
        ) : null}
      </Box>
    </SurfaceAny>
  );
}
