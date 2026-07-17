import type { components } from "../../../clients/generated/dsh-api";

export type DshPartnerDeliveryTask = components["schemas"]["DshPartnerDeliveryTask"];
export type DshPartnerDeliveryTaskStatus = components["schemas"]["DshPartnerDeliveryTaskStatus"];
export type DshPartnerDeliveryTaskResponse = components["schemas"]["DshPartnerDeliveryTaskResponse"];
export type DshPartnerDeliveryTaskListResponse = components["schemas"]["DshPartnerDeliveryTaskListResponse"];
export type DshAssignPartnerDeliveryTaskRequest = components["schemas"]["DshAssignPartnerDeliveryTaskRequest"];
export type DshSubmitPartnerDeliveryProofRequest = components["schemas"]["DshSubmitPartnerDeliveryProofRequest"];
export type DshRaisePartnerDeliveryExceptionRequest = components["schemas"]["DshRaisePartnerDeliveryExceptionRequest"];
export type DshPartnerDeliveryMutationRequest = components["schemas"]["DshPartnerDeliveryMutationRequest"];

/**
 * Error codes returned by the Go handler in
 * dsh/backend/internal/http/partnerdelivery.go (writePartnerDeliveryError).
 * Hand-declared union — no such enum exists on the generated error schema.
 */
export type PartnerDeliveryErrorCode =
  | "NOT_FOUND"
  | "VERSION_CONFLICT"
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
