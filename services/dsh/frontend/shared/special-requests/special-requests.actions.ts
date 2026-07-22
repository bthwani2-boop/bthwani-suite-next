import type { DshSpecialRequestResponse } from "./special-requests.types";

const CLIENT_CANCELLABLE_STATUSES = new Set<DshSpecialRequestResponse["status"]>([
  "submitted",
  "under_review",
  "needs_customer_input",
  "approved",
]);

export function canClientCancelSpecialRequest(request: DshSpecialRequestResponse): boolean {
  return CLIENT_CANCELLABLE_STATUSES.has(request.status);
}

export function canClientRespondToInformation(request: DshSpecialRequestResponse): boolean {
  return request.status === "needs_customer_input" && request.workflowStage === "customer_information";
}

export function canClientApproveSpecialRequestQuote(request: DshSpecialRequestResponse): boolean {
  return request.status === "needs_customer_input"
    && request.workflowStage === "customer_approval"
    && request.estimatedAmountMinorUnits !== null
    && request.estimatedAmountMinorUnits !== undefined
    && request.currency !== null
    && request.currency !== undefined
    && !request.wltPaymentSessionId;
}

/** Client quote refusal uses the governed cancellation mutation. */
export function isClientQuoteDecisionPending(request: DshSpecialRequestResponse): boolean {
  return canClientApproveSpecialRequestQuote(request);
}

export function clientCancellationActionLabel(request: DshSpecialRequestResponse): string {
  return isClientQuoteDecisionPending(request) ? "رفض العرض" : "إلغاء الطلب";
}

export function specialRequestTypeLabel(request: DshSpecialRequestResponse): string {
  return request.requestType === "SHEIN_ASSISTED_PURCHASE" ? "طلب شي إن" : "طلب عونك";
}

export function specialRequestStatusLabel(request: DshSpecialRequestResponse): string {
  const value = request.workflowStage ?? request.status;
  const labels: Readonly<Record<string, string>> = {
    submitted: "تم الاستلام",
    under_review: "قيد المراجعة",
    needs_customer_input: "بانتظار إجراء منك",
    approved: "تم الاعتماد",
    assigned: "تم إسناد الكابتن",
    in_progress: "قيد التنفيذ",
    completed: "مكتمل",
    cancelled: "ملغي",
    rejected: "مرفوض",
    intake_review: "مراجعة الطلب",
    quote_pending: "إعداد العرض",
    customer_information: "مطلوب معلومات إضافية",
    customer_approval: "بانتظار موافقة العرض",
    batch_pending: "بانتظار دفعة الشراء",
    purchased: "تم الشراء",
    inbound: "في الشحن الوارد",
    sorting: "قيد الفرز",
    ready_for_delivery: "جاهز للتوصيل",
    captain_assignment: "إسناد الكابتن",
    out_for_delivery: "خرج للتوصيل",
    proof_of_delivery: "مراجعة إثبات التسليم",
    delivered: "تم التسليم",
    intake: "استلام الطلب",
    quote_review: "مراجعة التكلفة",
    dispatch_pending: "بانتظار الإسناد",
    captain_enroute_to_pickup: "الكابتن في طريقه للاستلام",
    arrived_at_pickup: "وصل إلى نقطة الاستلام",
    item_received: "تم استلام الغرض",
    in_progress: "قيد التنفيذ",
    arrived_at_dropoff: "وصل إلى نقطة التسليم",
    proof_review: "مراجعة الإثبات",
    completed: "مكتمل",
    escalated: "مصعّد للمراجعة",
    exception: "استثناء تشغيلي",
  };
  return labels[value] ?? value;
}
