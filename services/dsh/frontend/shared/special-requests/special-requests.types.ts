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

export type SpecialRequestStatus = NonNullable<components["schemas"]["DshSpecialRequestResponse"]["status"]>;


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
