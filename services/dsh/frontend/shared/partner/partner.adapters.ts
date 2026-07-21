// Partner adapters — order item mapping, profile builder, ops summary.
// No JSX. No ui-kit. No Tamagui.

import type { DshRuntimeOrderRow } from '../operations/dsh-operational-runtime-adapter';
import { getSurfaceModeCapability } from '../identity-access';
import type {
  DshOrderPreparation,
  DshPartnerOrder,
  DshPartnerOrderAction,
} from '../orders/orders.types';
import type { DshOrderLifecycleHandoff } from '../orders/dsh-order-lifecycle-handoffs';
import type { PartnerOrderItem, PartnerOrderStatus } from '../orders/orders.contract';
import type { DshPartnerOperationalScope, PartnerRuntimeProfile } from './partner.types';

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
  preparing: 'تأكيد جاهزية الطلب',
  items_ready: 'تأكيد جاهزية الطلب',
  ready: 'فتح مسار التسليم',
  handoff: 'متابعة التسليم',
  captain_assigned: 'متابعة وصول الكابتن',
  captain_arriving: 'تأكيد التسليم للكابتن',
  delivering: 'متابعة التوصيل',
  completed: 'عرض التفاصيل',
  cancelled: 'عرض سبب الإلغاء',
};

export type GovernedPartnerOrderItem = PartnerOrderItem & {
  readonly allowedActions: readonly DshPartnerOrderAction[];
  readonly preparation: DshOrderPreparation;
};

type CanonicalOrderShape = {
  readonly id?: string;
  readonly storeId?: string;
  readonly fulfillmentMode?: 'bthwani_delivery' | 'partner_delivery' | 'pickup';
  readonly status?: string;
  readonly wltPaymentRefId?: string;
  readonly rejectionReason?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly allowedActions?: readonly DshPartnerOrderAction[];
  readonly preparation?: DshOrderPreparation;
  readonly items?: readonly {
    readonly productName?: string;
    readonly quantity?: number;
    readonly unitPrice?: number;
  }[];
};

function resolvePartnerStatus(status: unknown): PartnerOrderStatus {
  const value = String(status ?? '').trim();
  return statusMap[value] ?? statusMap[value.toLowerCase()] ?? 'needs_accept';
}

function resolveOrderTypeLabel(
  mode: CanonicalOrderShape['fulfillmentMode'],
): PartnerOrderItem['orderTypeLabel'] {
  if (mode === 'pickup') return 'استلم بنفسك';
  if (mode === 'partner_delivery') return 'توصيل المتجر';
  return 'توصيل بثواني';
}

function resolveOrderMode(
  orderId: string,
  mode: CanonicalOrderShape['fulfillmentMode'],
): PartnerOrderItem['orderMode'] {
  if (mode === 'pickup' || mode === 'partner_delivery' || mode === 'bthwani_delivery') {
    return mode;
  }
  throw new Error(`missing fulfillmentMode for partner order ${orderId}`);
}

function formatElapsed(createdAt: Date): { label: string; minutes: number } {
  const minutes = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 60000));
  return {
    minutes,
    label: minutes < 60 ? `${minutes} د` : `${Math.floor(minutes / 60)} س`,
  };
}

function preparationSlaLabel(preparation: DshOrderPreparation): string | undefined {
  if (preparation.preparationSlaState === 'overdue') {
    return `متأخر ${Math.ceil(Math.abs(preparation.preparationRemainingSeconds) / 60)} د`;
  }
  if (preparation.preparationSlaState === 'due_soon') {
    return `يتبقى ${Math.max(1, Math.ceil(preparation.preparationRemainingSeconds / 60))} د`;
  }
  if (preparation.preparationSlaState === 'on_track') {
    return `جاهزية خلال ${Math.max(1, Math.ceil(preparation.preparationRemainingSeconds / 60))} د`;
  }
  if (preparation.preparationSlaState === 'ready') return 'جاهز ضمن سجل التحضير';
  return undefined;
}

/** Canonical actor-scoped partner order adapter. */
export function mapDshOrderToPartnerOrderItem(order: DshPartnerOrder): GovernedPartnerOrderItem {
  const raw = order as unknown as CanonicalOrderShape;
  const orderId = String(raw.id ?? '');
  if (!orderId) throw new Error('partner order response is missing id');
  if (!Array.isArray(raw.allowedActions)) {
    throw new Error(`partner order ${orderId} is missing server allowedActions`);
  }
  if (!raw.preparation || raw.preparation.orderId !== orderId) {
    throw new Error(`partner order ${orderId} is missing governed preparation timing`);
  }

  const status = resolvePartnerStatus(raw.status);
  const orderMode = resolveOrderMode(orderId, raw.fulfillmentMode);
  const createdAt = new Date(raw.createdAt ?? raw.updatedAt ?? 0);
  if (Number.isNaN(createdAt.getTime())) {
    throw new Error(`partner order ${orderId} has an invalid createdAt`);
  }

  const items = raw.items ?? [];
  const itemCount = items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity ?? 0)), 0);
  const total = items.reduce(
    (sum, item) => sum + Math.max(0, Number(item.quantity ?? 0)) * Math.max(0, Number(item.unitPrice ?? 0)),
    0,
  );
  const itemNames = items
    .map((item) => String(item.productName ?? '').trim())
    .filter(Boolean)
    .slice(0, 3);
  const elapsed = formatElapsed(createdAt);
  const acceptanceRisk = status === 'needs_accept' && elapsed.minutes >= 10;
  const preparationRisk = raw.preparation.preparationSlaState === 'due_soon'
    || raw.preparation.preparationSlaState === 'overdue';
  const slaLabel = preparationSlaLabel(raw.preparation);

  return {
    id: orderId,
    orderCode: `#${orderId.slice(-6).toUpperCase()}`,
    branchLabel: String(raw.storeId ?? 'الفرع المرتبط بالحساب'),
    status,
    allowedActions: [...raw.allowedActions],
    preparation: raw.preparation,
    priority: acceptanceRisk || raw.preparation.preparationSlaState === 'overdue' ? 'high' : 'normal',
    orderTypeLabel: resolveOrderTypeLabel(orderMode),
    orderMode,
    itemsCountLabel: itemCount > 0 ? `${itemCount} عنصر` : 'العناصر عند فتح التفاصيل',
    amountLabel: total > 0 ? `${total.toLocaleString('ar-YE')} ر.ي` : '—',
    createdAtLabel: createdAt.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
    elapsedLabel: elapsed.label,
    nextActionLabel: nextActionMap[status],
    ...(acceptanceRisk || preparationRisk ? { urgent: true, slaRisk: true } : {}),
    ...(slaLabel ? { slaLabel } : {}),
    ...(status === 'needs_accept' ? { unread: true } : {}),
    ...(itemNames.length > 0 ? { itemsSummaryLabel: itemNames.join('، ') } : {}),
    ...(raw.wltPaymentRefId ? { paymentLabel: 'مرجع مالي مرتبط' } : {}),
    ...(status === 'cancelled' && raw.rejectionReason ? { issueRequired: true } : {}),
  };
}

/** @deprecated New partner surfaces must use mapDshOrderToPartnerOrderItem. */
export function mapRuntimeRowToPartnerOrderItem(row: DshRuntimeOrderRow): PartnerOrderItem {
  const partnerStatus = resolvePartnerStatus(row.status);
  const created = new Date(row.createdAt);
  const elapsed = formatElapsed(created);
  return {
    id: row.id,
    orderCode: `#${row.id.slice(-6).toUpperCase()}`,
    branchLabel: row.storeId,
    status: partnerStatus,
    priority: 'normal',
    orderTypeLabel: 'توصيل بثواني',
    orderMode: 'bthwani_delivery',
    itemsCountLabel: '—',
    amountLabel: `${row.totalPrice.toFixed(2)} ر.ي`,
    createdAtLabel: created.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
    elapsedLabel: elapsed.label,
    nextActionLabel: nextActionMap[partnerStatus],
  };
}

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

export function buildPartnerProfileFromScope(scope?: DshPartnerOperationalScope): PartnerRuntimeProfile {
  if (!scope) {
    return {
      storeName: 'غير محدد',
      branchLabel: 'غير محدد',
      cityLabel: 'غير محدد',
      managerLabel: 'غير محدد',
      todayHoursLabel: 'غير محدد',
      activeZoneLabel: 'غير محدد',
    };
  }
  return {
    storeName: scope.displayName,
    branchLabel: scope.displayName,
    cityLabel: scope.storeId,
    managerLabel: scope.role === 'owner' ? 'المالك' : scope.role === 'manager' ? 'مدير الفرع' : 'موظف',
    todayHoursLabel: 'يتطلب ربط ساعات التشغيل',
    activeZoneLabel: scope.displayName,
  };
}
