import type { DshPartnerRoute } from './dsh-partner.types';

export type DshPartnerRouteId =
  | 'dsh-partner-home'
  | 'dsh-partner-entry'
  | 'dsh-partner-store-profile'
  | 'dsh-partner-operations'
  | 'dsh-partner-orders'
  | 'dsh-partner-order-issue'
  | 'dsh-partner-inventory'
  | 'dsh-partner-promotions'
  | 'dsh-partner-notifications'
  | 'dsh-partner-settings'
  | 'dsh-partner-support'
  | 'dsh-partner-order-rejection'
  | 'dsh-partner-product-edit' // J-002 / DSH-SLICE-002A
  | 'dsh-partner-category-management' // J-002 / DSH-SLICE-002B
  | 'dsh-partner-product-media' // J-002 / DSH-SLICE-002C
  | 'dsh-partner-product-overrides'; // J-002 / DSH-SLICE-002D

export type DshPartnerLegacyRoute = DshPartnerRoute;

export type DshPartnerRouteRecord = {
  readonly routeId: DshPartnerRouteId;
  readonly legacyRoute: DshPartnerLegacyRoute;
  readonly screenId: string;
  readonly ownerPath: string;
};

export const dshPartnerRoutes = [
  { routeId: 'dsh-partner-home', legacyRoute: 'home', screenId: 'partner.dsh.home.dashboard', ownerPath: 'dsh/frontend/app-partner/screens/PartnerHubScreen.tsx' },
  { routeId: 'dsh-partner-entry', legacyRoute: 'entry', screenId: 'partner.dsh.entry.status', ownerPath: 'dsh/frontend/app-partner/screens/PartnerEntryScreen.tsx' },
  { routeId: 'dsh-partner-store-profile', legacyRoute: 'home', screenId: 'partner.dsh.store.profile', ownerPath: 'dsh/frontend/app-partner/screens/StoreProfileScreen.tsx' },
  { routeId: 'dsh-partner-operations', legacyRoute: 'home', screenId: 'partner.dsh.operations.control', ownerPath: 'dsh/frontend/app-partner/screens/PartnerHubScreen.tsx' },
  { routeId: 'dsh-partner-orders', legacyRoute: 'inbox', screenId: 'partner.dsh.orders.inbox', ownerPath: 'dsh/frontend/app-partner/screens/OrdersInboxScreen.tsx' },
  { routeId: 'dsh-partner-order-issue', legacyRoute: 'support-screen', screenId: 'partner.dsh.order.issue', ownerPath: 'dsh/frontend/app-partner/screens/OperationScreens.tsx' },
  { routeId: 'dsh-partner-inventory', legacyRoute: 'inventory-management', screenId: 'partner.dsh.inventory.catalog', ownerPath: 'dsh/frontend/app-partner/screens/InventoryCatalogScreen.tsx' },
  { routeId: 'dsh-partner-promotions', legacyRoute: 'home', screenId: 'partner.dsh.promotions.intent', ownerPath: 'dsh/frontend/app-partner/screens/PromotionsScreen.tsx' },
  { routeId: 'dsh-partner-notifications', legacyRoute: 'bell', screenId: 'partner.dsh.notifications.list', ownerPath: 'dsh/frontend/app-partner/screens/OperationScreens.tsx' },
  { routeId: 'dsh-partner-settings', legacyRoute: 'home', screenId: 'partner.dsh.settings.preferences', ownerPath: 'dsh/frontend/app-partner/screens/PartnerHubScreen.tsx' },
  { routeId: 'dsh-partner-support', legacyRoute: 'support-directory', screenId: 'partner.dsh.support.center', ownerPath: 'dsh/frontend/app-partner/screens/PartnerSupportScreen.tsx' },
  { routeId: 'dsh-partner-order-rejection', legacyRoute: 'order-rejection', screenId: 'partner.dsh.order.rejection', ownerPath: 'dsh/frontend/app-partner/screens/DshPartnerOrderRejectionScreen.tsx' },
  // J-002 / DSH-SLICE-002A — Product Identity
  { routeId: 'dsh-partner-product-edit', legacyRoute: 'inventory-management', screenId: 'partner.dsh.product.edit', ownerPath: 'dsh/frontend/app-partner/screens/ProductEditScreen.tsx' },
  // J-002 / DSH-SLICE-002B — Category Structure
  { routeId: 'dsh-partner-category-management', legacyRoute: 'category-management', screenId: 'partner.dsh.category.management', ownerPath: 'dsh/frontend/app-partner/screens/CategoryManagementScreen.tsx' },
  // J-002 / DSH-SLICE-002C — Product Media
  { routeId: 'dsh-partner-product-media', legacyRoute: 'product-media', screenId: 'partner.dsh.product.media', ownerPath: 'dsh/frontend/app-partner/screens/ProductMediaScreen.tsx' },
  // J-002 / DSH-SLICE-002D — Partner Local Overrides
  { routeId: 'dsh-partner-product-overrides', legacyRoute: 'product-overrides', screenId: 'partner.dsh.product.overrides', ownerPath: 'dsh/frontend/app-partner/screens/ProductOverridesScreen.tsx' },
] as const satisfies readonly DshPartnerRouteRecord[];
