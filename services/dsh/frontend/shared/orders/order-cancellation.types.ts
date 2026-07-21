import type { DshFinancialClosureStatus, DshOrder } from "./orders.types";

export type OrderCancellationSurface = "client" | "partner" | "operator";

export type ClientCancellationReasonCode =
  | "changed_mind"
  | "duplicate_order"
  | "address_error"
  | "payment_issue"
  | "excessive_delay"
  | "other";

export type PartnerCancellationReasonCode =
  | "out_of_stock"
  | "store_closed"
  | "capacity"
  | "pricing_issue"
  | "cannot_fulfill"
  | "other";

export type OperatorCancellationReasonCode =
  | "customer_request"
  | "partner_request"
  | "no_driver"
  | "fraud_risk"
  | "safety"
  | "operational_failure"
  | "other";

export type OrderCancellationReasonCode =
  | ClientCancellationReasonCode
  | PartnerCancellationReasonCode
  | OperatorCancellationReasonCode;

export type DshOrderCancellation = {
  readonly id: string;
  readonly orderId: string;
  readonly actorId: string;
  readonly actorRole: "client" | "partner" | "operator" | "system";
  readonly reasonCode: OrderCancellationReasonCode;
  readonly reasonNote: string;
  readonly fromStatus: string;
  readonly toStatus: string;
  readonly financialClosureStatus: DshFinancialClosureStatus;
  readonly financialReference: string;
  readonly financialResultAction: "expired" | "refund_requested" | "none" | "";
  readonly financialFailure: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CancelOrderInput = {
  readonly reasonCode: OrderCancellationReasonCode;
  readonly reasonNote?: string;
  readonly commandId?: string;
  readonly correlationId?: string;
};

export type CancelOrderResponse = {
  readonly order: DshOrder;
  readonly cancellation: DshOrderCancellation;
};

export type OrderCancellationState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "not_cancelled" }
  | { readonly kind: "ready"; readonly cancellation: DshOrderCancellation }
  | { readonly kind: "submitting"; readonly cancellation?: DshOrderCancellation }
  | { readonly kind: "requires_review"; readonly message: string }
  | { readonly kind: "error"; readonly message: string };

export type CancellationReasonOption = {
  readonly code: OrderCancellationReasonCode;
  readonly label: string;
  readonly description: string;
};

export const CLIENT_CANCELLATION_REASONS: readonly CancellationReasonOption[] = [
  { code: "changed_mind", label: "تغيّر القرار", description: "لم أعد بحاجة إلى الطلب." },
  { code: "duplicate_order", label: "طلب مكرر", description: "تم إنشاء الطلب أكثر من مرة." },
  { code: "address_error", label: "خطأ في العنوان", description: "العنوان أو موقع التسليم غير صحيح." },
  { code: "payment_issue", label: "مشكلة في الدفع", description: "طريقة الدفع أو مرجعها غير صحيح." },
  { code: "excessive_delay", label: "تأخير زائد", description: "تجاوز الطلب الوقت المقبول قبل بدء التجهيز." },
  { code: "other", label: "سبب آخر", description: "يتطلب كتابة توضيح." },
];

export const PARTNER_CANCELLATION_REASONS: readonly CancellationReasonOption[] = [
  { code: "out_of_stock", label: "نفاد صنف", description: "أحد أصناف الطلب غير متوفر." },
  { code: "store_closed", label: "المتجر مغلق", description: "تعذر تنفيذ الطلب بسبب إغلاق الفرع." },
  { code: "capacity", label: "الطاقة التشغيلية ممتلئة", description: "لا يمكن تجهيز الطلب ضمن الوقت المطلوب." },
  { code: "pricing_issue", label: "مخالفة سعرية", description: "يوجد تعارض يحتاج تصحيحًا قبل التنفيذ." },
  { code: "cannot_fulfill", label: "تعذر التنفيذ", description: "تعذر تنفيذ الطلب بعد التحقق التشغيلي." },
  { code: "other", label: "سبب آخر", description: "يتطلب كتابة توضيح." },
];

export const OPERATOR_CANCELLATION_REASONS: readonly CancellationReasonOption[] = [
  { code: "customer_request", label: "طلب العميل", description: "تم التحقق من رغبة العميل في الإلغاء." },
  { code: "partner_request", label: "طلب الشريك", description: "طلب الشريك الإلغاء بعد المراجعة." },
  { code: "no_driver", label: "لا يوجد كابتن", description: "فشلت محاولات الإسناد ضمن السياسة." },
  { code: "fraud_risk", label: "مخاطر احتيال", description: "أوقفت العمليات الطلب لأسباب حماية." },
  { code: "safety", label: "سلامة", description: "الإلغاء مطلوب لحماية أحد أطراف الرحلة." },
  { code: "operational_failure", label: "فشل تشغيلي", description: "تعذر إكمال الرحلة بسبب عطل تشغيلي مثبت." },
  { code: "other", label: "سبب آخر", description: "يتطلب كتابة توضيح." },
];

export function cancellationReasonsForSurface(
  surface: OrderCancellationSurface,
): readonly CancellationReasonOption[] {
  if (surface === "client") return CLIENT_CANCELLATION_REASONS;
  if (surface === "partner") return PARTNER_CANCELLATION_REASONS;
  return OPERATOR_CANCELLATION_REASONS;
}
