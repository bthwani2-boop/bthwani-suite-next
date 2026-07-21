import type {
  DshCart,
  DshCartState,
  DshFulfillmentModeAvailability,
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

function serviceabilityCheckingState(): DshServiceabilityState {
  return { kind: "checking" };
}

export function serviceabilityServiceableState(
  availableModes: readonly DshFulfillmentModeAvailability[],
): DshServiceabilityState {
  return { kind: "serviceable", availableModes };
}

export function serviceabilityBlockedState(
  code: DshServiceabilityCode,
  availableModes: readonly DshFulfillmentModeAvailability[],
  reason?: string,
): DshServiceabilityState {
  return reason !== undefined
    ? { kind: "blocked", code, reason, availableModes }
    : { kind: "blocked", code, availableModes };
}

export function serviceabilityErrorState(message: string): DshServiceabilityState {
  return { kind: "error", message };
}
