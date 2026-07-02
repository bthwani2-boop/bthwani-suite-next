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
  surfaceId: DshPartnerSurfaceId;
  bindingName: string;
  description: string;
};

export type DshPartnerBindingContracts = readonly DshPartnerBindingContract[];

export const DSH_PARTNER_BINDING_CONTRACTS: DshPartnerBindingContracts = [
  { surfaceId: 'home', bindingName: 'partner-home-binding', description: 'Partner hub shell, sections, and branch scope bridge.' },
  { surfaceId: 'entry', bindingName: 'partner-entry-binding', description: 'Partner entry CTA and readiness bridge.' },
  { surfaceId: 'inbox', bindingName: 'partner-inbox-binding', description: 'Partner orders inbox and search bridge.' },
  { surfaceId: 'detail', bindingName: 'partner-order-detail-binding', description: 'Partner order detail and handoff bridge.' },
  { surfaceId: 'bell', bindingName: 'partner-notifications-binding', description: 'Partner notifications and alerts bridge.' },
  { surfaceId: 'support-directory', bindingName: 'partner-support-directory-binding', description: 'Partner operations/support directory bridge.' },
  { surfaceId: 'support-screen', bindingName: 'partner-support-workspace-binding', description: 'Partner operational flow workspace bridge.' },
  { surfaceId: 'inventory-management', bindingName: 'partner-inventory-binding', description: 'Partner inventory and catalog bridge.' },
  { surfaceId: 'store-courier', bindingName: 'partner-store-courier-binding', description: 'Partner store courier setup, policy, and activation bridge.' },
  { surfaceId: 'wallet-bridge', bindingName: 'partner-wallet-bridge', description: 'WLT wallet and settlement integration bridge.' },
] as const;
