import type { components } from "../../../clients/generated/dsh-api";

type GeneratedDshOrder = components["schemas"]["DshOrder"];
type GeneratedDshOrderStatus = components["schemas"]["DshOrderStatus"];

export type DshOrderStatus = GeneratedDshOrderStatus;

export type DshOrderItem = components["schemas"]["DshOrderItem"];
export type DshOrder = Omit<GeneratedDshOrder, "status"> & {
  readonly status: DshOrderStatus;
  readonly cancellationReasonCode?: string | null;
  readonly cancellationNote?: string | null;
  readonly cancelledByActorId?: string | null;
  readonly cancelledByRole?: "client" | "partner" | "operator" | "system" | null;
  readonly cancelledAt?: string | null;
  readonly financialClosureStatus?: DshFinancialClosureStatus;
  readonly financialClosureReference?: string | null;
};

export type DshPartnerOrderAction = "accept" | "reject" | "prepare" | "ready" | "handoff";

export type DshPartnerOrder = DshOrder & {
  readonly allowedActions: readonly DshPartnerOrderAction[];
};

export type DshFinancialClosureStatus =
  | "not_required"
  | "pending"
  | "session_expired"
  | "refund_requested"
  | "refund_completed"
  | "no_action"
  | "failed";

export type DshCreateOrderInput = {
  readonly checkoutIntentId: string;
};

export type DshRejectOrderInput = {
  readonly reason: string;
};

export type DshOrdersListState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly orders: readonly DshOrder[] }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string };

export type DshOrderDetailState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly order: DshOrder }
  | { readonly kind: "error"; readonly message: string };

export type DshOrderActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "success"; readonly order: DshOrder }
  | { readonly kind: "error"; readonly message: string };

export const CANCELLATION_ORDER_STATUSES: readonly DshOrderStatus[] = [
  "cancelled_by_client",
  "cancelled_by_store",
  "cancelled_by_operator",
  "cancelled_no_driver",
  "failed_payment",
  "failed_dispatch",
];

export function isOrderCancellationStatus(status: DshOrderStatus): boolean {
  return CANCELLATION_ORDER_STATUSES.includes(status);
}

export const ORDER_STATUS_LABELS: Record<DshOrderStatus, string> = {
  pending: "قيد الانتظار",
  store_accepted: "تم القبول",
  preparing: "قيد التجهيز",
  ready_for_pickup: "جاهز للاستلام",
  driver_assigned: "تم تعيين الكابتن",
  driver_arrived_store: "وصل الكابتن للمتجر",
  picked_up: "تم الاستلام",
  arrived_customer: "وصل الكابتن للعميل",
  returning_to_store: "جارٍ إرجاع الطلب إلى المتجر",
  return_arrived_store: "وصل المرتجع وينتظر تأكيد المتجر",
  returned_to_store: "أعيد الطلب إلى المتجر",
  delivered: "تم التسليم",
  cancelled_by_client: "ألغاه العميل",
  cancelled_by_store: "ألغاه المتجر",
  cancelled_by_operator: "ألغته العمليات",
  cancelled_no_driver: "ألغي لعدم توفر كابتن",
  failed_payment: "فشل الدفع",
  failed_dispatch: "فشل الإسناد",
};

export const FINANCIAL_CLOSURE_LABELS: Record<DshFinancialClosureStatus, string> = {
  not_required: "لا توجد معاملة مالية للإغلاق",
  pending: "جارٍ تحديد الإجراء المالي",
  session_expired: "تم تحرير جلسة الدفع",
  refund_requested: "تم إنشاء طلب استرداد",
  refund_completed: "اكتمل الاسترداد",
  no_action: "لا يلزم إجراء مالي إضافي",
  failed: "تعذر إغلاق الأثر المالي ويتطلب مراجعة",
};
