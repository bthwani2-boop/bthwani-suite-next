'use client';

import { useControlPanelSession } from '../session/control-panel-session';
import type { CanonicalOperationsGroupId } from './operations.types';

export function useOperationsPermission(group: CanonicalOperationsGroupId, subGroup?: string): boolean {
  const { state } = useControlPanelSession();
  
  if (state.kind !== 'authenticated') {
    return false;
  }

  const { identity } = state;
  if (identity.roles.includes('system') || identity.roles.includes('operator')) {
    const hasWildcard = identity.permissions.some(p => p.service === 'dsh' && p.action === '*');
    if (hasWildcard) return true;
  }

  let requiredAction = '';

  if (group === 'special-ops') {
    requiredAction = 'operations.special_requests.read';
  } else if (group === 'dispatch-capacity') {
    requiredAction = 'operations.dispatch.read';
  } else if (group === 'exceptions') {
    if (subGroup === 'audit') {
      requiredAction = 'operations.audit.read';
    } else {
      requiredAction = 'operations.exceptions.read';
    }
  } else if (group === 'live-orders') {
    if (subGroup === 'partner_delivery') {
      requiredAction = 'operations.partner_delivery.read';
    } else if (subGroup === 'pickup') {
      requiredAction = 'operations.pickup.read';
    } else {
      requiredAction = 'operations.live_orders.read';
    }
  } else {
    requiredAction = 'operations.general.read';
  }

  return identity.permissions.some(
    p => p.service === 'dsh' && (p.action === '*' || p.action === requiredAction || p.action.startsWith(requiredAction.replace('.read', '')))
  );
}
