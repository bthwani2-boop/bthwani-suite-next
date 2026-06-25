export type DshAssignmentStatus = "offered" | "accepted" | "declined" | "completed";

export type DshDeliveryStatus =
  | "assigned"
  | "driver_assigned"
  | "driver_arrived_store"
  | "picked_up"
  | "arrived_customer"
  | "delivered";

export type DshDispatchAssignment = {
  readonly id: string;
  readonly orderId: string;
  readonly captainId: string;
  readonly assignedBy: string;
  readonly status: DshAssignmentStatus;
  readonly responseDeadlineAt: string;
  readonly acceptedAt?: string | null;
  readonly declinedAt?: string | null;
  readonly completedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly delivery: DshDelivery;
};

export type DshDelivery = {
  readonly id: string;
  readonly assignmentId: string;
  readonly orderId: string;
  readonly captainId: string;
  readonly status: DshDeliveryStatus;
  readonly podMethod: string;
  readonly podReference: string;
  readonly note: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshCreateAssignmentInput = {
  readonly orderId: string;
  readonly captainId: string;
};

export type DshSubmitPoDInput = {
  readonly method: "photo" | "code" | "signature";
  readonly reference: string;
  readonly note?: string;
};

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
