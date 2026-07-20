import { deleteCatalogAsset } from "./central-catalog.api";
import { reviewCatalogAssetOCC } from "./central-catalog-occ.api";

export * from "./catalog.types";
export * from "./client-catalog.types";
export * from "./client-catalog.api";
export * from "./catalog.states";
export * from "./catalog.view-model";
export * from "./use-catalog-controller";
export * from "./use-catalog-approval-controller";
export * from "./catalog-registry";
export * from "./central-catalog.types";
export * from "./central-catalog.api";
export * from "./central-catalog-occ.api";
export {
  updateCatalogAssetOCC as updateCatalogAsset,
} from "./central-catalog-occ.api";

/**
 * Governed asset decision facade.
 *
 * The sovereign review contract accepts only approved/rejected. Archiving is a
 * lifecycle delete operation and must use DELETE /catalog/assets/{assetId}; it
 * must never be smuggled through the review endpoint as a third decision.
 */
export async function reviewCatalogAsset(
  assetId: string,
  input: {
    readonly decision: "approved" | "rejected" | "archived";
    readonly reviewNote?: string;
  },
) {
  if (input.decision === "archived") {
    await deleteCatalogAsset(assetId);
    return;
  }
  return reviewCatalogAssetOCC(assetId, {
    decision: input.decision,
    reviewNote: input.reviewNote ?? "",
  });
}

export * from "./use-central-catalog-controller";
export * from "./central-catalog-product-pipeline";
export * from "./central-catalog.controller-core";
export * from "./central-catalog.policy";
export * from "./central-catalog.media";
export * from "./central-catalog.permissions";
export * from "./central-catalog.bulk";
export * from "./central-catalog.errors";
export * from "./client-visible-catalog.adapter";
export * from "./store-assortment.adapter";
export * from "./product-proposal.adapter";
export * from "./catalog-quality";
export * from "./catalog-search";
