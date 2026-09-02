import type { DshPartnerRoute, DshPartnerSurfaceId } from './dsh-partner.types';
import type {
  StoreDeliveryPolicy,
  StoreDeliveryPricingSource,
  StoreCourierCompensation,
} from '../shared/store';

// Re-export for consumers that import from this contract file.
export type { DshPartnerSurfaceId };
export type { StoreDeliveryPolicy, StoreDeliveryPricingSource, StoreCourierCompensation };

export type DshPartnerBindingContract = {
  readonly surfaceId: DshPartnerSurfaceId;
  readonly bindingName: string;
  readonly description: string;
};

export type DshPartnerBindingContracts = readonly DshPartnerBindingContract[];

type DshPartnerBindingContractDefinition = Omit<DshPartnerBindingContract, 'surfaceId'>;

/**
 * Compile-time complete registry for every routable partner surface. Keeping
 * the definitions in a Record makes a newly-added DshPartnerRoute fail the
 * typecheck until its real screen binding is explicitly registered.
 */
const DSH_PARTNER_BINDING_CONTRACT_DEFINITIONS = {
  home: {
    bindingName: 'partner-home-binding',
    description: 'Partner hub shell, governed sections, and branch-scope bridge.',
  },
  entry: {
    bindingName: 'partner-entry-binding',
    description: 'Partner activation, readiness, and entry-action bridge.',
  },
  inbox: {
    bindingName: 'partner-inbox-binding',
    description: 'Partner orders inbox, filtering, search, and lifecycle bridge.',
  },
  detail: {
    bindingName: 'partner-order-detail-binding',
    description: 'Partner order detail, preparation, fulfillment, and handoff bridge.',
  },
  bell: {
    bindingName: 'partner-notifications-binding',
    description: 'Partner notifications, preferences, and operational-alert bridge.',
  },
  'support-directory': {
    bindingName: 'partner-support-directory-binding',
    description: 'Fail-closed partner operations and support-directory bridge.',
  },
  'support-screen': {
    bindingName: 'partner-support-workspace-binding',
    description: 'Partner operational-flow workspace and supported escalation bridge.',
  },
  'inventory-management': {
    bindingName: 'partner-inventory-binding',
    description: 'Sovereign catalog, assortment, price, stock, and publication bridge.',
  },
  'store-courier': {
    bindingName: 'partner-store-courier-binding',
    description: 'Store courier setup, governed policy, coverage, and activation bridge.',
  },
  'product-edit': {
    bindingName: 'partner-product-edit-binding',
    description: 'Central product proposal editing and optimistic-concurrency bridge.',
  },
  'category-management': {
    bindingName: 'partner-category-management-binding',
    description: 'Central taxonomy browsing and governed category-selection bridge.',
  },
  'product-media': {
    bindingName: 'partner-product-media-binding',
    description: 'Governed product media upload, review, and catalog-link bridge.',
  },
  'product-controls': {
    bindingName: 'partner-product-controls-binding',
    description: 'Canonical store product inventory, pricing, metadata, and operational pause bridge.',
  },
  team: {
    bindingName: 'partner-team-binding',
    description: 'Store team, invitations, roles, member actions, and courier-assignment bridge.',
  },
  'wallet-bridge': {
    bindingName: 'partner-wallet-bridge',
    description: 'Read-only WLT wallet, commission, settlement, and payout reference bridge.',
  },
  'commercial-model': {
    bindingName: 'partner-commercial-model-binding',
    description: 'DSH-owned commercial policy and store operating-model readback bridge.',
  },
  promotions: {
    bindingName: 'partner-promotions-binding',
    description: 'Partner self-offer submission, review-state tracking, and visibility-gate bridge.',
  },
} satisfies Record<DshPartnerSurfaceId, DshPartnerBindingContractDefinition>;

export const DSH_PARTNER_BINDING_CONTRACTS: DshPartnerBindingContracts = (
  Object.entries(DSH_PARTNER_BINDING_CONTRACT_DEFINITIONS) as readonly [
    DshPartnerSurfaceId,
    DshPartnerBindingContractDefinition,
  ][]
).map(([surfaceId, definition]) => ({ surfaceId, ...definition }));

export function hasDshPartnerBindingContract(route: DshPartnerRoute): boolean {
  return Object.prototype.hasOwnProperty.call(
    DSH_PARTNER_BINDING_CONTRACT_DEFINITIONS,
    route,
  );
}
