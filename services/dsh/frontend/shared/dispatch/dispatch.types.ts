import type { components } from "../../../clients/generated/dsh-api";

export type DshDispatchAssignment = components["schemas"]["DshDispatchAssignment"] & {
  specialRequestId?: string;
  requestType?: string;
  tenantId?: string;
  serviceAreaCode?: string;
  priority?: number;
  distanceMeters?: number | null;
  offerReason?: string;
  responseReason?: string;
  expiredAt?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string;
  supersedesAssignmentId?: string;
  version?: number;
};
export type DshAssignmentStatus = components["schemas"]["DshAssignmentStatus"];
export type DshDeliveryStatus = components["schemas"]["DshDeliveryStatus"];
export type DshDelivery = components["schemas"]["DshDelivery"];
export type DshCreateAssignmentInput = components["schemas"]["DshCreateAssignmentRequest"];
export type DshSubmitPoDInput = components["schemas"]["DshSubmitPoDRequest"];
export type DshDeliveryException = components["schemas"]["DshDeliveryException"];
type GeneratedDshDeliveryExceptionReasonCode = components["schemas"]["DshDeliveryExceptionReasonCode"];
type GeneratedDshReportDeliveryExceptionInput = components["schemas"]["DshReportDeliveryExceptionRequest"];

export type DshDeliveryExceptionReasonCode =
  | GeneratedDshDeliveryExceptionReasonCode
  | "handoff_shortage"
  | "handoff_mismatch";

export type DshReportDeliveryExceptionInput = Omit<GeneratedDshReportDeliveryExceptionInput, "reasonCode"> & {
  readonly reasonCode: DshDeliveryExceptionReasonCode;
};

export type DshPartnerDispatchReference = components["schemas"]["DshPartnerDispatchReference"];

export type DshGovernedCreateAssignmentInput = {
  readonly orderId: string;
  readonly tenantId?: string;
  readonly captainId: string;
  readonly serviceAreaCode: string;
  readonly idempotencyKey: string;
  readonly priority?: number;
  readonly distanceMeters?: number;
  readonly offerReason?: string;
  readonly responseTimeoutSeconds?: number;
};

export type DshCaptainDispatchProfileInput = {
  readonly tenantId?: string;
  readonly accreditationStatus: "pending" | "approved" | "suspended" | "expired";
  readonly availabilityStatus: "available" | "busy" | "offline" | "suspended";
  readonly maxActiveAssignments: number;
  readonly priorityScore: number;
  readonly expectedVersion?: number;
};

export type DshCaptainDispatchCandidate = {
  readonly tenantId: string;
  readonly captainId: string;
  readonly serviceAreaCode: string;
  readonly accreditationStatus: "pending" | "approved" | "suspended" | "expired";
  readonly availabilityStatus: "available" | "busy" | "offline" | "suspended";
  readonly maxActiveAssignments: number;
  readonly activeAssignments: number;
  readonly remainingCapacity: number;
  readonly priorityScore: number;
  readonly eligible: boolean;
  readonly ineligibilityReason?: string;
  readonly version: number;
  readonly updatedAt: string;
};

export type DshReassignAssignmentInput = Omit<DshGovernedCreateAssignmentInput, "orderId"> & {
  readonly reason: string;
};

export type DshDispatchDecision = {
  readonly id: string;
  readonly tenantId: string;
  readonly assignmentId?: string;
  readonly orderId?: string;
  readonly captainId?: string;
  readonly action:
    | "offered"
    | "accepted"
    | "declined"
    | "expired"
    | "cancelled"
    | "reassigned"
    | "eligibility_rejected"
    | "capacity_rejected";
  readonly reasonCode?: string;
  readonly reason?: string;
  readonly actorId: string;
  readonly actorRole: "operator" | "captain" | "system";
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
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
  | { readonly kind: "cancelled"; readonly assignment: DshDispatchAssignment }
  | { readonly kind: "error"; readonly message: string };

export const DELIVERY_STATUS_LABELS: Record<DshDeliveryStatus, string> = {
  assigned: "تم إنشاء المهمة",
  driver_assigned: "الكابتن مستلم المهمة",
  driver_arrived_store: "وصل الكابتن للمتجر",
  picked_up: "تم الاستلام من المتجر",
  arrived_customer: "وصل الكابتن للعميل",
  returning_to_store: "في طريق العودة إلى المتجر",
  return_arrived_store: "وصل المرتجع وينتظر استلام المتجر",
  returned_to_store: "أعيد إلى المتجر",
  delivered: "تم التسليم",
  cancelled: "ألغيت المهمة بسبب إلغاء الطلب",
};

export const ASSIGNMENT_STATUS_LABELS: Record<DshAssignmentStatus, string> = {
  offered: "بانتظار رد الكابتن",
  accepted: "مقبولة",
  declined: "مرفوضة",
  completed: "مكتملة",
  cancelled: "ملغاة أو منتهية",
};

export const HANDOFF_EXCEPTION_REASON_LABELS: Record<
  Extract<DshDeliveryExceptionReasonCode, "handoff_shortage" | "handoff_mismatch">,
  string
> = {
  handoff_shortage: "نقص في محتوى الطرد",
  handoff_mismatch: "محتوى الطرد لا يطابق الطلب",
};
