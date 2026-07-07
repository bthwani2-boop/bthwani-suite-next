import React from 'react';
import { Platform, View } from 'react-native';
import { borders, Box, Surface, colorRoles, statusScale, colorPalette, alpha } from '@bthwani/ui-kit';
import { useTheme } from '@bthwani/ui-kit';
import type { MapHeatZone } from '../../shared/delivery';

const SurfaceAny = Surface as any;

const mapDemandZones: readonly MapHeatZone[] = [
  { id: 'demand-1', top: 58, right: 34, size: 164, color: alpha(statusScale.danger, 0.20), label: 'طلب مرتفع' },
  { id: 'demand-2', top: 188, left: 26, size: 118, color: alpha(statusScale.danger, 0.14), label: 'ذروة قريبة' },
  { id: 'demand-3', bottom: 108, right: 96, size: 146, color: alpha(colorRoles.brandAction, 0.16), label: 'متاجر نشطة' },
];

const mapCaptainZones: readonly MapHeatZone[] = [
  { id: 'captain-1', top: 128, left: 112, size: 132, color: alpha(statusScale.dangerStrong, 0.14), label: 'كباتن أكثر' },
  { id: 'captain-2', bottom: 138, left: 154, size: 104, color: alpha(statusScale.dangerStrong, 0.10), label: 'تغطية قريبة' },
];

type Props = {
  isAvailable: boolean;
  availabilityLabel: string;
  isGpsEnabled: boolean;
  onToggleAvailability: (value: boolean) => void;
  onToggleGps: (value: boolean) => void;
  orderPanelNode: React.ReactNode;
  bottomNavOffset: number;
  safeAreaBottom: number;
  showBottomNav: boolean;
};

export function DshCaptainMapLayer({
  isAvailable,
  availabilityLabel,
  isGpsEnabled,
  onToggleAvailability,
  onToggleGps,
  orderPanelNode,
  bottomNavOffset,
  safeAreaBottom,
  showBottomNav,
}: Props) {
  const theme = useTheme() as any;

  const panelBottom = showBottomNav
    ? (Platform.OS === 'android' ? 112 : 80) + 12
    : safeAreaBottom + 16;

  return (
    <Box style={{ flex: 1, position: 'relative' }}>
      <SurfaceAny tone="inset" padding={0} gap={0} radiusToken="xl" style={{ flex: 1, overflow: 'hidden', borderColor: theme.lineStrong } as any}>
        <Box style={{ flex: 1, backgroundColor: theme.surfaceSecondary, overflow: 'hidden' }}>
          <Box style={{ position: 'absolute', inset: 0, backgroundColor: alpha(colorPalette.white, 0.12) }} />
          <Box style={{ position: 'absolute', top: 78, left: 40, width: 7, height: 222, borderRadius: 999, backgroundColor: alpha(statusScale.dangerStrong, 0.10) }} />
          <Box style={{ position: 'absolute', top: 136, left: 40, right: 74, height: 7, borderRadius: 999, backgroundColor: alpha(statusScale.dangerStrong, 0.08) }} />
          <Box style={{ position: 'absolute', top: 214, right: 58, width: 148, height: 7, borderRadius: 999, backgroundColor: alpha(statusScale.dangerStrong, 0.08), transform: [{ rotate: '-18deg' }] }} />
          <Box style={{ position: 'absolute', bottom: 122, left: 92, right: 42, height: 7, borderRadius: 999, backgroundColor: alpha(statusScale.dangerStrong, 0.06), transform: [{ rotate: '14deg' }] }} />

          {mapDemandZones.map((zone) => (
            <Box key={zone.id} style={{ position: 'absolute', width: zone.size, height: zone.size, borderRadius: zone.size / 2, backgroundColor: zone.color, borderWidth: borders.hairline, borderColor: alpha(statusScale.danger, 0.12), ...(zone.top != null ? { top: zone.top } : {}), ...(zone.bottom != null ? { bottom: zone.bottom } : {}), ...(zone.left != null ? { left: zone.left } : {}), ...(zone.right != null ? { right: zone.right } : {}) } as any} />
          ))}

          {mapCaptainZones.map((zone) => (
            <Box key={zone.id} style={{ position: 'absolute', width: zone.size, height: zone.size, borderRadius: zone.size / 2, backgroundColor: zone.color, borderWidth: borders.hairline, borderColor: alpha(statusScale.dangerStrong, 0.12), ...(zone.top != null ? { top: zone.top } : {}), ...(zone.bottom != null ? { bottom: zone.bottom } : {}), ...(zone.left != null ? { left: zone.left } : {}), ...(zone.right != null ? { right: zone.right } : {}) } as any} />
          ))}

          <Box style={{ position: 'absolute', top: 182, left: 148, alignItems: 'center', gap: 6 }}>
            <Box style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colorRoles.brandAction, borderWidth: 4, borderColor: colorRoles.surfaceBase }} />
          </Box>

          <Box style={{ position: 'absolute', left: 8, right: 8, top: 4, zIndex: 9999, elevation: 20 }}>
            <SurfaceAny tone="inset" padding={1} gap={1} radiusToken="xl" style={{ alignSelf: 'stretch' } as any}>
              <Box layoutDirection="row" align="center" gap={1} style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start' }}>
                <Box layoutDirection="row" align="center" gap={1} paddingX={1} paddingY={1} radiusToken="pill" background="surfaceRaised" border borderTone="line">
                  <Box layoutDirection="row" align="center" gap={1}>
                    <Box style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: alpha(statusScale.danger, 0.95) }} />
                  </Box>
                  <Box layoutDirection="row" align="center" gap={1}>
                    <Box style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: alpha(statusScale.dangerStrong, 0.95) }} />
                  </Box>
                </Box>
              </Box>
            </SurfaceAny>
          </Box>
        </Box>
      </SurfaceAny>

      <Box style={{ position: 'absolute', left: 12, right: 12, bottom: panelBottom }}>
        {orderPanelNode}
      </Box>
    </Box>
  );
}
// export default DshCaptainMapLayer; // Unused default export