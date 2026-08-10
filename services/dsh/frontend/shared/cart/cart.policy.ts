export type CartLoadClassification = "empty" | "success";
export type CartErrorClassification = "offline" | "permission_denied" | "error";
export type ServiceabilityClassification = "serviceable" | "blocked";

export function shouldLoadCart(authKind: string, storeId: string | undefined): boolean {
  return authKind === "authenticated" && storeId !== undefined && storeId !== "";
}

export function classifyCartLoad(cart: { readonly items?: readonly unknown[] } | null): CartLoadClassification {
  return !cart || !cart.items || cart.items.length === 0 ? "empty" : "success";
}

export function classifyCartLoadError(error: { kind?: string; status?: number }): CartErrorClassification {
  if (error.kind === "network") return "offline";
  if (error.kind === "http" && (error.status === 401 || error.status === 403)) {
    return "permission_denied";
  }
  return "error";
}

export function classifyServiceability(result: { readonly serviceable?: boolean }): ServiceabilityClassification {
  return result.serviceable ? "serviceable" : "blocked";
}

export function resolveQuantityRemoval(currentQuantity: number, newQuantity: number): "remove" | "update" {
  return newQuantity < 1 && currentQuantity >= 1 ? "remove" : "update";
}
