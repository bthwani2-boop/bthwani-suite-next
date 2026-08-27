import type { CatalogSubmission } from "./catalog.types";
import type { CatalogState } from "./client-catalog.types";
import {
  catalogAuditErrorState,
  catalogAuditSuccessState,
  catalogErrorState,
  catalogLoadingState,
  catalogPermissionDeniedState,
} from "./catalog.states";

export function resolveCatalogError(error: unknown): CatalogState {
  const typed = error as { kind?: string; status?: number };
  if (typed.kind === "http" && (typed.status === 401 || typed.status === 403)) {
    return catalogPermissionDeniedState();
  }
  if (typed.kind === "http" && typed.status === 404) {
    return catalogErrorState("لا توجد منتجات منشورة لهذا المتجر حاليًا.");
  }
  if (typed.kind === "http" && typed.status === 409) {
    return catalogErrorState("تغيّرت نسخة الكتالوج. أعد التحميل ثم حاول مجددًا.");
  }
  if (typed.kind === "network") {
    return catalogErrorState("خدمة الكتالوج غير متاحة حاليًا.");
  }
  return catalogErrorState("تعذر تنفيذ عملية الكتالوج.");
}

export function resolveCatalogAuditSuccess(entries: readonly CatalogSubmission[]) {
  return catalogAuditSuccessState(entries);
}

export function resolveCatalogAuditError(previousEntries: readonly CatalogSubmission[]) {
  return catalogAuditErrorState(previousEntries, "تعذر تحميل سجل تدقيق الكتالوج.");
}
