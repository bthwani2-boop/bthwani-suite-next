// Canonical application boundary
export { DshPartnerApplication } from './DshPartnerApplication';
export type { DshPartnerApplicationProps } from './DshPartnerApplication';

// UI surface
export { DshPartnerSurface } from './DshPartnerSurface';
export { PartnerFieldRatingGate } from './ratings/PartnerFieldRatingGate';
export { IdentitySessionGate } from '../shared/session/IdentitySessionGate';
export { useDshMobilePushRegistration } from '../shared/notifications/use-mobile-push-registration';
export { configureCatalogMobileFilePicker } from '../shared/catalog';
export type { CatalogMobileFileKind, UploadFileSource } from '../shared/catalog';

export {
  DSH_PARTNER_HUB_SECTIONS,
  buildDshPartnerSupportDirectoryRoute,
  buildDshPartnerSupportDirectoryRouteFromFlow,
  buildDshPartnerSupportScreenRoute,
  dshPartnerRouteToPath,
  parseDshPartnerHubSection,
  parseDshPartnerSupportContext,
  parseDshPartnerSupportRouteId,
} from './partner-navigation';
export type {
  DshPartnerNavigation,
  DshPartnerNavigationMode,
  DshPartnerNavigationRoute,
  DshPartnerSupportSearchParams,
} from './partner-navigation';

// UI-only types
export type {
  DshPartnerHubSurfaceProps,
  DshPartnerRoute,
  DshPartnerSurfaceId,
  DshPartnerSurfaceProps,
  PartnerDshSurfaceState,
  PartnerHubSection,
} from './dsh-partner.types';

// Binding contracts
export type {
  DshPartnerBindingContract,
  DshPartnerBindingContracts,
  StoreDeliveryPolicy,
  StoreDeliveryPricingSource,
  StoreCourierCompensation,
} from './dsh-partner-binding.contracts';
export { DSH_PARTNER_BINDING_CONTRACTS } from './dsh-partner-binding.contracts';
