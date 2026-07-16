import type { components } from "../../../clients/generated/dsh-api";

export type DshCreateSpecialRequest = components["schemas"]["DshCreateSpecialRequest"];
export type DshSpecialRequestResponse = components["schemas"]["DshSpecialRequestResponse"];
export type DshSpecialRequestListResponse = components["schemas"]["DshSpecialRequestListResponse"];
export type DshUpdateSpecialRequest = components["schemas"]["DshUpdateSpecialRequest"];

/**
 * The generated `DshCreateSpecialRequest.requestType` field IS already a
 * literal `"SHEIN_ASSISTED_PURCHASE" | "AWNAK_ERRAND"` union — re-export it
 * rather than redeclaring it.
 */
export type SpecialRequestType = DshCreateSpecialRequest["requestType"];

/**
 * `DshSpecialRequestResponse.status` and `DshUpdateSpecialRequest.status`
 * are typed as plain `string`/a partial transition-only union on the
 * generated response schema (the OpenAPI response contract widens `status`
 * to `string`). This hand-declared 9-value union is the deliberate, single
 * source of truth for the frontend's narrower status model — NOT a
 * duplicate of a generated enum, since no such enum exists on the response
 * schema to duplicate.
 */
export type SpecialRequestStatus =
  | "submitted"
  | "under_review"
  | "needs_customer_input"
  | "approved"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected";

export type SpecialRequestErrorKind =
  | "network"
  | "conflict"
  | "not_found"
  | "forbidden"
  | "invalid"
  | "unavailable"
  | "unknown";

export type ClassifiedSpecialRequestError = {
  readonly kind: SpecialRequestErrorKind;
  readonly message?: string;
};
