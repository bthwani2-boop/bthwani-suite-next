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

async function resolveAssetVersion(assetId: string, supplied?: number): Promise<number> {
  if (Number.isInteger(supplied) && (supplied ?? 0) > 0) return supplied as number;
  const limit = 200;
  let offset = 0;
  while (true) {
    const page = await catalogApi.fetchCatalogAssetsPage({ limit, offset });
    const asset = page.items.find((item) => item.id === assetId);
    if (asset) return asset.version;
    offset += page.items.length;
    if (page.items.length === 0 || offset >= page.total) break;
  }
  throw new Error("CATALOG_ASSET_NOT_LOADED");
}

export type CatalogAssetUpdateOCCInput = Parameters<typeof catalogApi.updateCatalogAsset>[1] & {
  readonly expectedVersion?: number;
};

export async function updateCatalogAssetOCC(assetId: string, input: CatalogAssetUpdateOCCInput): Promise<CatalogAsset> {
  const expectedVersion = await resolveAssetVersion(assetId, input.expectedVersion);
  const request = { ...input, expectedVersion };
  return catalogApi.updateCatalogAsset(assetId, request);
}

export type CatalogAssetReviewOCCInput = Parameters<typeof catalogApi.reviewCatalogAsset>[1] & {
  readonly expectedVersion?: number;
};

export async function reviewCatalogAssetOCC(assetId: string, input: CatalogAssetReviewOCCInput): Promise<CatalogAsset> {
  const expectedVersion = await resolveAssetVersion(assetId, input.expectedVersion);
  const request = { ...input, expectedVersion };
  return catalogApi.reviewCatalogAsset(assetId, request);
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
