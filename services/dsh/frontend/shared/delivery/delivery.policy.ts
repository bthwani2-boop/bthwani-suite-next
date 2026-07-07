// Canonical location: dsh/frontend/shared/delivery/delivery.policy.ts
// Authority: dsh/frontend/shared/delivery — delivery route and handoff policies.

import type { DshCaptainRoute, DshCaptainCommandTarget } from './captain.contract';
import type { DshCaptainOrderStage } from '../orders/orders.contract';
import type { DshFulfillmentDeliveryMode } from './delivery.contract';

// ─── Captain lifecycle state ──────────────────────────────────────────────────

export type DshCaptainLifecycleState =
  | 'offline'
  | 'available'
  | 'offer_received'
  | 'accepted'
  | 'at_pickup'
  | 'picked_up'
  | 'near_customer'
  | 'at_door'
  | 'pod_pending'
  | 'pod_uploaded'
  | 'order_closed'
  | 'exception_active'
  | 'support_escalated'
  | 'store_courier';

// ─── Route mapping ─────────────────────────────────────────────────────────────

export type DshCaptainRouteMapping = {
  readonly lifecycleState: DshCaptainLifecycleState;
  readonly primaryRoute: DshCaptainRoute;
  readonly label: string;
  readonly canReceiveNewOffers: boolean;
  readonly isBlocked: boolean;
  readonly blockReason?: string;
};

export const DSH_CAPTAIN_ROUTE_MAP: readonly DshCaptainRouteMapping[] = [
  { lifecycleState: 'offline',           primaryRoute: 'home',           label: 'غير متصل — الصفحة الرئيسية',             canReceiveNewOffers: false, isBlocked: false },
  { lifecycleState: 'available',         primaryRoute: 'home',           label: 'متاح — ينتظر عروض الطلبات',              canReceiveNewOffers: true,  isBlocked: false },
  { lifecycleState: 'offer_received',    primaryRoute: 'bell',           label: 'عرض طلب جديد — شاشة الإشعار',           canReceiveNewOffers: false, isBlocked: false },
  { lifecycleState: 'accepted',          primaryRoute: 'detail',         label: 'قبل الطلب — في الطريق للاستلام',         canReceiveNewOffers: false, isBlocked: false },
  { lifecycleState: 'at_pickup',         primaryRoute: 'pickup-dropoff', label: 'وصل للمتجر — انتظار الاستلام',           canReceiveNewOffers: false, isBlocked: false },
  { lifecycleState: 'picked_up',         primaryRoute: 'pickup-dropoff', label: 'استلم الطلب — في الطريق للعميل',         canReceiveNewOffers: false, isBlocked: false },
  { lifecycleState: 'near_customer',     primaryRoute: 'pickup-dropoff', label: 'قريب من العميل',                         canReceiveNewOffers: false, isBlocked: false },
  { lifecycleState: 'at_door',           primaryRoute: 'pickup-dropoff', label: 'عند الباب — جاهز للتسليم',               canReceiveNewOffers: false, isBlocked: false },
  { lifecycleState: 'pod_pending',       primaryRoute: 'pod-submission', label: 'رفع إثبات التسليم',                      canReceiveNewOffers: false, isBlocked: false },
  { lifecycleState: 'pod_uploaded',      primaryRoute: 'home',           label: 'PoD مرفوع — إغلاق الطلب',               canReceiveNewOffers: false, isBlocked: false },
  { lifecycleState: 'order_closed',      primaryRoute: 'home',           label: 'الطلب مغلق — عودة للتوفر',              canReceiveNewOffers: true,  isBlocked: false },
  { lifecycleState: 'exception_active',  primaryRoute: 'support-screen', label: 'استثناء نشط — الإبلاغ مطلوب',            canReceiveNewOffers: false, isBlocked: true, blockReason: 'يجب إغلاق الاستثناء الحالي أولًا' },
  { lifecycleState: 'support_escalated', primaryRoute: 'support-screen', label: 'مصعّد للدعم — محجوب من العروض الجديدة',  canReceiveNewOffers: false, isBlocked: true, blockReason: 'ينتظر قرار فريق الدعم' },
  { lifecycleState: 'store_courier',     primaryRoute: 'inbox',          label: 'وضع موصل المتجر — قائمة التوصيلات',      canReceiveNewOffers: true,  isBlocked: false },
] as const;

// ─── Order stage → captain lifecycle ──────────────────────────────────────────

export type DshCaptainOrderStageMapping = {
  readonly orderStage: DshCaptainOrderStage;
  readonly captainLifecycleState: DshCaptainLifecycleState;
  readonly captainRoute: DshCaptainRoute;
  readonly skipInStoreCourierMode: boolean;
};

export const DSH_CAPTAIN_ORDER_STAGE_MAP: readonly DshCaptainOrderStageMapping[] = [
  { orderStage: 'offer',    captainLifecycleState: 'offer_received', captainRoute: 'bell',           skipInStoreCourierMode: false },
  { orderStage: 'accepted', captainLifecycleState: 'accepted',       captainRoute: 'detail',         skipInStoreCourierMode: false },
  { orderStage: 'pickup',   captainLifecycleState: 'at_pickup',      captainRoute: 'pickup-dropoff', skipInStoreCourierMode: false },
  { orderStage: 'delivery', captainLifecycleState: 'picked_up',      captainRoute: 'pickup-dropoff', skipInStoreCourierMode: false },
  { orderStage: 'proof',    captainLifecycleState: 'pod_pending',     captainRoute: 'pod-submission', skipInStoreCourierMode: true },
  { orderStage: 'closed',   captainLifecycleState: 'order_closed',   captainRoute: 'home',           skipInStoreCourierMode: false },
] as const;

export function getCaptainLifecycleForOrderStage(
  stage: DshCaptainOrderStage,
  isStoreCourierMode: boolean,
): DshCaptainOrderStageMapping {
  const entry = DSH_CAPTAIN_ORDER_STAGE_MAP.find((m) => m.orderStage === stage);
  if (!entry) return DSH_CAPTAIN_ORDER_STAGE_MAP[0]!;
  if (isStoreCourierMode && entry.skipInStoreCourierMode) {
    return { ...entry, captainLifecycleState: 'order_closed', captainRoute: 'home' };
  }
  return entry;
}

// ─── Delivery mode inbox filter ────────────────────────────────────────────────

export type DshCaptainInboxModeFilter = {
  readonly mode: DshFulfillmentDeliveryMode;
  readonly visibleInInbox: boolean;
  readonly hiddenReason?: string;
  readonly modeLabel: string;
};

export const DSH_CAPTAIN_INBOX_MODE_FILTERS: readonly DshCaptainInboxModeFilter[] = [
  { mode: 'bthwani_delivery', visibleInInbox: true,  modeLabel: 'توصيل بثواني' },
  { mode: 'partner_delivery', visibleInInbox: false, hiddenReason: 'توصيل المتجر لا يحتاج كابتن — موصل الشريك يتولى التوصيل', modeLabel: 'توصيل المتجر' },
  { mode: 'pickup',           visibleInInbox: false, hiddenReason: 'الاستلام الذاتي لا يُسند للكابتن — العميل يستلم من المتجر', modeLabel: 'استلم بنفسك' },
] as const;

// ─── Command target → route policy ────────────────────────────────────────────

export function getRouteForCommandTarget(target: DshCaptainCommandTarget): DshCaptainRoute {
  const map: Partial<Record<DshCaptainCommandTarget, DshCaptainRoute>> = {
    inbox: 'inbox', detail: 'detail', orderchat: 'orderchat', bell: 'bell',
    'support-directory': 'support-directory', 'account-orders': 'account-orders',
    'pickup-dropoff': 'pickup-dropoff', 'pod-submission': 'pod-submission', entry: 'entry',
  };
  return map[target] ?? 'home';
}

