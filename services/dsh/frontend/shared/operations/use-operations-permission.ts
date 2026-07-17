'use client';

import { useControlPanelSession } from '../session/control-panel-session';
import type { CanonicalOperationsGroupId } from './operations.types';

type ReadRequirement = {
  readonly actions: readonly string[];
};

function resolveReadRequirement(
  group: CanonicalOperationsGroupId,
  subGroup?: string,
): ReadRequirement {
  if (group === 'command-center') {
    return { actions: ['analytics.read', 'platform.read'] };
  }

  if (group === 'special-ops') {
    return { actions: ['operations.special_requests.read'] };
  }

  if (group === 'dispatch-capacity') {
    return subGroup === 'zones'
      ? { actions: ['platform.read'] }
      : { actions: ['operations.read'] };
  }

  if (group === 'exceptions') {
    return subGroup === 'stores'
      ? { actions: ['partners.read'] }
      : { actions: ['operations.read', 'support.read'] };
  }

  if (group === 'live-orders') {
    if (subGroup === 'partner_delivery') {
      return { actions: ['partner_delivery.read'] };
    }
    if (subGroup === 'pickup') {
      return { actions: ['pickup.read'] };
    }
    return { actions: ['operations.read'] };
  }

  return { actions: ['operations.read'] };
}

export function useOperationsPermission(
  group: CanonicalOperationsGroupId,
  subGroup?: string,
): boolean {
  const { state } = useControlPanelSession();

  if (state.kind !== 'authenticated') {
    return false;
  }

  const { identity } = state;

  // Keep the control-panel shell aligned with the backend's sovereign
  // requirePermission fallback: authenticated operators retain full operator
  // access while fine-grained grants can expose a bounded workspace to another
  // role without granting operator authority.
  if (identity.roles.includes('operator') || identity.roles.includes('system')) {
    return true;
  }

  const requirement = resolveReadRequirement(group, subGroup);
  return identity.permissions.some((permission) => {
    if (permission.service !== 'dsh' || permission.surface !== 'control-panel') {
      return false;
    }
    return permission.action === '*' || requirement.actions.includes(permission.action);
  });
}
