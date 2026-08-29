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
    return { actions: ['analytics.read', 'dsh.service_zones.read'] };
  }

  if (group === 'special-ops') {
    return { actions: ['operations.special_requests.read'] };
  }

  if (group === 'dispatch-capacity') {
    return subGroup === 'zones'
      ? { actions: ['dsh.service_zones.read', 'dsh.fulfillment_sla.read', 'dsh.dispatch_capacity.read'] }
      : { actions: ['operations.read'] };
  }

  if (group === 'exceptions') {
    return subGroup === 'stores'
      ? { actions: ['partners.read'] }
      : { actions: ['operations.read'] };
  }

  if (group === 'live-orders') {
    if (subGroup === 'partner_delivery') {
      return { actions: ['operations.read', 'partner_delivery.read'] };
    }
    if (subGroup === 'pickup') {
      return { actions: ['operations.read', 'pickup.read'] };
    }
    return { actions: ['operations.read'] };
  }

  return { actions: ['operations.read'] };
}

type OperationsPermission = {
  readonly service?: string;
  readonly surface?: string;
  readonly action?: string;
};

type OperationsPermissionIdentity = {
  readonly permissions?: readonly OperationsPermission[];
};

export function hasDshControlPanelActions(
  identity: OperationsPermissionIdentity | null | undefined,
  actions: readonly string[],
): boolean {
  return actions.every((action) => identity?.permissions?.some((permission) =>
    permission.service === 'dsh'
    && permission.surface === 'control-panel'
    && permission.action === action,
  ) ?? false);
}

export type OperationsCapabilities = Readonly<{
  canManageOperations: boolean;
  canReadPartnerDelivery: boolean;
  canManagePartnerDelivery: boolean;
  canReadPickup: boolean;
  canManagePickup: boolean;
  canOverrideIncident: boolean;
  canReadSpecialRequests: boolean;
  canTransitionSpecialRequests: boolean;
  canDispatchSpecialRequests: boolean;
}>;

export function useOperationsCapabilities(): OperationsCapabilities {
  const { state } = useIdentitySession();
  const identity = state.kind === 'authenticated' ? state.identity : null;
  const has = (action: string) => hasDshControlPanelActions(identity, [action]);

  return {
    canManageOperations: has('operations.manage'),
    canReadPartnerDelivery: has('partner_delivery.read'),
    canManagePartnerDelivery: has('partner_delivery.manage'),
    canReadPickup: has('pickup.read'),
    canManagePickup: has('pickup.manage'),
    canOverrideIncident: has('incident.override'),
    canReadSpecialRequests: has('operations.special_requests.read'),
    canTransitionSpecialRequests: has('operations.special_requests.transition'),
    canDispatchSpecialRequests: has('operations.special_requests.dispatch'),
  };
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
  return hasDshControlPanelActions(identity, requirement.actions);
}
