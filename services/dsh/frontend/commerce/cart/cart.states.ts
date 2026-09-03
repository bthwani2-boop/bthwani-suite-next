import type {
  DshCart,
  DshCartState,
  DshFulfillmentModeAvailability,
  DshServiceabilityResult,
  DshServiceabilityState,
  DshServiceabilityCode,
} from "./cart.types";

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

export function serviceabilityServiceableState(
  result: DshServiceabilityResult,
  availableModes: readonly DshFulfillmentModeAvailability[],
): DshServiceabilityState {
  return { kind: "serviceable", result, availableModes };
}

export function serviceabilityBlockedState(
  result: DshServiceabilityResult,
  code: DshServiceabilityCode,
  availableModes: readonly DshFulfillmentModeAvailability[],
  reason?: string,
): DshServiceabilityState {
  return reason !== undefined
    ? { kind: "blocked", result, code, reason, availableModes }
    : { kind: "blocked", result, code, availableModes };
}

export function serviceabilityErrorState(message: string): DshServiceabilityState {
  return { kind: "error", message };
}
