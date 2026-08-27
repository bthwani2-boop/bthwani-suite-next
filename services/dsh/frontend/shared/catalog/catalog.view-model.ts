import type { CatalogSubmission } from "./catalog.types";
import type { ClientStoreCatalog } from "./client-catalog.types";
import {
  catalogEmptyState,
  catalogSubmissionEmptyState,
  catalogSubmissionSuccessState,
  catalogSuccessState,
} from "./catalog.states";

export function isPartnerCatalogEmpty(catalog: ClientStoreCatalog): boolean {
  return catalog.categories.length === 0 && catalog.products.length === 0;
}

export function resolvePublishedCatalogState(catalog: ClientStoreCatalog) {
  return catalog.products.length === 0
    ? catalogEmptyState(catalog.storeId)
    : catalogSuccessState(catalog);
}

export function resolveCatalogSubmissionState(
  submissions: readonly CatalogSubmission[],
) {
  return submissions.length === 0
    ? catalogSubmissionEmptyState()
    : catalogSubmissionSuccessState(submissions);
}
