// Partner adapters — order item mapping, profile builder, ops summary.
// No JSX. No ui-kit. No Tamagui.

import type { DshRuntimeOrderRow } from '../operations/dsh-operational-runtime-adapter';
import { getSurfaceModeCapability } from '../identity-access';
import type { DshOrderLifecycleHandoff } from '../orders/dsh-order-lifecycle-handoffs';
import type { PartnerStoreScopeOption, PartnerRuntimeProfile } from './partner.types';

// ── Partner order item adapter ─────────────────────────────────────────────

type PartnerOrderStatus =
  | 'new'
  | 'needs_accept'
  | 'preparation_started'
  | 'preparing'
  | 'items_ready'
  | 'ready'
  | 'handoff'
  | 'captain_assigned'
  | 'captain_arriving'
  | 'delivering'
  | 'completed'
  | 'cancelled';

const statusMap: Record<string, PartnerOrderStatus> = {
  pending: 'needs_accept',
  store_accepted: 'preparation_started',
  preparing: 'preparing',
  ready_for_pickup: 'ready',
  driver_assigned: 'captain_assigned',
  driver_arrived_store: 'captain_arriving',
  picked_up: 'handoff',
  arrived_customer: 'delivering',
  delivered: 'completed',
  cancelled: 'cancelled',
  CREATED: 'needs_accept',
  ACCEPTED: 'preparation_started',
  READY_FOR_PICKUP: 'ready',
  ACCEPTED_BY_CAPTAIN: 'captain_assigned',
  PICKED_UP: 'handoff',
  EN_ROUTE: 'delivering',
  ARRIVED: 'delivering',
  DELIVERED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'cancelled',
  FAILED_DELIVERY: 'cancelled',
  RETURNING_TO_STORE: 'cancelled',
  RETURNED: 'cancelled',
};

const nextActionMap: Record<PartnerOrderStatus, string> = {
  new: 'قبول الطلب',
  needs_accept: 'قبول الطلب',
  preparation_started: 'بدء التحضير',
  preparing: 'جاري التحضير',
  items_ready: 'جاهز',
  ready: 'جاهز للاستلام',
  handoff: 'تم التسليم للكابتن',
  captain_assigned: 'الكابتن في الطريق',
  captain_arriving: 'الكابتن يقترب',
  delivering: 'قيد التوصيل',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

export function mapRuntimeRowToPartnerOrderItem(row: DshRuntimeOrderRow) {
  const partnerStatus = statusMap[row.status] ?? statusMap[row.status.toLowerCase()] ?? 'needs_accept';
  const created = new Date(row.createdAt);
  const elapsed = Math.max(0, Math.floor((Date.now() - created.getTime()) / 60000));
  return {
    id: row.id,
    orderCode: `#${row.id.slice(-6).toUpperCase()}`,
    branchLabel: row.storeId,
    status: partnerStatus,
    priority: 'normal' as const,
    orderTypeLabel: 'توصيل بثواني',
    orderMode: 'bthwani_delivery' as const,
    itemsCountLabel: '—',
    amountLabel: `${row.totalPrice.toFixed(2)} ر.س`,
    createdAtLabel: created.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    elapsedLabel: elapsed < 60 ? `${elapsed} د` : `${Math.floor(elapsed / 60)} س`,
    nextActionLabel: nextActionMap[partnerStatus],
  };
}

// ── Partner delivery ops summary ───────────────────────────────────────────

type PartnerOrderForOps = {
  status: string;
  priority?: string;
  slaRisk?: boolean;
  issueRequired?: boolean;
};

export type PartnerDeliveryOpsSummary = {
  outForDelivery: number;
  handoffReady: number;
  deliveredToday: number;
  delayedRisk: number;
};

export function buildPartnerDeliveryOpsSummary(
  partnerOrders: readonly PartnerOrderForOps[],
  partnerActionableHandoffs: readonly DshOrderLifecycleHandoff[],
): PartnerDeliveryOpsSummary {
  const partnerReceivesOrders =
    getSurfaceModeCapability('bthwani_delivery').partner.receivesOrder ||
    getSurfaceModeCapability('partner_delivery').partner.receivesOrder;

  return {
    outForDelivery: partnerOrders.filter(
      (o) =>
        o.status === 'captain_assigned' ||
        o.status === 'captain_arriving' ||
        o.status === 'delivering',
    ).length,
    handoffReady: partnerReceivesOrders
      ? partnerOrders.filter(
          (o) =>
            o.status === 'ready' ||
            o.status === 'items_ready' ||
            o.status === 'handoff',
        ).length
      : 0,
    deliveredToday: partnerOrders.filter((o) => o.status === 'completed').length,
    delayedRisk:
      partnerOrders.filter((o) => o.priority === 'high' || o.slaRisk || o.issueRequired).length +
      partnerActionableHandoffs.filter((h) => h.wltImpact.eventKind !== 'none').length,
  };
}

// ── Partner profile builder ────────────────────────────────────────────────

export function buildPartnerProfileFromScope(scope: PartnerStoreScopeOption): PartnerRuntimeProfile {
  return {
    storeName: scope.label,
    branchLabel: scope.label,
    cityLabel: scope.description,
    managerLabel: 'غير محدد',
    todayHoursLabel: 'يتطلب ربط ساعات التشغيل',
    activeZoneLabel: scope.label,
  };
}
