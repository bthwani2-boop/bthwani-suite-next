import type { components } from "../../../clients/generated/dsh-api";

export type DshPickupSession = components["schemas"]["DshPickupSession"];
export type DshPickupSessionResponse = components["schemas"]["DshPickupSessionResponse"];
export type DshPickupSessionListResponse = components["schemas"]["DshPickupSessionListResponse"];
export type DshVerifyPickupOtpRequest = components["schemas"]["DshVerifyPickupOtpRequest"];
export type DshExtendPickupWindowRequest = components["schemas"]["DshExtendPickupWindowRequest"];
export type DshPickupMarkReadyResponse = components["schemas"]["DshPickupMarkReadyResponse"];
export type DshPickupCustomerArrivedResponse = components["schemas"]["DshPickupCustomerArrivedResponse"];
export type DshPickupNotifyResponse = components["schemas"]["DshPickupNotifyResponse"];

/**
 * Error codes returned by the Go handler in dsh/backend/internal/http/pickup.go
 * (writePickupError). Hand-declared union — no such enum exists on the
 * generated error schema.
 */
export type PickupErrorCode =
  | "NOT_FOUND"
  | "VERSION_CONFLICT"
  | "PICKUP_CODE_ALREADY_USED"
  | "PICKUP_CODE_EXPIRED"
  | "PICKUP_CODE_ATTEMPTS_EXCEEDED"
  | "PICKUP_CODE_INVALID"
  | "PICKUP_INVALID_TRANSITION"
  | "INVALID_REQUEST"
  | "INTERNAL_ERROR";

export type PickupErrorKind =
  | "network"
  | "conflict"
  | "not_found"
  | "forbidden"
  | "invalid"
  | "unavailable"
  | "unknown";

export type ClassifiedPickupError = {
  readonly kind: PickupErrorKind;
  readonly code?: PickupErrorCode;
  readonly message?: string;
};
