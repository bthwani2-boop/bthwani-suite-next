// UI surface
export { DshPartnerSurface } from './DshPartnerSurface';

// UI-only types
export type {
  DshPartnerHubSurfaceProps,
  DshPartnerRoute,
  DshPartnerSurfaceId,
  DshPartnerSurfaceProps,
  PartnerDshSurfaceState,
  PartnerHubSection,
} from './dsh-partner.types';

// Route/screen registry
export type { DshPartnerRouteId, DshPartnerRouteRecord, DshPartnerLegacyRoute } from './dsh-partner.routes';
export { dshPartnerRoutes } from './dsh-partner.routes';
export type { DshPartnerRegistryRouteId, DshPartnerScreenRegistryItem } from './dsh-partner.screen-registry';
export { dshPartnerScreenRegistry } from './dsh-partner.screen-registry';

// Binding contracts (DshPartnerSurfaceId is already exported from dsh-partner.types above)
export type {
  DshPartnerBindingContract,
  DshPartnerBindingContracts,
  StoreDeliveryPolicy,
  StoreDeliveryPricingSource,
  StoreCourierCompensation,
} from './dsh-partner-binding.contracts';
export { DSH_PARTNER_BINDING_CONTRACTS } from './dsh-partner-binding.contracts';

// UI panels (surface-specific)
export { PartnerCatalogReadinessPanel } from './Catalog/PartnerCatalogReadinessPanel';
export type { PartnerCatalogReadinessPanelProps } from './Catalog/PartnerCatalogReadinessPanel';

export { DshPartnerOrderRejectionScreen } from './orders/DshPartnerOrderRejectionScreen';
export type { DshPartnerOrderRejectionScreenProps } from './orders/DshPartnerOrderRejectionScreen';
