export * from './administration';
export * from './analytics';
export * from './bell';
export * as cart from './cart';
export * from './catalog';
export * from './chat';
export * from './checkout';

// Delivery public surface is expanded explicitly here instead of re-exporting
// the delivery barrel. This prevents native app-captain runtime dependencies
// such as expo-location from leaking into app-partner and other surfaces.
export * from './delivery/delivery.contract';
export * from './delivery/fulfillment';
export * from './delivery/delivery.policy';
export type * from './delivery/delivery.view-model';
export type * from './delivery/delivery.adapters';
export * from './delivery/captain.contract';
export * from './delivery/captain.cod';
export * from './delivery/captain.state';
export * from './delivery/captain.surface-model';
export type * from './delivery/captain-surface.binding';
export * from './delivery/captain-navigation.model';
export * from './delivery/captain-service-mode.model';
export * from './delivery/captain-availability.model';
export * from './delivery/captain-gps.model';
export * from './delivery/captain-profile.model';
export * from './delivery/captain.derived';
export * from './delivery/captain.surface.types';

export * from './dispatch';
export * from './field-onboarding';
export * from './field-readiness';
export * from './finance-wlt-link';
export * from './geo';
export * as homeDiscovery from './home-discovery';
export * from './identity-access';
export * from './marketing';
export * from './media';
export * from './notifications';
export * from './operations';
export * from './orders';
export * from './partner';
export * from './platform';
export * from './store';
export * from './support';
export * from './hr';

// Resolve intentional cross-domain name overlaps without weakening either
// domain barrel. Analytics owns the public performance projection; checkout
// owns the public fulfillment-mode alias consumed by client surfaces.
export { fetchPartnerPerformance } from './analytics';
export type { DshFulfillmentMode } from './checkout';
