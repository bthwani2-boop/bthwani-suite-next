import type { components } from "../../../clients/generated/dsh-api";

type GeneratedPickupSession = components["schemas"]["DshPickupSession"];

export type DshPickupSession = GeneratedPickupSession & {
  readonly customerNotifiedAt?: string | null;
  readonly customerArrivedAt?: string | null;
  readonly noShowAt?: string | null;
  readonly noShowReason?: string | null;
  readonly rescheduledAt?: string | null;
};

export type DshPickupSessionResponse = {
  readonly session: DshPickupSession;
};

export type DshPickupSessionListResponse = {
  readonly sessions: readonly DshPickupSession[];
};

export type DshVerifyPickupOtpRequest = components["schemas"]["DshVerifyPickupOtpRequest"];
export type DshExtendPickupWindowRequest = components["schemas"]["DshExtendPickupWindowRequest"];
export type DshPickupMarkReadyResponse = components["schemas"]["DshPickupMarkReadyResponse"];
export type DshPickupCustomerArrivedResponse = components["schemas"]["DshPickupCustomerArrivedResponse"];
export type DshPickupNotifyResponse = components["schemas"]["DshPickupNotifyResponse"] & {
  readonly session?: DshPickupSession;
};

/** Runtime error codes emitted by the governed pickup HTTP boundary. */
export type PickupErrorCode =
  | "NOT_FOUND"
  | "VERSION_CONFLICT"
  | "PICKUP_COMMAND_CONFLICT"
  | "PICKUP_COMMAND_IN_PROGRESS"
  | "PICKUP_CANCELLED"
  | "PICKUP_CODE_ALREADY_USED"
  | "PICKUP_CODE_EXPIRED"
  | "PICKUP_CODE_ATTEMPTS_EXCEEDED"
  | "PICKUP_CODE_INVALID"
  | "PICKUP_INVALID_TRANSITION"
  | "PICKUP_OTP_DELIVERY_FAILED"
  | "PICKUP_UNAVAILABLE"
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
