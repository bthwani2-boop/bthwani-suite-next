import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import * as catalogApi from "./central-catalog.api";
import type { CatalogAsset, ProductProposal, StoreAssortment } from "./central-catalog.types";

export type StoreAssortmentOCCInput = Parameters<typeof catalogApi.upsertOperatorStoreAssortment>[2] & {
  readonly expectedVersion?: number;
};

export async function upsertOperatorStoreAssortmentOCC(
  storeId: string,
  masterProductId: string,
  input: StoreAssortmentOCCInput,
): Promise<StoreAssortment> {
  return catalogApi.upsertOperatorStoreAssortment(storeId, masterProductId, input);
}

export async function upsertPartnerStoreAssortmentOCC(
  storeId: string,
  masterProductId: string,
  input: StoreAssortmentOCCInput,
): Promise<StoreAssortment> {
  return catalogApi.upsertPartnerStoreAssortment(storeId, masterProductId, input);
}

export async function upsertFieldStoreAssortmentOCC(
  partnerId: string,
  storeId: string,
  masterProductId: string,
  input: StoreAssortmentOCCInput,
): Promise<StoreAssortment> {
  return catalogApi.upsertFieldStoreAssortment(partnerId, storeId, masterProductId, input);
}

export type CatalogAssetUpdateOCCInput = Parameters<typeof catalogApi.updateCatalogAsset>[1] & {
  readonly expectedVersion: number;
};

export async function updateCatalogAssetOCC(assetId: string, input: CatalogAssetUpdateOCCInput): Promise<CatalogAsset> {
  return catalogApi.updateCatalogAsset(assetId, input);
}

export type CatalogAssetReviewOCCInput = Parameters<typeof catalogApi.reviewCatalogAsset>[1] & {
  readonly expectedVersion: number;
};

export async function reviewCatalogAssetOCC(assetId: string, input: CatalogAssetReviewOCCInput): Promise<CatalogAsset> {
  return catalogApi.reviewCatalogAsset(assetId, input);
}

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "central-catalog-occ-corr");

export interface ProductProposalPatchOCCInput {
  readonly proposedNameAr?: string;
  readonly proposedNameEn?: string;
  readonly brand?: string;
  readonly barcode?: string | null;
  readonly imageObjectKey?: string | null;
  readonly expectedVersion: number;
}

export async function updatePartnerProductProposalOCC(
  proposalId: string,
  input: ProductProposalPatchOCCInput,
): Promise<ProductProposal> {
  const response = await request<{ proposal: ProductProposal }>(
    `/dsh/partner/catalog/product-proposals/${encodeURIComponent(proposalId)}`,
    { method: "PATCH", body: input },
  );
  return response.proposal;
}

export async function updateFieldProductProposalOCC(
  partnerId: string,
  proposalId: string,
  input: ProductProposalPatchOCCInput,
): Promise<ProductProposal> {
  const response = await request<{ proposal: ProductProposal }>(
    `/dsh/field/partners/${encodeURIComponent(partnerId)}/catalog/product-proposals/${encodeURIComponent(proposalId)}`,
    { method: "PATCH", body: input },
  );
  return response.proposal;
}
