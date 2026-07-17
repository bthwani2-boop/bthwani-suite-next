import type { components } from "../../../clients/generated/dsh-api";

export type DshDispatchAssignment = components["schemas"]["DshDispatchAssignment"] & {
  specialRequestId?: string;
  requestType?: string;
};
export type DshAssignmentStatus = components["schemas"]["DshAssignmentStatus"];
export type DshDeliveryStatus = components["schemas"]["DshDeliveryStatus"];
export type DshDelivery = components["schemas"]["DshDelivery"];
export type DshCreateAssignmentInput = components["schemas"]["DshCreateAssignmentRequest"];
export type DshSubmitPoDInput = components["schemas"]["DshSubmitPoDRequest"];

export type DshDispatchListState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly assignments: readonly DshDispatchAssignment[] }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string };

export type DshDispatchActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "success"; readonly assignment: DshDispatchAssignment }
  | { readonly kind: "error"; readonly message: string };

export type DshTrackingState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "tracking_active"; readonly assignment: DshDispatchAssignment }
  | { readonly kind: "delivered"; readonly assignment: DshDispatchAssignment }
  | { readonly kind: "error"; readonly message: string };

export const DELIVERY_STATUS_LABELS: Record<DshDeliveryStatus, string> = {
  assigned: "تم إنشاء المهمة",
  driver_assigned: "الكابتن مستلم المهمة",
  driver_arrived_store: "وصل الكابتن للمتجر",
  picked_up: "تم الاستلام من المتجر",
  arrived_customer: "وصل الكابتن للعميل",
  delivered: "تم التسليم",
};

export const ASSIGNMENT_STATUS_LABELS: Record<DshAssignmentStatus, string> = {
  offered: "بانتظار رد الكابتن",
  accepted: "مقبولة",
  declined: "مرفوضة",
  completed: "مكتملة",
};
