import React from 'react';

import { type DshControlPanelTone, DSH_CONTROL_PANEL_TONE_MAP } from '../../shared/operations/operations.types';
export type { DshControlPanelTone };
export { DSH_CONTROL_PANEL_TONE_MAP };

/**
 * Resolves a UI tone from an order's backend runtime status string.
 * Matches status values from the DSH operational runtime order projection.
 */
export function resolveRuntimeOrderStatusTone(status: string): DshControlPanelTone {
  const normalized = status.toLowerCase();
  if (normalized === 'cancelled' || normalized === 'failed_delivery') return 'danger';
  if (normalized === 'pending' || normalized === 'created' || normalized === 'returning_to_store') return 'warning';
  if (normalized === 'delivered' || normalized === 'returned') return 'success';
  return 'neutral';
}

// export default ControlPanelDshDecisionBoard; // Unused default export
