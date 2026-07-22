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

export function canClientApproveSpecialRequestQuote(request: DshSpecialRequestResponse): boolean {
  const quoteStatus = request.status === "under_review" || request.status === "needs_customer_input";
  return quoteStatus
    && request.estimatedAmountMinorUnits !== null
    && request.estimatedAmountMinorUnits !== undefined
    && request.currency !== null
    && request.currency !== undefined
    && !request.wltPaymentSessionId;
}

export function specialRequestTypeLabel(request: DshSpecialRequestResponse): string {
  return request.requestType === "SHEIN_ASSISTED_PURCHASE" ? "طلب شي إن" : "طلب عونك";
}

export function specialRequestStatusLabel(request: DshSpecialRequestResponse): string {
  const value = request.workflowStage ?? request.status;
  const labels: Readonly<Record<string, string>> = {
    submitted: "تم الاستلام",
    under_review: "قيد المراجعة",
    needs_customer_input: "بانتظار موافقتك",
    approved: "تم الاعتماد",
    assigned: "تم إسناد الكابتن",
    in_progress: "قيد التنفيذ",
    completed: "مكتمل",
    cancelled: "ملغي",
    rejected: "مرفوض",
    intake_review: "مراجعة الطلب",
    quote_pending: "إعداد العرض",
    customer_approval: "بانتظار موافقتك",
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
    arrived_at_dropoff: "وصل إلى نقطة التسليم",
    proof_review: "مراجعة الإثبات",
    escalated: "مصعّد للمراجعة",
    exception: "استثناء تشغيلي",
  };
  return labels[value] ?? value;
}
