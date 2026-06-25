import type { CatalogState, CatalogSubmission, CatalogSubmissionState, PartnerCatalog } from "./catalog.types";

export type CatalogActionState = "idle" | "submitting" | "success" | "error" | "conflict";

export type CatalogAuditState =
  | { readonly kind: "idle"; readonly entries: readonly CatalogSubmission[] }
  | { readonly kind: "loading"; readonly entries: readonly CatalogSubmission[] }
  | { readonly kind: "success"; readonly entries: readonly CatalogSubmission[] }
  | { readonly kind: "error"; readonly entries: readonly CatalogSubmission[]; readonly message: string };

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

export function catalogSuccessState(catalog: PartnerCatalog): CatalogState {
  return { kind: "success", catalog };
}

export function catalogSubmissionLoadingState(): CatalogSubmissionState {
  return { kind: "loading" };
}

export function catalogSubmissionPermissionDeniedState(): CatalogSubmissionState {
  return { kind: "permission_denied" };
}

export function catalogSubmissionEmptyState(): CatalogSubmissionState {
  return { kind: "empty" };
}

export function catalogSubmissionErrorState(message: string): CatalogSubmissionState {
  return { kind: "error", message };
}

export function catalogSubmissionSuccessState(
  submissions: readonly CatalogSubmission[],
): CatalogSubmissionState {
  return { kind: "success", submissions };
}

export function catalogActionIdleState(): CatalogActionState {
  return "idle";
}

export function catalogActionSubmittingState(): CatalogActionState {
  return "submitting";
}

export function catalogActionSuccessState(): CatalogActionState {
  return "success";
}

export function catalogActionErrorState(): CatalogActionState {
  return "error";
}

export function catalogActionConflictState(): CatalogActionState {
  return "conflict";
}

export function catalogAuditIdleState(): CatalogAuditState {
  return { kind: "idle", entries: [] };
}

export function catalogAuditLoadingState(
  entries: readonly CatalogSubmission[],
): CatalogAuditState {
  return { kind: "loading", entries };
}

export function catalogAuditSuccessState(
  entries: readonly CatalogSubmission[],
): CatalogAuditState {
  return { kind: "success", entries };
}

export function catalogAuditErrorState(
  entries: readonly CatalogSubmission[],
  message: string,
): CatalogAuditState {
  return { kind: "error", entries, message };
}
