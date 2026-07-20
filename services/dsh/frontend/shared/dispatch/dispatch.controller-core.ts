import type {
  DshDeliveryStatus,
  DshDispatchAssignment,
  DshDispatchListState,
  DshSubmitPoDInput,
  DshTrackingState,
} from "./dispatch.types";
import {
  dispatchEmptyState,
  dispatchErrorState,
  dispatchLoadingState,
  dispatchSuccessState,
  trackingActiveState,
  trackingCancelledState,
  trackingDeliveredState,
  trackingErrorState,
  trackingLoadingState,
} from "./dispatch.states";

export type DispatchErrorKind = "permission_denied" | "offline" | "conflict" | "not_found" | "error";

export function beginDispatchLoad(): DshDispatchListState {
  return dispatchLoadingState();
}

export function resolveDispatchLoadSuccess(assignments: readonly DshDispatchAssignment[]): DshDispatchListState {
  return assignments.length === 0 ? dispatchEmptyState() : dispatchSuccessState(assignments);
}

export function resolveDispatchLoadError(error: { readonly kind: DispatchErrorKind }, scope: "captain" | "operator"): DshDispatchListState {
  if (error.kind === "permission_denied") return dispatchErrorState("لا تملك صلاحية عرض مهام التوصيل.");
  if (error.kind === "offline") return dispatchErrorState("لا يوجد اتصال بالإنترنت.");
  return dispatchErrorState(scope === "captain" ? "تعذر تحميل مهام الكابتن." : "تعذر تحميل غرفة الإرسال.");
}

export function beginTrackingLoad(): DshTrackingState {
  return trackingLoadingState();
}

export function resolveTrackingSuccess(assignment: DshDispatchAssignment): DshTrackingState {
  if (assignment.status === "cancelled" || assignment.delivery.status === "cancelled") {
    return trackingCancelledState(assignment);
  }
  return assignment.delivery.status === "delivered"
    ? trackingDeliveredState(assignment)
    : trackingActiveState(assignment);
}

export function resolveTrackingError(error: { readonly kind: DispatchErrorKind }): DshTrackingState {
  if (error.kind === "not_found") return trackingErrorState("لا يوجد تتبع نشط لهذا الطلب.");
  if (error.kind === "permission_denied") return trackingErrorState("لا تملك صلاحية تتبع هذا الطلب.");
  if (error.kind === "offline") return trackingErrorState("لا يوجد اتصال بالإنترنت.");
  return trackingErrorState("تعذر تحميل تتبع الطلب.");
}

export function resolveDispatchActionError(error: { readonly kind: DispatchErrorKind }, action: "assign" | "accept" | "decline" | "status" | "pod") {
  if (error.kind === "conflict") return { kind: "error" as const, message: "ألغيت المهمة أو تغيّرت حالتها؛ أغلقت الإجراءات غير الصالحة." };
  if (error.kind === "not_found") return { kind: "error" as const, message: "المهمة غير موجودة أو لم تعد نشطة." };
  if (error.kind === "permission_denied") return { kind: "error" as const, message: "لا تملك صلاحية تنفيذ هذا الإجراء." };
  const fallback: Record<typeof action, string> = {
    assign: "تعذر إنشاء مهمة الكابتن.",
    accept: "تعذر قبول المهمة.",
    decline: "تعذر رفض المهمة.",
    status: "تعذر تحديث حالة التوصيل.",
    pod: "تعذر رفع إثبات التسليم.",
  };
  return { kind: "error" as const, message: fallback[action] };
}

export function resolvePoDValidation(input: DshSubmitPoDInput) {
  if (!input.reference.trim()) {
    return { kind: "error" as const, message: "مرجع إثبات التسليم مطلوب." };
  }
  return null;
}

export function nextDeliveryStatus(current: DshDeliveryStatus): DshDeliveryStatus | null {
  if (current === "driver_assigned") return "driver_arrived_store";
  if (current === "driver_arrived_store") return "picked_up";
  if (current === "picked_up") return "arrived_customer";
  return null;
}
