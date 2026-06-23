import type { DshCart, DshCartState, DshServiceabilityResult, DshServiceabilityState } from "./cart.types";
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

export function shouldLoadCart(authKind: string, storeId: string | undefined): boolean {
  return authKind === "authenticated" && storeId !== undefined && storeId !== "";
}

export function resolveCartLoadState(cart: DshCart | null): DshCartState {
  if (!cart || cart.items.length === 0) return emptyState();
  return successState(cart);
}

export function resolveCartLoadError(error: { kind?: string; status?: number }): DshCartState {
  if (error.kind === "network") return offlineState();
  if (error.kind === "http" && (error.status === 401 || error.status === 403)) {
    return permissionDeniedState();
  }
  return errorState("تعذر تحميل السلة.");
}

export function resolveServiceabilityState(result: DshServiceabilityResult): DshServiceabilityState {
  if (result.serviceable) return serviceabilityServiceableState();
  return serviceabilityBlockedState(result.code, result.reason);
}

export function resolveServiceabilityError(): DshServiceabilityState {
  return serviceabilityErrorState("تعذر التحقق من توفر الخدمة.");
}

export function resolveQuantityRemoval(currentQuantity: number, newQuantity: number): "remove" | "update" {
  return newQuantity < 1 && currentQuantity >= 1 ? "remove" : "update";
}
