import type { CatalogSubmission } from "./catalog.types";
import type { CatalogState } from "./legacy-catalog-compat.types";
import {
  type CatalogActionState,
  catalogActionConflictState,
  catalogActionErrorState,
  catalogActionSubmittingState,
  catalogActionSuccessState,
  catalogAuditErrorState,
  catalogAuditLoadingState,
  catalogAuditSuccessState,
  catalogErrorState,
  catalogLoadingState,
  catalogPermissionDeniedState,
  catalogSubmissionErrorState,
  catalogSubmissionPermissionDeniedState,
} from "./catalog.states";

export function shouldLoadAuthenticatedCatalog(authKind: string): boolean {
  return authKind === "authenticated";
}

export async function runCatalogAction(
  operation: () => Promise<unknown>,
  reload: () => Promise<void>,
  publish: (state: CatalogActionState) => void,
  publishResult: (state: CatalogActionState) => void,
): Promise<void> {
  publish(catalogActionSubmittingState());
  try {
    await operation();
    publishResult(catalogActionSuccessState());
    await reload();
  } catch (error) {
    publishResult(resolveCatalogActionError(error));
  }
}

export function resolveCatalogActionError(error: unknown): CatalogActionState {
  const typed = error as { status?: number };
  return typed.status === 409 ? catalogActionConflictState() : catalogActionErrorState();
}

export function resolveCatalogError(error: unknown): CatalogState {
  const typed = error as { kind?: string; status?: number };
  if (typed.kind === "http" && (typed.status === 401 || typed.status === 403)) {
    return catalogPermissionDeniedState();
  }
  if (typed.kind === "http" && typed.status === 409) {
    return catalogErrorState("تغيّرت نسخة الكتالوج. أعد التحميل ثم حاول مجددًا.");
  }
  if (typed.kind === "network") {
    return catalogErrorState("خدمة الكتالوج غير متاحة حاليًا.");
  }
  return catalogErrorState("تعذر تنفيذ عملية الكتالوج.");
}

export function resolveCatalogSubmissionError(error: unknown) {
  const state = resolveCatalogError(error);
  if (state.kind === "permission_denied") return catalogSubmissionPermissionDeniedState();
  if (state.kind === "error") return catalogSubmissionErrorState(state.message);
  return catalogSubmissionErrorState("تعذر تحميل طلبات اعتماد الكتالوج.");
}

export function beginCatalogAuditLoad(previousEntries: readonly CatalogSubmission[]) {
  return catalogAuditLoadingState(previousEntries);
}

export function resolveCatalogAuditSuccess(entries: readonly CatalogSubmission[]) {
  return catalogAuditSuccessState(entries);
}

export function resolveCatalogAuditError(previousEntries: readonly CatalogSubmission[]) {
  return catalogAuditErrorState(previousEntries, "تعذر تحميل سجل تدقيق الكتالوج.");
}
