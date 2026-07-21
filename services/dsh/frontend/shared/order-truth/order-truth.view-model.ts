import type { OrderTruth, OrderTruthEvent } from "./order-truth.types";

const STATUS_LABELS: Readonly<Record<string, string>> = {
  pending: "بانتظار قبول المتجر",
  store_accepted: "قبل المتجر الطلب",
  preparing: "قيد التجهيز",
  ready_for_pickup: "جاهز للاستلام",
  driver_assigned: "تم تعيين الكابتن",
  driver_arrived_store: "وصل الكابتن إلى المتجر",
  picked_up: "استلم الكابتن الطلب",
  arrived_customer: "وصل الكابتن إلى العميل",
  returning_to_store: "جارٍ إرجاع الطلب إلى المتجر",
  return_arrived_store: "وصل المرتجع إلى المتجر",
  returned_to_store: "اكتمل إرجاع الطلب",
  delivered: "تم التسليم",
  cancelled_by_client: "ألغى العميل الطلب",
  cancelled_by_store: "ألغى المتجر الطلب",
  cancelled_by_operator: "ألغت العمليات الطلب",
  cancelled_no_driver: "ألغي لعدم توفر كابتن",
  failed_payment: "فشل الدفع",
  failed_dispatch: "فشل الإسناد",
};

const OWNER_LABELS: Readonly<Record<OrderTruth["currentOwner"], string>> = {
  client: "العميل",
  partner: "المتجر",
  operations: "العمليات",
  captain: "الكابتن",
  terminal: "مكتمل",
};

export type OrderTruthSummaryViewModel = {
  readonly id: string;
  readonly orderNumber: string;
  readonly statusLabel: string;
  readonly currentOwnerLabel: string;
  readonly totalLabel: string;
  readonly createdAtLabel: string;
  readonly allowedActions: readonly string[];
  readonly isPaymentProjectionPartial: boolean;
};

export function formatMinorUnits(amount: number, currency: string): string {
  const normalized = Number.isFinite(amount) ? Math.max(0, Math.trunc(amount)) : 0;
  const major = normalized / 100;
  return new Intl.NumberFormat("ar-YE", {
    style: "currency",
    currency: currency || "YER",
    maximumFractionDigits: currency === "YER" ? 0 : 2,
  }).format(major);
}

export function toOrderTruthSummary(order: OrderTruth): OrderTruthSummaryViewModel {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    statusLabel: STATUS_LABELS[order.status] ?? order.status,
    currentOwnerLabel: OWNER_LABELS[order.currentOwner] ?? order.currentOwner,
    totalLabel: formatMinorUnits(order.totalMinorUnits, order.currency),
    createdAtLabel: new Intl.DateTimeFormat("ar-YE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(order.createdAt)),
    allowedActions: order.allowedActions,
    isPaymentProjectionPartial: order.paymentStatusProjection === "unknown",
  };
}

export function orderEventLabel(event: OrderTruthEvent): string {
  if (event.type === "order.created") return "تم إنشاء الطلب من Checkout معتمد";
  const from = STATUS_LABELS[event.fromStatus] ?? event.fromStatus;
  const to = STATUS_LABELS[event.toStatus] ?? event.toStatus;
  return event.fromStatus ? `${from} ← ${to}` : to;
}

export function canExecuteOrderTruthAction(order: OrderTruth, action: string): boolean {
  return order.allowedActions.includes(action);
}
