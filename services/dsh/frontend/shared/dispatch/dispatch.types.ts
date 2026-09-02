import type { components, operations } from "../../../clients/generated/dsh-api";

export type DshDispatchAssignment = components["schemas"]["DshDispatchAssignment"];
export type DshGovernedDispatchAssignment = components["schemas"]["DshGovernedDispatchAssignment"];
export type DshDispatchAssignmentSource = "order" | "special_request";
export type DshAssignmentStatus = components["schemas"]["DshAssignmentStatus"];
export type DshDeliveryStatus = components["schemas"]["DshDeliveryStatus"];
type GeneratedDshDeliveryException = components["schemas"]["DshDeliveryException"];
type GeneratedDshDeliveryExceptionReasonCode = components["schemas"]["DshDeliveryExceptionReasonCode"];
type GeneratedDshReportDeliveryExceptionInput = components["schemas"]["DshReportDeliveryExceptionRequest"];

export type DshDeliveryExceptionReasonCode =
  GeneratedDshDeliveryExceptionReasonCode;

export type DshDeliveryException = GeneratedDshDeliveryException;

export type DshReportDeliveryExceptionInput = GeneratedDshReportDeliveryExceptionInput;

export type DshDeliveryExceptionResolutionAction =
  components["schemas"]["DshResolveDeliveryExceptionRequest"]["action"];

type DshGovernedCreateAssignmentRequest =
  operations["createDshAssignment"]["requestBody"]["content"]["application/json"];
export type DshGovernedCreateAssignmentInput = DshGovernedCreateAssignmentRequest & {
  readonly idempotencyKey: string;
};

export type DshCaptainDispatchCandidate =
  operations["listCaptainDispatchCandidates"]["responses"][200]["content"]["application/json"]["candidates"][number];

export type DshCaptainReadiness =
  operations["getOwnCaptainReadiness"]["responses"][200]["content"]["application/json"];

export type DshCaptainAvailabilityStatus = components["schemas"]["DshCaptainAvailability"]["status"];

export type DshCaptainAvailability = components["schemas"]["DshCaptainAvailability"];

type DshReassignAssignmentRequest =
  operations["reassignGovernedDispatchAssignment"]["requestBody"]["content"]["application/json"];
export type DshReassignAssignmentInput = DshReassignAssignmentRequest & {
  readonly idempotencyKey: string;
};

export type DshDispatchDecision =
  operations["listDispatchDecisions"]["responses"][200]["content"]["application/json"]["decisions"][number];

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

