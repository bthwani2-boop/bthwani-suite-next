import type { DshDispatchAssignment, DshDeliveryStatus } from "./dispatch.types";
import { ASSIGNMENT_STATUS_LABELS, DELIVERY_STATUS_LABELS } from "./dispatch.types";

export type DshDispatchCardViewModel = {
  readonly id: string;
  readonly orderLabel: string;
  readonly captainLabel: string;
  readonly assignmentLabel: string;
  readonly deliveryLabel: string;
  readonly nextActionLabel: string;
  readonly timeline: readonly { readonly id: DshDeliveryStatus; readonly label: string; readonly complete: boolean }[];
  readonly proofLabel: string;
};

const DELIVERY_SEQUENCE: readonly DshDeliveryStatus[] = [
  "assigned",
  "driver_assigned",
  "driver_arrived_store",
  "picked_up",
  "arrived_customer",
  "delivered",
];

const RETURN_SEQUENCE: readonly DshDeliveryStatus[] = [
  "assigned",
  "driver_assigned",
  "driver_arrived_store",
  "picked_up",
  "arrived_customer",
  "returning_to_store",
  "return_arrived_store",
  "returned_to_store",
];

function deliverySequence(status: DshDeliveryStatus): readonly DshDeliveryStatus[] {
  if (status === "returning_to_store" || status === "return_arrived_store" || status === "returned_to_store") {
    return RETURN_SEQUENCE;
  }
  return DELIVERY_SEQUENCE;
}

function toDispatchCardViewModel(assignment: DshDispatchAssignment): DshDispatchCardViewModel {
  const sequence = deliverySequence(assignment.delivery.status);
  const statusIndex = sequence.indexOf(assignment.delivery.status);
  return {
    id: assignment.id,
    orderLabel: `طلب #${assignment.orderId.slice(-6).toUpperCase()}`,
    captainLabel: `كابتن #${assignment.captainId.slice(-6)}`,
    assignmentLabel: ASSIGNMENT_STATUS_LABELS[assignment.status as keyof typeof ASSIGNMENT_STATUS_LABELS] ?? "غير معروف",
    deliveryLabel: DELIVERY_STATUS_LABELS[assignment.delivery.status as keyof typeof DELIVERY_STATUS_LABELS] ?? "غير معروف",
    nextActionLabel: resolveNextActionLabel(assignment),
    timeline: sequence.map((status, index) => ({
      id: status,
      label: DELIVERY_STATUS_LABELS[status] ?? "غير معروف",
      complete: statusIndex >= index,
    })),
    proofLabel: assignment.delivery.status === "returned_to_store"
      ? "أعيد الطلب إلى المتجر وأغلقت محاولة التسليم دون إثبات تسليم للعميل."
      : assignment.delivery.podReference
        ? `${assignment.delivery.podMethod}: ${assignment.delivery.podReference}`
        : "لم يتم رفع إثبات التسليم",
  };
}

export function resolveNextActionLabel(assignment: DshDispatchAssignment): string {
  if (assignment.status === "offered") return "قبول أو رفض المهمة";
  if (assignment.status === "declined") return "المهمة مرفوضة";
  if (assignment.delivery.status === "driver_assigned") return "تأكيد الوصول للمتجر";
  if (assignment.delivery.status === "driver_arrived_store") return "تأكيد الاستلام";
  if (assignment.delivery.status === "picked_up") return "تأكيد الوصول للعميل";
  if (assignment.delivery.status === "arrived_customer") return "رفع إثبات التسليم";
  if (assignment.delivery.status === "returning_to_store") return "متابعة العودة إلى المتجر";
  if (assignment.delivery.status === "return_arrived_store") return "بانتظار تأكيد استلام المتجر";
  if (assignment.delivery.status === "returned_to_store") return "أغلقت محاولة التوصيل بعد استلام المتجر";
  if (assignment.delivery.status === "delivered") return "تم إغلاق المهمة";
  if (assignment.delivery.status === "cancelled") return "ألغيت مهمة التوصيل";
  return "انتظار قبول الكابتن";
}

function resolveTrackingTitle(assignment: DshDispatchAssignment): string {
  if (assignment.delivery.status === "delivered") return "تم تسليم طلبك";
  if (assignment.delivery.status === "returning_to_store") return "طلبك في طريق العودة إلى المتجر";
  if (assignment.delivery.status === "return_arrived_store") return "وصل طلبك المرتجع إلى المتجر";
  if (assignment.delivery.status === "returned_to_store") return "أعيد طلبك إلى المتجر";
  if (assignment.delivery.status === "cancelled") return "ألغيت مهمة التوصيل";
  return "طلبك قيد التوصيل";
}
