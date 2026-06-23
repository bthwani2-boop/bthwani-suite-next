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

export function toDispatchCardViewModel(assignment: DshDispatchAssignment): DshDispatchCardViewModel {
  const statusIndex = DELIVERY_SEQUENCE.indexOf(assignment.delivery.status);
  return {
    id: assignment.id,
    orderLabel: `طلب #${assignment.orderId.slice(-6).toUpperCase()}`,
    captainLabel: `كابتن #${assignment.captainId.slice(-6)}`,
    assignmentLabel: ASSIGNMENT_STATUS_LABELS[assignment.status],
    deliveryLabel: DELIVERY_STATUS_LABELS[assignment.delivery.status],
    nextActionLabel: resolveNextActionLabel(assignment),
    timeline: DELIVERY_SEQUENCE.map((status, index) => ({
      id: status,
      label: DELIVERY_STATUS_LABELS[status],
      complete: statusIndex >= index,
    })),
    proofLabel: assignment.delivery.podReference
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
  if (assignment.delivery.status === "delivered") return "تم إغلاق المهمة";
  return "انتظار قبول الكابتن";
}

export function resolveTrackingTitle(assignment: DshDispatchAssignment): string {
  return assignment.delivery.status === "delivered"
    ? "تم تسليم طلبك"
    : "طلبك قيد التوصيل";
}
