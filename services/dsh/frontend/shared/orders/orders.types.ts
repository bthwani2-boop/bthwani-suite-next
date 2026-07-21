import type { components } from "../../../clients/generated/dsh-api";

type GeneratedDshOrder = components["schemas"]["DshOrder"];
type GeneratedDshOrderStatus = components["schemas"]["DshOrderStatus"];

export type DshOrderStatus = GeneratedDshOrderStatus | "store_handoff_confirmed";

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

export type DshPreparationSlaState =
  | "not_started"
  | "on_track"
  | "due_soon"
  | "overdue"
  | "ready";

export type DshOrderPreparation = {
  readonly orderId: string;
  readonly acceptedAt?: string | null;
  readonly preparationStartedAt?: string | null;
  readonly estimatedReadyAt?: string | null;
  readonly readyAt?: string | null;
  readonly estimatedPreparationMinutes: number;
  readonly preparationWarningMinutes: number;
  readonly preparationDelayReason: string;
  readonly preparationEstimateRevisionCount: number;
  readonly preparationSlaState: DshPreparationSlaState;
  readonly preparationRemainingSeconds: number;
};

export type DshPreparationIssueKind =
  | "missing_item"
  | "substitution_required"
  | "quality_issue"
  | "other";

export type DshPreparationIssueStatus = "open" | "resolved";

export type DshPreparationIssue = {
  readonly id: string;
  readonly orderId: string;
  readonly storeId: string;
  readonly orderItemId: string;
  readonly kind: DshPreparationIssueKind;
  readonly status: DshPreparationIssueStatus;
  readonly affectedQuantity: number;
  readonly note: string;
  readonly replacementProductId: string;
  readonly replacementProductName: string;
  readonly openedByActorId: string;
  readonly openedAt: string;
  readonly resolvedByActorId: string;
  readonly resolutionNote: string;
  readonly resolvedAt?: string | null;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshCreatePreparationIssueInput = {
  readonly orderItemId?: string;
  readonly kind: DshPreparationIssueKind;
  readonly affectedQuantity: number;
  readonly note: string;
  readonly replacementProductId?: string;
  readonly replacementProductName?: string;
};

export type DshResolvePreparationIssueInput = {
  readonly expectedVersion: number;
  readonly resolutionNote: string;
};

export type DshStorePreparationPolicy = {
  readonly storeId: string;
  readonly defaultPreparationMinutes: number;
  readonly warningBeforeMinutes: number;
  readonly version: number;
  readonly updatedByActorId: string;
  readonly updatedAt: string;
};

export type DshPartnerOrderAction =
  | "accept"
  | "reject"
  | "prepare"
  | "ready"
  | "revise_estimate"
  | "report_issue"
  | "resolve_issue"
  | "handoff";

export type DshStoreCaptainHandoffStatus =
  | ""
  | "awaiting_partner"
  | "partner_confirmed"
  | "completed"
  | "superseded";

export type DshStoreCaptainHandoff = {
  readonly id: string;
  readonly orderId: string;
  readonly assignmentId: string;
  readonly storeId: string;
  readonly captainId: string;
  readonly status: Exclude<DshStoreCaptainHandoffStatus, "">;
  readonly partnerConfirmedAt?: string | null;
  readonly partnerConfirmedByActorId?: string;
  readonly captainConfirmedAt?: string | null;
  readonly captainConfirmedByActorId?: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshPartnerOrder = DshOrder & {
  readonly allowedActions: readonly DshPartnerOrderAction[];
  readonly preparation: DshOrderPreparation;
  readonly preparationIssues: readonly DshPreparationIssue[];
  readonly openPreparationIssueCount: number;
  readonly storeCaptainHandoffStatus: DshStoreCaptainHandoffStatus;
  readonly storeCaptainHandoffAssignmentId: string;
  readonly storeCaptainHandoffCaptainId: string;
  readonly partnerHandoffConfirmedAt?: string | null;
  readonly captainPickupConfirmedAt?: string | null;
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
  store_handoff_confirmed: "أكد المتجر التسليم للكابتن",
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

export const PREPARATION_SLA_LABELS: Record<DshPreparationSlaState, string> = {
  not_started: "لم يبدأ توقيت التحضير",
  on_track: "ضمن زمن التحضير",
  due_soon: "اقترب موعد الجاهزية",
  overdue: "متأخر عن موعد الجاهزية",
  ready: "جاهز",
};

export const PREPARATION_ISSUE_KIND_LABELS: Record<DshPreparationIssueKind, string> = {
  missing_item: "صنف غير متوفر",
  substitution_required: "استبدال مطلوب",
  quality_issue: "مشكلة جودة",
  other: "مشكلة أخرى",
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
