import type { CatalogSubmission, PartnerCatalog } from "./catalog.types";
import {
  catalogEmptyState,
  catalogSubmissionEmptyState,
  catalogSubmissionSuccessState,
  catalogSuccessState,
} from "./catalog.states";

export function isPartnerCatalogEmpty(catalog: PartnerCatalog): boolean {
  return catalog.categories.length === 0 && catalog.products.length === 0;
}

export function resolvePartnerCatalogState(catalog: PartnerCatalog) {
  return isPartnerCatalogEmpty(catalog)
    ? catalogEmptyState(catalog.storeId)
    : catalogSuccessState(catalog);
}

export function resolvePublishedCatalogState(catalog: PartnerCatalog) {
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
