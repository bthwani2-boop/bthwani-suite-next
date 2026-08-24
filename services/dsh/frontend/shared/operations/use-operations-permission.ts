'use client';

import { useIdentitySession } from "@bthwani/core-identity";
import type { CanonicalOperationsGroupId } from './operations.types';

type ReadRequirement = {
  readonly actions: readonly string[];
};

function resolveReadRequirement(
  group: CanonicalOperationsGroupId,
  subGroup?: string,
): ReadRequirement {
  if (group === 'command-center') {
    return { actions: ['analytics.read', 'platform:read'] };
  }

  if (group === 'special-ops') {
    return { actions: ['operations.special_requests.read'] };
  }

  if (group === 'dispatch-capacity') {
    return subGroup === 'zones'
      ? { actions: ['platform:read'] }
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
  const { state } = useIdentitySession();

  if (state.kind !== 'authenticated') {
    return false;
  }

  const { identity } = state;

  // The backend is authoritative for every operation capability. Roles are
  // identity metadata, not a permission bypass, and wildcard actions are not
  // part of the canonical DSH control-panel vocabulary.
  const requirement = resolveReadRequirement(group, subGroup);
  return identity.permissions.some((permission) => {
    if (permission.service !== 'dsh' || permission.surface !== 'control-panel') {
      return false;
    }
    return requirement.actions.includes(permission.action);
  });
}
