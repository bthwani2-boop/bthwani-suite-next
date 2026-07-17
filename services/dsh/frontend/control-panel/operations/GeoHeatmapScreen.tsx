'use client';

import React from 'react';
import { StateView } from '@bthwani/ui-kit';

export type GeoHeatmapScreenProps = {
  hubHref: string;
  subGroup?: string;
};

/**
 * Source-preserving quarantine for the future geo-capacity workspace.
 *
 * The former implementation generated demand, captain, SLA, and store-pressure
 * values with Math.random and exposed actions that had no sovereign mutation
 * or readback. The production Operations router no longer mounts this screen.
 * Keeping an explicit blocked component preserves the module boundary without
 * presenting synthetic operational truth.
 */
export function GeoHeatmapScreen(_props: GeoHeatmapScreenProps) {
  return (
    <StateView
      kind="warning"
      title="خريطة السعة غير مفعلة"
      description="هذه المساحة محجوبة حتى تتوفر قراءة مكانية سيادية، عقد تدخل، صلاحيات، تدقيق، واختبار قراءة راجعة من DSH Runtime."
    />
  );
}

export default GeoHeatmapScreen;
