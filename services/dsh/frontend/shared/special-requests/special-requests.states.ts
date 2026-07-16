import type { DshSpecialRequestResponse } from "./special-requests.types";

export type DshSpecialRequestState =
  | { readonly kind: "idle" }
  | { readonly kind: "validating" }
  | { readonly kind: "submitting" }
  | { readonly kind: "submitted"; readonly request: DshSpecialRequestResponse }
  | { readonly kind: "recoverable_error"; readonly message: string }
  | { readonly kind: "offline" }
  | { readonly kind: "conflict"; readonly message: string };

export type DshSpecialRequestListLoadState = "loading" | "success" | "empty" | "error";

export function specialRequestIdleState(): DshSpecialRequestState {
  return { kind: "idle" };
}

export function specialRequestValidatingState(): DshSpecialRequestState {
  return { kind: "validating" };
}

export function specialRequestSubmittingState(): DshSpecialRequestState {
  return { kind: "submitting" };
}

export function specialRequestSubmittedState(request: DshSpecialRequestResponse): DshSpecialRequestState {
  return { kind: "submitted", request };
}

export function specialRequestRecoverableErrorState(message: string): DshSpecialRequestState {
  return { kind: "recoverable_error", message };
}

export function specialRequestOfflineState(): DshSpecialRequestState {
  return { kind: "offline" };
}

export function specialRequestConflictState(message: string): DshSpecialRequestState {
  return { kind: "conflict", message };
}

export function specialRequestListLoadState(
  requests: readonly DshSpecialRequestResponse[],
): DshSpecialRequestListLoadState {
  return requests.length === 0 ? "empty" : "success";
}
