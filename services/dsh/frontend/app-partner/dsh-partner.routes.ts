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
  | 'dsh-partner-product-edit'
  | 'dsh-partner-category-management'
  | 'dsh-partner-product-media'
  | 'dsh-partner-product-overrides';

export type DshPartnerLegacyRoute = DshPartnerRoute;

export type DshPartnerRouteRecord = {
  readonly routeId: DshPartnerRouteId;
  readonly legacyRoute: DshPartnerLegacyRoute;
  readonly screenId: string;
  readonly ownerPath: string;
};

export const dshPartnerRoutes = [
  { routeId: 'dsh-partner-home', legacyRoute: 'home', screenId: 'partner.dsh.home.dashboard', ownerPath: 'dsh/frontend/app-partner/account/PartnerHubScreen.tsx' },
  { routeId: 'dsh-partner-entry', legacyRoute: 'entry', screenId: 'partner.dsh.entry.status', ownerPath: 'dsh/frontend/app-partner/account/PartnerEntryScreen.tsx' },
  { routeId: 'dsh-partner-store-profile', legacyRoute: 'home', screenId: 'partner.dsh.store.profile', ownerPath: 'dsh/frontend/app-partner/store/StoreProfileScreen.tsx' },
  { routeId: 'dsh-partner-operations', legacyRoute: 'home', screenId: 'partner.dsh.operations.control', ownerPath: 'dsh/frontend/app-partner/account/PartnerHubScreen.tsx' },
  { routeId: 'dsh-partner-orders', legacyRoute: 'inbox', screenId: 'partner.dsh.orders.inbox', ownerPath: 'dsh/frontend/app-partner/orders/OrdersInboxScreen.tsx' },
  { routeId: 'dsh-partner-order-issue', legacyRoute: 'support-screen', screenId: 'partner.dsh.order.issue', ownerPath: 'dsh/frontend/app-partner/account/OperationScreens.tsx' },
  { routeId: 'dsh-partner-inventory', legacyRoute: 'inventory-management', screenId: 'partner.dsh.inventory.catalog', ownerPath: 'dsh/frontend/app-partner/Catalog/InventoryCatalogScreen.tsx' },
  { routeId: 'dsh-partner-promotions', legacyRoute: 'home', screenId: 'partner.dsh.promotions.intent', ownerPath: 'dsh/frontend/app-partner/account/PromotionsScreen.tsx' },
  { routeId: 'dsh-partner-notifications', legacyRoute: 'bell', screenId: 'partner.dsh.notifications.list', ownerPath: 'dsh/frontend/app-partner/account/OperationScreens.tsx' },
  { routeId: 'dsh-partner-settings', legacyRoute: 'home', screenId: 'partner.dsh.settings.preferences', ownerPath: 'dsh/frontend/app-partner/account/PartnerHubScreen.tsx' },
  { routeId: 'dsh-partner-support', legacyRoute: 'support-directory', screenId: 'partner.dsh.support.center', ownerPath: 'dsh/frontend/app-partner/account/PartnerSupportScreen.tsx' },
  { routeId: 'dsh-partner-order-rejection', legacyRoute: 'order-rejection', screenId: 'partner.dsh.order.rejection', ownerPath: 'dsh/frontend/app-partner/orders/DshPartnerOrderRejectionScreen.tsx' },
  { routeId: 'dsh-partner-product-edit', legacyRoute: 'inventory-management', screenId: 'partner.dsh.product.edit', ownerPath: 'dsh/frontend/app-partner/Catalog/ProductEditScreen.tsx' },
  { routeId: 'dsh-partner-category-management', legacyRoute: 'category-management', screenId: 'partner.dsh.category.management', ownerPath: 'dsh/frontend/app-partner/Catalog/CategoryManagementScreen.tsx' },
  { routeId: 'dsh-partner-product-media', legacyRoute: 'product-media', screenId: 'partner.dsh.product.media', ownerPath: 'dsh/frontend/app-partner/Catalog/ProductMediaScreen.tsx' },
  { routeId: 'dsh-partner-product-overrides', legacyRoute: 'product-overrides', screenId: 'partner.dsh.product.overrides', ownerPath: 'dsh/frontend/app-partner/Catalog/ProductOverridesScreen.tsx' },
] as const satisfies readonly DshPartnerRouteRecord[];
