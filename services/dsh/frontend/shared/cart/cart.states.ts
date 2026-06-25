import type { DshCart, DshCartState, DshServiceabilityState, DshServiceabilityCode } from "./cart.types";

export function loadingState(): DshCartState {
  return { kind: "loading" };
}

export function emptyState(): DshCartState {
  return { kind: "empty" };
}

export function successState(cart: DshCart): DshCartState {
  return { kind: "success", cart };
}

export function errorState(message: string): DshCartState {
  return { kind: "error", message };
}

export function offlineState(): DshCartState {
  return { kind: "offline" };
}

export function permissionDeniedState(): DshCartState {
  return { kind: "permission_denied" };
}

export function serviceabilityIdleState(): DshServiceabilityState {
  return { kind: "idle" };
}

export function serviceabilityCheckingState(): DshServiceabilityState {
  return { kind: "checking" };
}

export function serviceabilityServiceableState(): DshServiceabilityState {
  return { kind: "serviceable" };
}

export function serviceabilityBlockedState(
  code: DshServiceabilityCode,
  reason?: string,
): DshServiceabilityState {
  return reason !== undefined ? { kind: "blocked", code, reason } : { kind: "blocked", code };
}

export function serviceabilityErrorState(message: string): DshServiceabilityState {
  return { kind: "error", message };
}
