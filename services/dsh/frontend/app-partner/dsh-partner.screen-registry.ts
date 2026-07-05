import type { DshPartnerRouteId } from './dsh-partner.routes';
import type { DshPartnerSurfaceId } from './dsh-partner.types';

export type DshPartnerRegistryRouteId = DshPartnerRouteId | Extract<DshPartnerSurfaceId, 'wallet-bridge'>;

export type DshPartnerScreenRegistryItem = {
  readonly screenId: string;
  readonly routeId: DshPartnerRegistryRouteId;
  readonly surfaceId: 'app-partner';
  readonly ownerKind: 'app' | 'service' | 'integration';
  readonly ownerId: 'app-partner' | 'dsh' | 'wlt.dsh';
  readonly serviceId: 'dsh' | 'wlt';
  readonly linkedServiceId?: 'dsh' | 'wlt';
  readonly ownerPath: string;
  readonly componentName: string;
  readonly screenKind: 'TAB_ROOT' | 'SCREEN_ENTRY' | 'FLOW_STEP' | 'MODAL' | 'SHEET';
  readonly flowId?: string;
  readonly requiredStates: readonly DshPartnerScreenState[];
  readonly analytics: { readonly screenView: string; readonly primaryEvents?: readonly string[] };
  readonly fallbackRouteId?: DshPartnerRouteId;
  readonly releaseCriticality: 'P0' | 'P1' | 'P2';
  readonly status: DshPartnerScreenRegistryStatus;
};

export type DshPartnerScreenState =
  | 'loading'
  | 'empty'
  | 'error'
  | 'success'
  | 'offline'
  | 'disabled'
  | 'retry'
  | 'blocked';

export type DshPartnerScreenRegistryStatus =
  | 'READY_FOR_REVIEW'
  | 'VERIFIED'
  | 'DEPRECATED';

const baseStates = ['loading', 'empty', 'error', 'success', 'offline'] as const satisfies readonly DshPartnerScreenState[];
const blockedStates = ['loading', 'empty', 'error', 'success', 'offline', 'blocked'] as const satisfies readonly DshPartnerScreenState[];
const retryStates = ['loading', 'empty', 'error', 'success', 'offline', 'retry'] as const satisfies readonly DshPartnerScreenState[];

export const dshPartnerScreenRegistry = [
  {
    screenId: 'partner.dsh.home.dashboard',
    routeId: 'dsh-partner-home',
    surfaceId: 'app-partner',
    ownerKind: 'service',
    ownerId: 'dsh',
    serviceId: 'dsh',
    ownerPath: 'dsh/frontend/app-partner/account/PartnerHubScreen.tsx',
    componentName: 'PartnerHomeScreen',
    screenKind: 'TAB_ROOT',
    flowId: 'dsh.partner.dashboard',
    requiredStates: baseStates,
    analytics: { screenView: 'partner_dsh_home_dashboard_view' },
    fallbackRouteId: 'dsh-partner-home',
    releaseCriticality: 'P0',
    status: 'VERIFIED',
  },
  {
    screenId: 'partner.dsh.entry.status',
    routeId: 'dsh-partner-entry',
    surfaceId: 'app-partner',
    ownerKind: 'service',
    ownerId: 'dsh',
    serviceId: 'dsh',
    ownerPath: 'dsh/frontend/app-partner/account/PartnerEntryScreen.tsx',
    componentName: 'PartnerEntryScreen',
    screenKind: 'SCREEN_ENTRY',
    flowId: 'dsh.partner.entry',
    requiredStates: blockedStates,
    analytics: { screenView: 'partner_dsh_entry_status_view' },
    fallbackRouteId: 'dsh-partner-home',
    releaseCriticality: 'P0',
    status: 'VERIFIED',
  },
  {
    screenId: 'partner.dsh.store.profile',
    routeId: 'dsh-partner-store-profile',
    surfaceId: 'app-partner',
    ownerKind: 'service',
    ownerId: 'dsh',
    serviceId: 'dsh',
    ownerPath: 'dsh/frontend/app-partner/store/StoreProfileScreen.tsx',
    componentName: 'StoreProfileScreen',
    screenKind: 'SCREEN_ENTRY',
    flowId: 'dsh.partner.store-profile',
    requiredStates: baseStates,
    analytics: { screenView: 'partner_dsh_store_profile_view' },
    fallbackRouteId: 'dsh-partner-home',
    releaseCriticality: 'P1',
    status: 'VERIFIED',
  },
  {
    screenId: 'partner.dsh.operations.control',
    routeId: 'dsh-partner-operations',
    surfaceId: 'app-partner',
    ownerKind: 'service',
    ownerId: 'dsh',
    serviceId: 'dsh',
    ownerPath: 'dsh/frontend/app-partner/account/PartnerHubScreen.tsx',
    componentName: 'OperationsScreen',
    screenKind: 'SCREEN_ENTRY',
    flowId: 'dsh.partner.operations',
    requiredStates: blockedStates,
    analytics: { screenView: 'partner_dsh_operations_control_view' },
    fallbackRouteId: 'dsh-partner-home',
    releaseCriticality: 'P0',
    status: 'VERIFIED',
  },
  {
    screenId: 'partner.dsh.orders.inbox',
    routeId: 'dsh-partner-orders',
    surfaceId: 'app-partner',
    ownerKind: 'service',
    ownerId: 'dsh',
    serviceId: 'dsh',
    ownerPath: 'dsh/frontend/app-partner/orders/OrdersInboxScreen.tsx',
    componentName: 'OrdersInboxScreen',
    screenKind: 'SCREEN_ENTRY',
    flowId: 'dsh.partner.orders',
    requiredStates: retryStates,
    analytics: { screenView: 'partner_dsh_orders_inbox_view' },
    fallbackRouteId: 'dsh-partner-home',
    releaseCriticality: 'P0',
    status: 'VERIFIED',
  },
  {
    screenId: 'partner.dsh.order.detail',
    routeId: 'dsh-partner-orders',
    surfaceId: 'app-partner',
    ownerKind: 'service',
    ownerId: 'dsh',
    serviceId: 'dsh',
    ownerPath: 'dsh/frontend/app-partner/orders/OrdersInboxScreen.tsx',
    componentName: 'OrderDetailScreen',
    screenKind: 'SCREEN_ENTRY',
    flowId: 'dsh.partner.order-detail',
    requiredStates: retryStates,
    analytics: { screenView: 'partner_dsh_order_detail_view' },
    fallbackRouteId: 'dsh-partner-orders',
    releaseCriticality: 'P0',
    status: 'DEPRECATED',
  },
  {
    screenId: 'partner.dsh.order.issue',
    routeId: 'dsh-partner-order-issue',
    surfaceId: 'app-partner',
    ownerKind: 'service',
    ownerId: 'dsh',
    serviceId: 'dsh',
    ownerPath: 'dsh/frontend/app-partner/account/OperationScreens.tsx',
    componentName: 'OrderIssueScreen',
    screenKind: 'SCREEN_ENTRY',
    flowId: 'dsh.partner.order-issue',
    requiredStates: blockedStates,
    analytics: { screenView: 'partner_dsh_order_issue_view' },
    fallbackRouteId: 'dsh-partner-orders',
    releaseCriticality: 'P0',
    status: 'VERIFIED',
  },
  {
    screenId: 'partner.dsh.inventory.catalog',
    routeId: 'dsh-partner-inventory',
    surfaceId: 'app-partner',
    ownerKind: 'service',
    ownerId: 'dsh',
    serviceId: 'dsh',
    ownerPath: 'dsh/frontend/app-partner/Catalog/InventoryCatalogScreen.tsx',
    componentName: 'InventoryCatalogScreen',
    screenKind: 'SCREEN_ENTRY',
    flowId: 'dsh.partner.inventory',
    requiredStates: baseStates,
    analytics: { screenView: 'partner_dsh_inventory_catalog_view' },
    fallbackRouteId: 'dsh-partner-home',
    releaseCriticality: 'P0',
    status: 'VERIFIED',
  },
  {
    screenId: 'partner.dsh.promotions.intent',
    routeId: 'dsh-partner-promotions',
    surfaceId: 'app-partner',
    ownerKind: 'service',
    ownerId: 'dsh',
    serviceId: 'dsh',
    ownerPath: 'dsh/frontend/app-partner/account/PromotionsScreen.tsx',
    componentName: 'PromotionsScreen',
    screenKind: 'SCREEN_ENTRY',
    flowId: 'dsh.partner.promotions',
    requiredStates: baseStates,
    analytics: { screenView: 'partner_dsh_promotions_intent_view' },
    fallbackRouteId: 'dsh-partner-home',
    releaseCriticality: 'P1',
    status: 'VERIFIED',
  },
  {
    screenId: 'partner.dsh.notifications.list',
    routeId: 'dsh-partner-notifications',
    surfaceId: 'app-partner',
    ownerKind: 'service',
    ownerId: 'dsh',
    serviceId: 'dsh',
    ownerPath: 'dsh/frontend/app-partner/account/OperationScreens.tsx',
    componentName: 'NotificationsScreen',
    screenKind: 'SCREEN_ENTRY',
    flowId: 'dsh.partner.notifications',
    requiredStates: retryStates,
    analytics: { screenView: 'partner_dsh_notifications_list_view' },
    fallbackRouteId: 'dsh-partner-home',
    releaseCriticality: 'P1',
    status: 'VERIFIED',
  },
  {
    screenId: 'partner.dsh.settings.preferences',
    routeId: 'dsh-partner-settings',
    surfaceId: 'app-partner',
    ownerKind: 'service',
    ownerId: 'dsh',
    serviceId: 'dsh',
    ownerPath: 'dsh/frontend/app-partner/account/PartnerHubScreen.tsx',
    componentName: 'PartnerSettingsScreen',
    screenKind: 'SCREEN_ENTRY',
    flowId: 'dsh.partner.settings',
    requiredStates: baseStates,
    analytics: { screenView: 'partner_dsh_settings_preferences_view' },
    fallbackRouteId: 'dsh-partner-home',
    releaseCriticality: 'P1',
    status: 'VERIFIED',
  },
  {
    screenId: 'partner.dsh.support.center',
    routeId: 'dsh-partner-support',
    surfaceId: 'app-partner',
    ownerKind: 'service',
    ownerId: 'dsh',
    serviceId: 'dsh',
    ownerPath: 'dsh/frontend/app-partner/account/PartnerSupportScreen.tsx',
    componentName: 'PartnerSupportScreen',
    screenKind: 'SCREEN_ENTRY',
    flowId: 'dsh.partner.support',
    requiredStates: blockedStates,
    analytics: { screenView: 'partner_dsh_support_center_view' },
    fallbackRouteId: 'dsh-partner-home',
    releaseCriticality: 'P0',
    status: 'VERIFIED',
  },
  {
    screenId: 'partner.wlt.dsh.wallet.bridge',
    routeId: 'wallet-bridge',
    surfaceId: 'app-partner',
    ownerKind: 'integration',
    ownerId: 'wlt.dsh',
    serviceId: 'wlt',
    linkedServiceId: 'dsh',
    ownerPath: 'shared/finance-wlt-link/wlt/generated/wlt_frontend_dsh_app_partner.facade.ts',
    componentName: 'WltDshPartnerBridge',
    screenKind: 'FLOW_STEP',
    flowId: 'dsh.partner.finance',
    requiredStates: blockedStates,
    analytics: { screenView: 'partner_wlt_dsh_wallet_bridge_view' },
    fallbackRouteId: 'dsh-partner-home',
    releaseCriticality: 'P0',
    status: 'VERIFIED',
  },
  {
    screenId: 'partner.dsh.order.rejection',
    routeId: 'dsh-partner-order-rejection',
    surfaceId: 'app-partner',
    ownerKind: 'app',
    ownerId: 'app-partner',
    serviceId: 'dsh',
    ownerPath: 'dsh/frontend/app-partner/orders/DshPartnerOrderRejectionScreen.tsx',
    componentName: 'DshPartnerOrderRejectionScreen',
    screenKind: 'FLOW_STEP',
    flowId: 'dsh.partner.orders',
    requiredStates: ['loading', 'success', 'error'],
    analytics: { screenView: 'partner_dsh_order_rejection_view' },
    fallbackRouteId: 'dsh-partner-orders',
    releaseCriticality: 'P0',
    status: 'READY_FOR_REVIEW',
  },
] as const satisfies readonly DshPartnerScreenRegistryItem[];
