import type { DshPermissionSection, DshRoleId } from '../identity-access/dsh-role-permission.model';

export type DshSurfaceActor =
  | 'client'
  | 'partner'
  | 'captain'
  | 'field'
  | 'operator'
  | 'support'
  | 'admin';

export type DshSurfaceRuntimeStatus =
  | 'runtime-bound'
  | 'contract-required'
  | 'read-only-reference'
  | 'disabled-by-policy';

export type DshSurfaceCapabilityId =
  | 'browse-stores'
  | 'view-products'
  | 'manage-cart'
  | 'create-checkout-intent'
  | 'track-order'
  | 'request-support'
  | 'view-wallet-summary'
  | 'manage-store-readiness'
  | 'manage-catalog'
  | 'view-incoming-orders'
  | 'update-preparation-status'
  | 'view-settlement-summary'
  | 'manage-availability'
  | 'accept-reject-delivery'
  | 'update-pickup-dropoff'
  | 'upload-proof-of-delivery'
  | 'view-payout-summary'
  | 'onboard-store'
  | 'upload-documents'
  | 'submit-visit'
  | 'escalate-readiness'
  | 'manage-stores'
  | 'manage-products'
  | 'manage-media'
  | 'manage-operations'
  | 'manage-field-readiness'
  | 'manage-platform-settings'
  | 'view-finance-readonly';

export type DshSurfaceCapability = {
  id: DshSurfaceCapabilityId;
  status: DshSurfaceRuntimeStatus;
  owner: 'DSH' | 'WLT' | 'ControlPanel' | 'MediaRuntime';
  mutationBoundary: 'runtime-api' | 'read-only' | 'blocked';
};

export type DshSurfaceRuntimeContract = {
  actor: DshSurfaceActor;
  role: DshRoleId;
  permissionSections: readonly DshPermissionSection[];
  apiBinding: DshSurfaceRuntimeStatus;
  mediaBinding: DshSurfaceRuntimeStatus;
  wltBinding: Extract<DshSurfaceRuntimeStatus, 'read-only-reference' | 'contract-required' | 'disabled-by-policy'>;
  capabilities: readonly DshSurfaceCapability[];
};

const cap = (
  id: DshSurfaceCapabilityId,
  owner: DshSurfaceCapability['owner'],
  mutationBoundary: DshSurfaceCapability['mutationBoundary'],
  status: DshSurfaceRuntimeStatus = 'contract-required',
): DshSurfaceCapability => ({ id, owner, mutationBoundary, status });

export const DSH_SURFACE_RUNTIME_CONTRACTS: Record<DshSurfaceActor, DshSurfaceRuntimeContract> = {
  client: {
    actor: 'client',
    role: 'viewer',
    permissionSections: ['order-cancellation', 'support-escalation', 'finance-view'],
    apiBinding: 'contract-required',
    mediaBinding: 'contract-required',
    wltBinding: 'read-only-reference',
    capabilities: [
      cap('browse-stores', 'DSH', 'runtime-api'),
      cap('view-products', 'DSH', 'runtime-api'),
      cap('manage-cart', 'DSH', 'runtime-api'),
      cap('create-checkout-intent', 'DSH', 'runtime-api'),
      cap('track-order', 'DSH', 'runtime-api'),
      cap('request-support', 'DSH', 'runtime-api'),
      cap('view-wallet-summary', 'WLT', 'read-only', 'read-only-reference'),
    ],
  },
  partner: {
    actor: 'partner',
    role: 'viewer',
    permissionSections: ['partner-activation', 'catalog-approval', 'support-escalation', 'finance-view'],
    apiBinding: 'contract-required',
    mediaBinding: 'contract-required',
    wltBinding: 'read-only-reference',
    capabilities: [
      cap('manage-store-readiness', 'DSH', 'runtime-api'),
      cap('manage-catalog', 'DSH', 'runtime-api'),
      cap('view-incoming-orders', 'DSH', 'runtime-api'),
      cap('update-preparation-status', 'DSH', 'runtime-api'),
      cap('request-support', 'DSH', 'runtime-api'),
      cap('view-settlement-summary', 'WLT', 'read-only', 'read-only-reference'),
    ],
  },
  captain: {
    actor: 'captain',
    role: 'viewer',
    permissionSections: ['dispatch-reassignment', 'support-escalation', 'finance-view'],
    apiBinding: 'contract-required',
    mediaBinding: 'contract-required',
    wltBinding: 'read-only-reference',
    capabilities: [
      cap('manage-availability', 'DSH', 'runtime-api'),
      cap('accept-reject-delivery', 'DSH', 'runtime-api'),
      cap('update-pickup-dropoff', 'DSH', 'runtime-api'),
      cap('upload-proof-of-delivery', 'MediaRuntime', 'runtime-api'),
      cap('request-support', 'DSH', 'runtime-api'),
      cap('view-payout-summary', 'WLT', 'read-only', 'read-only-reference'),
    ],
  },
  field: {
    actor: 'field',
    role: 'viewer',
    permissionSections: ['partner-activation', 'catalog-approval', 'support-escalation'],
    apiBinding: 'contract-required',
    mediaBinding: 'contract-required',
    wltBinding: 'disabled-by-policy',
    capabilities: [
      cap('onboard-store', 'DSH', 'runtime-api'),
      cap('upload-documents', 'MediaRuntime', 'runtime-api'),
      cap('submit-visit', 'DSH', 'runtime-api'),
      cap('escalate-readiness', 'DSH', 'runtime-api'),
      cap('request-support', 'DSH', 'runtime-api'),
    ],
  },
  operator: {
    actor: 'operator',
    role: 'platform-operator',
    permissionSections: ['catalog-approval', 'order-cancellation', 'dispatch-reassignment', 'support-escalation', 'finance-view', 'platform-vars'],
    apiBinding: 'contract-required',
    mediaBinding: 'contract-required',
    wltBinding: 'read-only-reference',
    capabilities: [
      cap('manage-stores', 'ControlPanel', 'runtime-api'),
      cap('manage-products', 'ControlPanel', 'runtime-api'),
      cap('manage-media', 'MediaRuntime', 'runtime-api'),
      cap('manage-operations', 'ControlPanel', 'runtime-api'),
      cap('manage-field-readiness', 'ControlPanel', 'runtime-api'),
      cap('view-finance-readonly', 'WLT', 'read-only', 'read-only-reference'),
    ],
  },
  support: {
    actor: 'support',
    role: 'platform-operator',
    permissionSections: ['support-escalation', 'order-cancellation'],
    apiBinding: 'contract-required',
    mediaBinding: 'contract-required',
    wltBinding: 'read-only-reference',
    capabilities: [
      cap('request-support', 'DSH', 'runtime-api'),
      cap('manage-operations', 'ControlPanel', 'runtime-api'),
      cap('view-finance-readonly', 'WLT', 'read-only', 'read-only-reference'),
    ],
  },
  admin: {
    actor: 'admin',
    role: 'super-admin',
    permissionSections: ['platform-vars', 'dispatch-reassignment', 'finance-view', 'partner-activation', 'catalog-approval', 'support-escalation'],
    apiBinding: 'contract-required',
    mediaBinding: 'contract-required',
    wltBinding: 'read-only-reference',
    capabilities: [
      cap('manage-platform-settings', 'ControlPanel', 'runtime-api'),
      cap('manage-operations', 'ControlPanel', 'runtime-api'),
      cap('view-finance-readonly', 'WLT', 'read-only', 'read-only-reference'),
    ],
  },
};

export function getDshSurfaceRuntimeContract(actor: DshSurfaceActor): DshSurfaceRuntimeContract {
  return DSH_SURFACE_RUNTIME_CONTRACTS[actor];
}

export function getDshSurfaceCapability(
  actor: DshSurfaceActor,
  capabilityId: DshSurfaceCapabilityId,
): DshSurfaceCapability | undefined {
  return DSH_SURFACE_RUNTIME_CONTRACTS[actor].capabilities.find((capability) => capability.id === capabilityId);
}
