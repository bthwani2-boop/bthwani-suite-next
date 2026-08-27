import type { CatalogState, ClientStoreCatalog } from "./client-catalog.types";

export function catalogLoadingState(): CatalogState {
  return { kind: "loading" };
}

export function catalogPermissionDeniedState(): CatalogState {
  return { kind: "permission_denied" };
}

export function catalogEmptyState(storeId?: string): CatalogState {
  return storeId === undefined ? { kind: "empty" } : { kind: "empty", storeId };
}

export function catalogErrorState(message: string): CatalogState {
  return { kind: "error", message };
}

export function catalogSuccessState(catalog: ClientStoreCatalog): CatalogState {
  return { kind: "success", catalog };
}
