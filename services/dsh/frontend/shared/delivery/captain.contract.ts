// Canonical location: dsh/frontend/shared/delivery/captain/captain.contract.ts
// Authority: dsh/frontend/shared/delivery/captain — shared captain delivery contracts/runtime.

import type { DshCaptainOrderAction, DshCaptainOrderId, DshCaptainOrderMode, DshCaptainOrderProofStatus, DshCaptainOrderStage } from '../orders/orders.contract';
import type { DshOnDemandPolicy } from '../runtime/dsh-flow-registry';
import { getDshFlowById } from '../runtime/dsh-flow-registry';

export type CaptainServiceType = 'dsh' | 'amn';
export type CaptainAvailabilityStatus = 'available' | 'unavailable' | 'break' | 'planned-leave';
export type CaptainGpsStatus = 'ready' | 'limited' | 'offline' | 'disabled';
export type CaptainAppMode = 'bthwani_captain_mode' | 'store_courier_mode';

export type CaptainSupportRoute =
  | 'chat-read-ack'
  | 'chat-send'
  | 'cod-liability'
  | 'order-accept'
  | 'order-deliver'
  | 'order-details'
  | 'order-get'
  | 'order-pickup'
  | 'orders-list'
  | 'orders-offers-list'
  | 'profile-get'
  | 'proof-upload'
  | 'tier-evaluate'
  | 'tier-info';

export type CompactOrderChatMessage = {
  id: string;
  sender: string;
  text: string;
  time: string;
  side: 'start' | 'end';
};

export type CaptainAvailabilityMeta = {
  label: string;
  description: string;
  chipTone: 'success' | 'warning' | 'default';
  orderBadgeLabel: string;
};

export type CaptainGpsStatusMeta = {
  label: string;
  description: string;
  chipTone: 'success' | 'warning' | 'default';
};

export const availabilityStatusMeta: Record<CaptainAvailabilityStatus, CaptainAvailabilityMeta> = {
  available: {
    label: 'متاح',
    description: 'جاهز الآن لاستقبال الطلبات والتنقل مباشرة إلى مناطق الطلب.',
    chipTone: 'success',
    orderBadgeLabel: 'نشط',
  },
  unavailable: {
    label: 'غير متاح',
    description: 'تم إيقاف استقبال الطلبات مؤقتًا حتى إعادة التفعيل.',
    chipTone: 'warning',
    orderBadgeLabel: 'موقوف',
  },
  break: {
    label: 'استراحة',
    description: 'استراحة قصيرة — استئناف الاستقبال عند التفعيل.',
    chipTone: 'warning',
    orderBadgeLabel: 'استراحة',
  },
  'planned-leave': {
    label: 'إجازة مخططة',
    description: 'إدارة الإجازات مرتبطة بعمليات الأسطول.',
    chipTone: 'default',
    orderBadgeLabel: 'إجازة',
  },
};

export const gpsStatusMeta: Record<CaptainGpsStatus, CaptainGpsStatusMeta> = {
  ready: {
    label: 'GPS جاهز',
    description: 'إشارة الموقع مستقرة ويمكن عرض الخريطة بثقة.',
    chipTone: 'success',
  },
  limited: {
    label: 'GPS محدود',
    description: 'الإشارة متاحة جزئيًا — دقة الموقع منخفضة.',
    chipTone: 'warning',
  },
  offline: {
    label: 'GPS دون اتصال',
    description: 'تعذر تحديث الموقع الآن. لا تحديثات موقع حتى تعود الإشارة.',
    chipTone: 'warning',
  },
  disabled: {
    label: 'GPS معطل',
    description: 'الموقع مغلق من الجهاز ويحتاج تفعيل الإذن من إعدادات الهاتف قبل استخدام الخريطة.',
    chipTone: 'default',
  },
};

export type MapHeatZone = {
  id: string;
  size: number;
  color: string;
  label: string;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

export function getCaptainAvailabilityMeta(status: CaptainAvailabilityStatus): CaptainAvailabilityMeta {
  return availabilityStatusMeta[status];
}

function getCaptainGpsStatusMeta(status: CaptainGpsStatus): CaptainGpsStatusMeta {
  return gpsStatusMeta[status];
}

// ─── Routing Contracts (Moved from contracts/captain/dsh-captain-routes.ts) ───

export type DshCaptainRoute =
  | 'home'
  | 'account'
  | 'account-profile'
  | 'account-finance'
  | 'account-orders'
  | 'account-docs'
  | 'account-shifts'
  | 'account-support'
  | 'entry'
  | 'inbox'
  | 'detail'
  | 'orderchat'
  | 'bell'
  | 'support-directory'
  | 'support-screen'
  | 'store-pickup-context'
  | 'pickup-dropoff'
  | 'pod-submission'
  | 'map';

export type DshCaptainCommandTarget =
  | 'home'
  | 'entry'
  | 'inbox'
  | 'detail'
  | 'orderchat'
  | 'bell'
  | 'support-directory'
  | 'account-orders'
  | 'pickup-dropoff'
  | 'pod-submission';

export type DshCaptainRouteId =
  | 'dsh-captain-home'
  | 'dsh-captain-account'
  | 'dsh-captain-account-profile'
  | 'dsh-captain-account-finance'
  | 'dsh-captain-account-orders'
  | 'dsh-captain-account-docs'
  | 'dsh-captain-account-shifts'
  | 'dsh-captain-account-support'
  | 'dsh-captain-entry'
  | 'dsh-captain-inbox'
  | 'dsh-captain-detail'
  | 'dsh-captain-order-chat'
  | 'dsh-captain-bell'
  | 'dsh-captain-support-directory'
  | 'dsh-captain-support-screen'
  | 'dsh-captain-pickup-dropoff'
  | 'dsh-captain-pod-submission'
  | 'dsh-captain-map';

export type DshCaptainLegacyRoute = DshCaptainRoute;

export type DshCaptainRouteRecord = {
  readonly routeId: DshCaptainRouteId;
  readonly legacyRoute: DshCaptainLegacyRoute;
  readonly screenId: string;
  readonly ownerPath: string;
};

const dshCaptainRoutes = [
  { routeId: 'dsh-captain-home',             legacyRoute: 'home',             screenId: 'captain.dsh.home.dashboard',       ownerPath: 'dsh/frontend/app-captain/DshCaptainSurface.tsx' },
  { routeId: 'dsh-captain-account',          legacyRoute: 'account',          screenId: 'captain.dsh.account.root',         ownerPath: 'dsh/frontend/app-captain/DshCaptainSurface.tsx' },
  { routeId: 'dsh-captain-account-profile',  legacyRoute: 'account-profile',  screenId: 'captain.dsh.account.profile',      ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainProfileScreen.tsx' },
  { routeId: 'dsh-captain-account-finance',  legacyRoute: 'account-finance',  screenId: 'captain.dsh.account.finance',      ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainFinanceScreen.tsx' },
  { routeId: 'dsh-captain-account-orders',   legacyRoute: 'account-orders',   screenId: 'captain.dsh.account.orders',       ownerPath: 'dsh/frontend/app-captain/DshCaptainSurface.tsx' },
  { routeId: 'dsh-captain-account-docs',     legacyRoute: 'account-docs',     screenId: 'captain.dsh.account.docs',         ownerPath: 'dsh/frontend/app-captain/DshCaptainSurface.tsx' },
  { routeId: 'dsh-captain-account-shifts',   legacyRoute: 'account-shifts',   screenId: 'captain.dsh.account.shifts',       ownerPath: 'dsh/frontend/app-captain/DshCaptainSurface.tsx' },
  { routeId: 'dsh-captain-account-support',  legacyRoute: 'account-support',  screenId: 'captain.dsh.account.support',      ownerPath: 'dsh/frontend/app-captain/DshCaptainSurface.tsx' },
  { routeId: 'dsh-captain-entry',            legacyRoute: 'entry',            screenId: 'captain.dsh.entry',                ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainEntryScreen.tsx' },
  { routeId: 'dsh-captain-inbox',            legacyRoute: 'inbox',            screenId: 'captain.dsh.orders.inbox',         ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainOrdersScreen.tsx' },
  { routeId: 'dsh-captain-detail',           legacyRoute: 'detail',           screenId: 'captain.dsh.orders.detail',        ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainOrdersScreen.tsx' },
  { routeId: 'dsh-captain-order-chat',       legacyRoute: 'orderchat',        screenId: 'captain.dsh.orders.chat',          ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainOrdersScreen.tsx' },
  { routeId: 'dsh-captain-bell',             legacyRoute: 'bell',             screenId: 'captain.dsh.orders.bell',          ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainOrdersScreen.tsx' },
  { routeId: 'dsh-captain-support-directory',legacyRoute: 'support-directory',screenId: 'captain.dsh.support.directory',    ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainOperationsScreen.tsx' },
  { routeId: 'dsh-captain-support-screen',   legacyRoute: 'support-screen',   screenId: 'captain.dsh.support.workspace',    ownerPath: 'dsh/frontend/app-captain/DshCaptainSurface.tsx' },
  { routeId: 'dsh-captain-pickup-dropoff',   legacyRoute: 'pickup-dropoff',   screenId: 'captain.dsh.orders.pickup-dropoff',ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainPickupDropoffScreen.tsx' },
  { routeId: 'dsh-captain-pod-submission',   legacyRoute: 'pod-submission',   screenId: 'captain.dsh.orders.pod-submission',ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainPoDSubmissionScreen.tsx' },
  { routeId: 'dsh-captain-map',              legacyRoute: 'map',              screenId: 'captain.dsh.orders.map',           ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainMapScreen.tsx' },
] as const satisfies readonly DshCaptainRouteRecord[];

// ─── Surface Bindings (Moved from contracts/captain/dsh-captain-binding.contracts.ts) ───

type DshCaptainOrderSnapshot = {
  id: DshCaptainOrderId;
  mode: DshCaptainOrderMode;
  stage: DshCaptainOrderStage;
  pickupLabel: string;
  dropoffLabel: string;
  etaLabel: string;
};

type DshCaptainOrderActionPayload = {
  orderId: DshCaptainOrderId;
  action: DshCaptainOrderAction;
  note?: string;
};

type DshCaptainProofPayload = {
  orderId: DshCaptainOrderId;
  status: DshCaptainOrderProofStatus;
  attachmentLabel?: string;
};

type DshCaptainFinanceSnapshot = {
  codBalanceLabel: string;
  earningsLabel: string;
  settlementLabel: string;
};

export type DshCaptainProfileSnapshot = {
  displayName: string;
  tierLabel: string;
  readinessLabel: string;
};

type DshCaptainOperationsSnapshot = {
  availabilityLabel: string;
  routeReadinessLabel: string;
  safetyLabel: string;
};

export const DSH_CAPTAIN_REGISTRY_FLOW_IDS = [
  'captain-order-pickup',
  'captain-proof-of-delivery',
  'captain-map-navigation',
] as const;
export type DshCaptainRegistryFlowId = (typeof DSH_CAPTAIN_REGISTRY_FLOW_IDS)[number];

export function getDshCaptainFlowPolicy(flowId: DshCaptainRegistryFlowId): DshOnDemandPolicy | undefined {
  return getDshFlowById(flowId)?.onDemandPolicy;
}

// ─── Screen Registry (Moved from contracts/captain/dsh-captain-screen-registry.ts) ───

export type DshCaptainRegistryRouteId = DshCaptainRouteId | 'wlt-dsh-captain-finance-bridge';

export type DshCaptainScreenState =
  | 'loading' | 'empty' | 'error' | 'success' | 'offline' | 'disabled' | 'retry' | 'blocked';

export type DshCaptainScreenRegistryStatus =
  | 'READY_FOR_REVIEW' | 'VERIFIED' | 'DEPRECATED';

export type DshCaptainScreenRegistryItem = {
  readonly screenId: string;
  readonly routeId: DshCaptainRegistryRouteId;
  readonly surfaceId: 'app-captain';
  readonly ownerKind: 'app' | 'service' | 'integration';
  readonly ownerId: 'app-captain' | 'dsh' | 'wlt.dsh';
  readonly serviceId?: 'dsh' | 'wlt';
  readonly linkedServiceId?: 'dsh' | 'wlt';
  readonly ownerPath: string;
  readonly componentName: string;
  readonly screenKind: 'TAB_ROOT' | 'SCREEN_ENTRY' | 'FLOW_STEP' | 'MODAL' | 'SHEET';
  readonly flowId?: string;
  readonly requiredStates: readonly DshCaptainScreenState[];
  readonly requiredPermissions?: readonly ('location' | 'notifications' | 'camera' | 'mediaLibrary')[];
  readonly analytics: { readonly screenView: string };
  readonly deepLinkPath?: string;
  readonly fallbackRouteId?: DshCaptainRouteId;
  readonly releaseCriticality: 'P0' | 'P1' | 'P2';
  readonly status: DshCaptainScreenRegistryStatus;
};

const dshCaptainScreenRegistry = [
  { screenId: 'captain.dsh.home.dashboard',       routeId: 'dsh-captain-home',             surfaceId: 'app-captain', ownerKind: 'app',         ownerId: 'app-captain', serviceId: 'dsh',             ownerPath: 'dsh/frontend/app-captain/DshCaptainSurface.tsx',                    componentName: 'DshCaptainSurface',              screenKind: 'TAB_ROOT',     flowId: 'captain.dsh.home',          requiredStates: ['success', 'offline'],                        analytics: { screenView: 'captain_dsh_home_dashboard_view' },   deepLinkPath: '/captain/dsh',      fallbackRouteId: 'dsh-captain-home',             releaseCriticality: 'P1', status: 'VERIFIED' },
  { screenId: 'captain.dsh.entry',                routeId: 'dsh-captain-entry',            surfaceId: 'app-captain', ownerKind: 'service',     ownerId: 'dsh',         serviceId: 'dsh',             ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainEntryScreen.tsx',        componentName: 'DshEntryScreen',                 screenKind: 'SCREEN_ENTRY', flowId: 'captain.dsh.entry',         requiredStates: ['loading', 'empty', 'error', 'success'],     analytics: { screenView: 'captain_dsh_entry_view' },                                fallbackRouteId: 'dsh-captain-home',             releaseCriticality: 'P1', status: 'VERIFIED' },
  { screenId: 'captain.dsh.orders.inbox',         routeId: 'dsh-captain-inbox',            surfaceId: 'app-captain', ownerKind: 'service',     ownerId: 'dsh',         serviceId: 'dsh',             ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainOrdersScreen.tsx',       componentName: 'CaptainOrdersInboxScreen',       screenKind: 'SCREEN_ENTRY', flowId: 'captain.dsh.orders',        requiredStates: ['loading', 'empty', 'error', 'success'],     analytics: { screenView: 'captain_dsh_orders_inbox_view' },                         fallbackRouteId: 'dsh-captain-entry',            releaseCriticality: 'P0', status: 'VERIFIED' },
  { screenId: 'captain.dsh.orders.detail',        routeId: 'dsh-captain-detail',           surfaceId: 'app-captain', ownerKind: 'service',     ownerId: 'dsh',         serviceId: 'dsh',             ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainOrdersScreen.tsx',       componentName: 'CaptainOrderDetailScreen',       screenKind: 'FLOW_STEP',    flowId: 'captain.dsh.orders',        requiredStates: ['error', 'success', 'retry'],                analytics: { screenView: 'captain_dsh_order_detail_view' },                         fallbackRouteId: 'dsh-captain-inbox',            releaseCriticality: 'P0', status: 'VERIFIED' },
  { screenId: 'captain.dsh.orders.chat',          routeId: 'dsh-captain-order-chat',       surfaceId: 'app-captain', ownerKind: 'service',     ownerId: 'dsh',         serviceId: 'dsh',             ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainOrdersScreen.tsx',       componentName: 'DshCaptainOrderChatScreen',      screenKind: 'FLOW_STEP',    flowId: 'captain.dsh.orders.chat',   requiredStates: ['error', 'success', 'retry'],                analytics: { screenView: 'captain_dsh_order_chat_view' },                           fallbackRouteId: 'dsh-captain-detail',           releaseCriticality: 'P1', status: 'VERIFIED' },
  { screenId: 'captain.dsh.orders.bell',          routeId: 'dsh-captain-bell',             surfaceId: 'app-captain', ownerKind: 'service',     ownerId: 'dsh',         serviceId: 'dsh',             ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainOrdersScreen.tsx',       componentName: 'DshCaptainBellScreen',           screenKind: 'MODAL',        flowId: 'captain.dsh.orders',        requiredStates: ['loading', 'empty', 'error', 'success'],     analytics: { screenView: 'captain_dsh_bell_view' },                                 fallbackRouteId: 'dsh-captain-inbox',            releaseCriticality: 'P1', status: 'VERIFIED' },
  { screenId: 'captain.dsh.support.directory',    routeId: 'dsh-captain-support-directory',surfaceId: 'app-captain', ownerKind: 'service',     ownerId: 'dsh',         serviceId: 'dsh',             ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainOperationsScreen.tsx',   componentName: 'DshCaptainSupportDirectoryScreen',screenKind: 'FLOW_STEP',   flowId: 'captain.dsh.operations',    requiredStates: ['error', 'success', 'retry'],                analytics: { screenView: 'captain_dsh_support_directory_view' },                    fallbackRouteId: 'dsh-captain-home',             releaseCriticality: 'P1', status: 'VERIFIED' },
  { screenId: 'captain.dsh.support.workspace',    routeId: 'dsh-captain-support-screen',   surfaceId: 'app-captain', ownerKind: 'service',     ownerId: 'dsh',         serviceId: 'dsh',             ownerPath: 'dsh/frontend/app-captain/DshCaptainSurface.tsx',                    componentName: 'DshCaptainSurface',              screenKind: 'FLOW_STEP',    flowId: 'captain.dsh.operations',    requiredStates: ['error', 'success', 'retry'],                analytics: { screenView: 'captain_dsh_support_workspace_view' },                    fallbackRouteId: 'dsh-captain-support-directory',releaseCriticality: 'P1', status: 'VERIFIED' },
  { screenId: 'captain.dsh.account.root',         routeId: 'dsh-captain-account',          surfaceId: 'app-captain', ownerKind: 'app',         ownerId: 'app-captain', serviceId: 'dsh',             ownerPath: 'dsh/frontend/app-captain/DshCaptainSurface.tsx',                    componentName: 'DshCaptainSurface',              screenKind: 'TAB_ROOT',     flowId: 'captain.dsh.account',       requiredStates: ['success'],                                  analytics: { screenView: 'captain_dsh_account_root_view' },                         fallbackRouteId: 'dsh-captain-home',             releaseCriticality: 'P2', status: 'VERIFIED' },
  { screenId: 'captain.dsh.account.profile',      routeId: 'dsh-captain-account-profile',  surfaceId: 'app-captain', ownerKind: 'service',     ownerId: 'dsh',         serviceId: 'dsh',             ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainProfileScreen.tsx',      componentName: 'DshCaptainProfileGetScreen',     screenKind: 'FLOW_STEP',    flowId: 'captain.dsh.account',       requiredStates: ['loading', 'empty', 'error', 'success'],     analytics: { screenView: 'captain_dsh_account_profile_view' },                      fallbackRouteId: 'dsh-captain-account',          releaseCriticality: 'P2', status: 'VERIFIED' },
  { screenId: 'captain.dsh.account.finance',      routeId: 'dsh-captain-account-finance',  surfaceId: 'app-captain', ownerKind: 'integration', ownerId: 'wlt.dsh',     serviceId: 'wlt', linkedServiceId: 'dsh', ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainFinanceScreen.tsx',      componentName: 'DshCaptainCodBalanceScreen',     screenKind: 'FLOW_STEP',    flowId: 'captain.dsh.account',       requiredStates: ['loading', 'empty', 'error', 'success'],     analytics: { screenView: 'captain_dsh_account_finance_view' },                      fallbackRouteId: 'dsh-captain-account',          releaseCriticality: 'P2', status: 'VERIFIED' },
  { screenId: 'captain.dsh.account.orders',       routeId: 'dsh-captain-account-orders',   surfaceId: 'app-captain', ownerKind: 'service',     ownerId: 'dsh',         serviceId: 'dsh',             ownerPath: 'dsh/frontend/app-captain/DshCaptainSurface.tsx',                    componentName: 'DshCaptainSurface',              screenKind: 'FLOW_STEP',    flowId: 'captain.dsh.account',       requiredStates: ['success'],                                  analytics: { screenView: 'captain_dsh_account_orders_view' },                       fallbackRouteId: 'dsh-captain-account',          releaseCriticality: 'P1', status: 'VERIFIED' },
  { screenId: 'captain.dsh.account.docs',         routeId: 'dsh-captain-account-docs',     surfaceId: 'app-captain', ownerKind: 'app',         ownerId: 'app-captain', serviceId: 'dsh',             ownerPath: 'dsh/frontend/app-captain/DshCaptainSurface.tsx',                    componentName: 'DshCaptainSurface',              screenKind: 'FLOW_STEP',    flowId: 'captain.dsh.account',       requiredStates: ['success'],                                  analytics: { screenView: 'captain_dsh_account_docs_view' },                         fallbackRouteId: 'dsh-captain-account',          releaseCriticality: 'P2', status: 'VERIFIED' },
  { screenId: 'captain.dsh.account.shifts',       routeId: 'dsh-captain-account-shifts',   surfaceId: 'app-captain', ownerKind: 'app',         ownerId: 'app-captain', serviceId: 'dsh',             ownerPath: 'dsh/frontend/app-captain/DshCaptainSurface.tsx',                    componentName: 'DshCaptainSurface',              screenKind: 'FLOW_STEP',    flowId: 'captain.dsh.account',       requiredStates: ['success'],                                  analytics: { screenView: 'captain_dsh_account_shifts_view' },                       fallbackRouteId: 'dsh-captain-account',          releaseCriticality: 'P2', status: 'VERIFIED' },
  { screenId: 'captain.dsh.account.support',      routeId: 'dsh-captain-account-support',  surfaceId: 'app-captain', ownerKind: 'app',         ownerId: 'app-captain', serviceId: 'dsh',             ownerPath: 'dsh/frontend/app-captain/DshCaptainSurface.tsx',                    componentName: 'DshCaptainSurface',              screenKind: 'FLOW_STEP',    flowId: 'captain.dsh.account',       requiredStates: ['success'],                                  analytics: { screenView: 'captain_dsh_account_support_view' },                      fallbackRouteId: 'dsh-captain-account',          releaseCriticality: 'P2', status: 'VERIFIED' },
  { screenId: 'captain.wlt.dsh.finance.bridge',   routeId: 'wlt-dsh-captain-finance-bridge',surfaceId: 'app-captain',ownerKind: 'integration', ownerId: 'wlt.dsh',     serviceId: 'wlt', linkedServiceId: 'dsh', ownerPath: 'wlt/frontend/dsh/app-captain/WltDshCaptainBridge.tsx',            componentName: 'WltDshCaptainBridge',            screenKind: 'FLOW_STEP',    flowId: 'captain.dsh.finance',       requiredStates: ['loading', 'empty', 'error', 'success', 'offline', 'blocked'], analytics: { screenView: 'captain_wlt_dsh_finance_bridge_view' },               fallbackRouteId: 'dsh-captain-account-finance',  releaseCriticality: 'P0', status: 'VERIFIED' },
  { screenId: 'captain.dsh.orders.pickup-dropoff',routeId: 'dsh-captain-pickup-dropoff',   surfaceId: 'app-captain', ownerKind: 'app',         ownerId: 'app-captain', serviceId: 'dsh',             ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainPickupDropoffScreen.tsx',componentName: 'DshCaptainPickupDropoffScreen',  screenKind: 'FLOW_STEP',    flowId: 'captain.dsh.orders',        requiredStates: ['success'],                                  analytics: { screenView: 'captain_dsh_orders_pickup_dropoff_view' },                fallbackRouteId: 'dsh-captain-inbox',            releaseCriticality: 'P1', status: 'READY_FOR_REVIEW' },
  { screenId: 'captain.dsh.orders.pod-submission',routeId: 'dsh-captain-pod-submission',   surfaceId: 'app-captain', ownerKind: 'app',         ownerId: 'app-captain', serviceId: 'dsh',             ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainPoDSubmissionScreen.tsx',componentName: 'DshCaptainPoDSubmissionScreen',  screenKind: 'FLOW_STEP',    flowId: 'captain.dsh.orders',        requiredStates: ['loading', 'success', 'error', 'retry'],     analytics: { screenView: 'captain_dsh_orders_pod_submission_view' },                fallbackRouteId: 'dsh-captain-inbox',            releaseCriticality: 'P1', status: 'READY_FOR_REVIEW' },
  { screenId: 'captain.dsh.orders.map',           routeId: 'dsh-captain-map',              surfaceId: 'app-captain', ownerKind: 'service',     ownerId: 'dsh',         serviceId: 'dsh',             ownerPath: 'dsh/frontend/app-captain/screens/DshCaptainMapScreen.tsx',          componentName: 'DshCaptainMapScreen',            screenKind: 'FLOW_STEP',    flowId: 'captain.dsh.orders',        requiredStates: ['loading', 'success', 'error'],              analytics: { screenView: 'captain_dsh_orders_map_view' },       deepLinkPath: '/captain/dsh/orders/map', fallbackRouteId: 'dsh-captain-pickup-dropoff',   releaseCriticality: 'P0', status: 'READY_FOR_REVIEW', requiredPermissions: ['location'] },
] as const satisfies readonly DshCaptainScreenRegistryItem[];
