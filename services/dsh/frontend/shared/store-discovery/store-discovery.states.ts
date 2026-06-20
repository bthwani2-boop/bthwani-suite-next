import type { DshStoreCardViewModel } from "./store-discovery.view-model.js";

export type DshStoreListState =
  | { readonly kind: "loading" }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "service_unavailable" }
  | {
      readonly kind: "success";
      readonly stores: readonly DshStoreCardViewModel[];
      readonly total: number;
      readonly limit: number;
      readonly offset: number;
    };

export function loadingState(): DshStoreListState {
  return { kind: "loading" };
}

export function emptyState(): DshStoreListState {
  return { kind: "empty" };
}

export function errorState(message: string): DshStoreListState {
  return { kind: "error", message };
}

export function serviceUnavailableState(): DshStoreListState {
  return { kind: "service_unavailable" };
}

export function successState(
  stores: readonly DshStoreCardViewModel[],
  total: number,
  limit: number,
  offset: number,
): DshStoreListState {
  if (stores.length === 0 && offset === 0) {
    return emptyState();
  }
  return { kind: "success", stores, total, limit, offset };
}
