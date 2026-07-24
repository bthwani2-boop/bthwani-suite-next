import type { components } from "../../../clients/generated/dsh-api";
import type { DshSlaProjection } from "../sla/sla.types";

type GeneratedPartnerDeliveryTask = components["schemas"]["DshPartnerDeliveryTask"];

export type DshPartnerDeliveryTask = GeneratedPartnerDeliveryTask & {
  readonly exceptionReason?: string | null;
  readonly exceptionEvidenceReferences?: readonly string[];
  readonly exceptionReportedAt?: string | null;
  readonly slaState?: DshSlaProjection;
};
export type DshPartnerDeliveryTaskStatus = components["schemas"]["DshPartnerDeliveryTaskStatus"];
export type DshPartnerDeliveryTaskResponse = Omit<components["schemas"]["DshPartnerDeliveryTaskResponse"], "task"> & {
  readonly task: DshPartnerDeliveryTask;
};
export type DshPartnerDeliveryTaskListResponse = Omit<components["schemas"]["DshPartnerDeliveryTaskListResponse"], "tasks"> & {
  readonly tasks: readonly DshPartnerDeliveryTask[];
};
export type DshAssignPartnerDeliveryTaskRequest = components["schemas"]["DshAssignPartnerDeliveryTaskRequest"];
export type DshSubmitPartnerDeliveryProofRequest = components["schemas"]["DshSubmitPartnerDeliveryProofRequest"];
export type DshRaisePartnerDeliveryExceptionRequest = components["schemas"]["DshRaisePartnerDeliveryExceptionRequest"];
export type DshPartnerDeliveryMutationRequest = components["schemas"]["DshPartnerDeliveryMutationRequest"];

export type PartnerDeliveryErrorCode =
  | "NOT_FOUND"
  | "VERSION_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "PARTNER_DELIVERY_ALREADY_ASSIGNED"
  | "PARTNER_DELIVERY_NOT_READY"
  | "COURIER_INELIGIBLE"
  | "PARTNER_DELIVERY_INVALID_TRANSITION"
  | "INVALID_REQUEST"
  | "INTERNAL_ERROR";

export type PartnerDeliveryErrorKind =
  | "network"
  | "conflict"
  | "not_found"
  | "forbidden"
  | "invalid"
  | "unavailable"
  | "unknown";

export type ClassifiedPartnerDeliveryError = {
  readonly kind: PartnerDeliveryErrorKind;
  readonly code?: PartnerDeliveryErrorCode;
  readonly message?: string;
};
