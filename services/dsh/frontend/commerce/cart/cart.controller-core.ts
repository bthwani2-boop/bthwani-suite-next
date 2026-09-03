import type {
  DshCart,
  DshCartState,
  DshServiceabilityResult,
  DshServiceabilityState,
} from "./cart.types";
import {
  emptyState,
  errorState,
  offlineState,
  permissionDeniedState,
  serviceabilityBlockedState,
  serviceabilityErrorState,
  serviceabilityServiceableState,
  successState,
} from "./cart.states";
import {
  classifyCartLoad,
  classifyCartLoadError,
  classifyServiceability,
} from "./cart.policy";

export { resolveQuantityRemoval, shouldLoadCart } from "./cart.policy";

export function resolveCartLoadState(cart: DshCart | null): DshCartState {
  return classifyCartLoad(cart) === "empty" ? emptyState() : successState(cart as DshCart);
}

export function resolveCartLoadError(error: { kind?: string; status?: number }): DshCartState {
  switch (classifyCartLoadError(error)) {
    case "offline":
      return offlineState();
    case "permission_denied":
      return permissionDeniedState();
    default:
      return errorState("تعذر تحميل السلة.");
  }
}

export function resolveServiceabilityState(result: DshServiceabilityResult): DshServiceabilityState {
  const availableModes = result.availableModes ?? [];
  if (classifyServiceability(result) === "serviceable") {
    return serviceabilityServiceableState(result, availableModes);
  }
  return serviceabilityBlockedState(result, result.code, availableModes, result.reason);
}

export function resolveServiceabilityError(): DshServiceabilityState {
  return serviceabilityErrorState("تعذر التحقق من توفر الخدمة.");
}
