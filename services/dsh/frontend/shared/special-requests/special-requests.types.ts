import type { components } from "../../../clients/generated/dsh-api";

export type DshCreateSpecialRequest = components["schemas"]["DshCreateSpecialRequest"];
export type DshSpecialRequestResponse = components["schemas"]["DshSpecialRequestResponse"];
export type DshSpecialRequestListResponse = components["schemas"]["DshSpecialRequestListResponse"];
export type DshUpdateSpecialRequest = components["schemas"]["DshUpdateSpecialRequest"];
export type DshSpecialRequestInformationExchange = components["schemas"]["DshSpecialRequestInformationExchange"];
export type DshSpecialRequestInformationExchangeResponse = components["schemas"]["DshSpecialRequestInformationExchangeResponse"];
export type DshSpecialRequestInformationMutationResponse = components["schemas"]["DshSpecialRequestInformationMutationResponse"];
export type DshRequestSpecialRequestInformation = components["schemas"]["DshRequestSpecialRequestInformation"];
export type DshRespondSpecialRequestInformation = components["schemas"]["DshRespondSpecialRequestInformation"];
export type DshSpecialRequestExecution = components["schemas"]["DshSpecialRequestExecution"];
export type DshSpecialRequestExecutionResponse = components["schemas"]["DshSpecialRequestExecutionResponse"];
export type DshSpecialRequestFinancialReadback = components["schemas"]["DshSpecialRequestFinancialReadback"];

/** The generated requestType field is the sovereign literal union. */
export type SpecialRequestType = DshCreateSpecialRequest["requestType"];
export type SpecialRequestStatus = NonNullable<DshSpecialRequestResponse["status"]>;

export type SpecialRequestDetailBundle = {
  readonly informationExchange: DshSpecialRequestInformationExchange | null;
  readonly execution: DshSpecialRequestExecution;
  readonly financial: DshSpecialRequestFinancialReadback;
};

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
