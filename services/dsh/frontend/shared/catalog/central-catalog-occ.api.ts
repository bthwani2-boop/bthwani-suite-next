import type { operations } from "../../../clients/generated/dsh-api";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import * as catalogApi from "./central-catalog.api";
import type { CatalogAsset, CentralCatalogDomain, CentralCatalogNode, MasterProduct, ProductProposal, StoreAssortment, StoreAssortmentCreateInput, StoreAssortmentCommercialReadback, StoreAssortmentInventory, StoreAssortmentInventoryInput, StoreAssortmentPrice, StoreAssortmentPriceInput, StoreAssortmentMetadataInput, StoreAssortmentMetadataUpdateInput } from "./central-catalog.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "central-catalog-occ-corr");

type DomainMutationInput = NonNullable<operations["updateCatalogDomain"]["requestBody"]>["content"]["application/json"] & { readonly expectedVersion: number };
type NodeMutationInput = NonNullable<operations["updateCatalogNode"]["requestBody"]>["content"]["application/json"] & { readonly expectedVersion: number };
type ProductMutationInput = NonNullable<operations["updateMasterProduct"]["requestBody"]>["content"]["application/json"] & { readonly expectedVersion: number };
type ProposalTransitionInput = Parameters<typeof catalogApi.transitionProductProposal>[1] & { readonly expectedVersion: number };
type OperatorMetadataMutationInput = Parameters<typeof catalogApi.upsertOperatorStoreAssortmentMetadata>[2];
type AssetReviewInput = NonNullable<operations["reviewCatalogAsset"]["requestBody"]>["content"]["application/json"] & { readonly expectedVersion: number };

export async function updateCatalogDomainOCC(domainId: string, input: DomainMutationInput): Promise<CentralCatalogDomain> {
  const response = await request<{ domain: CentralCatalogDomain }>(
    `/dsh/operator/catalog/domains/${encodeURIComponent(domainId)}`,
    { method: "PATCH", body: input },
  );
  return response.domain;
}

export async function updateCatalogNodeOCC(nodeId: string, input: NodeMutationInput): Promise<CentralCatalogNode> {
  const response = await request<{ node: CentralCatalogNode }>(
    `/dsh/operator/catalog/nodes/${encodeURIComponent(nodeId)}`,
    { method: "PATCH", body: input },
  );
  return response.node;
}

export async function updateMasterProductOCC(productId: string, input: ProductMutationInput): Promise<MasterProduct> {
  const response = await request<{ masterProduct: MasterProduct }>(
    `/dsh/operator/catalog/master-products/${encodeURIComponent(productId)}`,
    { method: "PATCH", body: input },
  );
  return response.masterProduct;
}

export type ProductProposalTransitionOCCInput = Omit<
  ProposalTransitionInput,
  "adoptedMasterProductId" | "createMasterProduct"
> & {
  readonly adoptedMasterProductId?: string | null | undefined;
  readonly createMasterProduct?: boolean | undefined;
  readonly mergeData?: boolean | undefined;
};

export async function transitionProductProposalOCC(
  proposalId: string,
  input: ProductProposalTransitionOCCInput,
): Promise<ProductProposal> {
  const response = await request<{ proposal: ProductProposal }>(
    `/dsh/operator/catalog/product-proposals/${encodeURIComponent(proposalId)}/transition`,
    { method: "POST", body: input },
  );
  return response.proposal;
}

export type OperatorStoreAssortmentMetadataOCCInput = Omit<OperatorMetadataMutationInput, "expectedVersion"> & {
  readonly expectedVersion?: number | undefined;
};

export async function upsertOperatorStoreAssortmentMetadataOCC(
  storeId: string,
  masterProductId: string,
  input: OperatorStoreAssortmentMetadataOCCInput,
): Promise<StoreAssortment> {
  return catalogApi.upsertOperatorStoreAssortmentMetadata(
    storeId,
    masterProductId,
    input,
  );
}

export type CreateStoreAssortmentWithCommercialTruthInput = {
  readonly metadata: StoreAssortmentCreateInput;
  readonly inventory: Omit<StoreAssortmentInventoryInput, "expectedVersion">;
  readonly price: StoreAssortmentPriceInput;
  readonly idempotencyKey?: string | undefined;
};

async function assertCommercialReadback(
  assortment: StoreAssortment,
  readback: StoreAssortmentCommercialReadback,
  createdPriceId: string,
): Promise<void> {
  if (readback.inventory.storeAssortmentId !== assortment.id
    || !readback.prices.some((price) => price.id === createdPriceId)) {
    throw new Error("CATALOG_ASSORTMENT_COMMERCIAL_READBACK_MISMATCH");
  }
}

export async function createOperatorStoreAssortmentWithCommercialTruth(
  storeId: string,
  masterProductId: string,
  input: CreateStoreAssortmentWithCommercialTruthInput,
): Promise<{
  readonly assortment: StoreAssortment;
  readonly inventory: StoreAssortmentInventory;
  readonly price: StoreAssortmentPrice;
  readonly readback: StoreAssortmentCommercialReadback;
}> {
  const assortment = await catalogApi.upsertOperatorStoreAssortmentMetadata(
    storeId,
    masterProductId,
    input.metadata,
  );
  const currentInventory = await catalogApi.fetchOperatorStoreAssortmentInventory(storeId, masterProductId);
  const inventory = await catalogApi.upsertOperatorStoreAssortmentInventory(
    storeId,
    masterProductId,
    { ...input.inventory, expectedVersion: currentInventory.version },
  );
  const price = await catalogApi.createOperatorStoreAssortmentPrice(
    storeId,
    masterProductId,
    input.price,
    input.idempotencyKey,
  );
  const readback = await catalogApi.fetchOperatorStoreAssortmentCommercial(storeId, masterProductId);
  await assertCommercialReadback(assortment, readback, price.id);
  return { assortment, inventory, price, readback };
}

export async function createPartnerStoreAssortment(
  storeId: string,
  masterProductId: string,
  input: StoreAssortmentCreateInput,
): Promise<StoreAssortment> {
  const response = await request<{ assortment: StoreAssortment }>(
    `/dsh/partner/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(masterProductId)}`,
    { method: "PUT", body: input },
  );
  return response.assortment;
}

export async function createPartnerStoreAssortmentWithCommercialTruth(
  storeId: string,
  masterProductId: string,
  input: CreateStoreAssortmentWithCommercialTruthInput,
): Promise<{
  readonly assortment: StoreAssortment;
  readonly inventory: StoreAssortmentInventory;
  readonly price: StoreAssortmentPrice;
  readonly readback: StoreAssortmentCommercialReadback;
}> {
  const assortment = await createPartnerStoreAssortment(storeId, masterProductId, input.metadata);
  const currentInventory = await catalogApi.fetchPartnerStoreAssortmentInventory(storeId, masterProductId);
  const inventory = await catalogApi.upsertPartnerStoreAssortmentInventory(
    storeId,
    masterProductId,
    { ...input.inventory, expectedVersion: currentInventory.version },
  );
  const price = await catalogApi.createPartnerStoreAssortmentPrice(
    storeId,
    masterProductId,
    input.price,
    input.idempotencyKey,
  );
  const readback = await catalogApi.fetchPartnerStoreAssortmentCommercial(storeId, masterProductId);
  await assertCommercialReadback(assortment, readback, price.id);
  return { assortment, inventory, price, readback };
}

export async function updatePartnerStoreAssortmentMetadataOCC(
  storeId: string,
  masterProductId: string,
  input: StoreAssortmentMetadataUpdateInput,
): Promise<StoreAssortment> {
  const response = await request<{ assortment: StoreAssortment }>(
    `/dsh/partner/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(masterProductId)}`,
    { method: "PUT", body: input },
  );
  return response.assortment;
}

export async function upsertFieldStoreAssortmentOCC(
  partnerId: string,
  storeId: string,
  masterProductId: string,
  input: FieldStoreAssortmentOCCInput,
): Promise<StoreAssortment> {
  const response = await request<{ assortment: StoreAssortment }>(
    `/dsh/field/partners/${encodeURIComponent(partnerId)}/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(masterProductId)}`,
    { method: "PUT", body: input },
  );
  return response.assortment;
}

export type FieldStoreAssortmentOCCInput = Omit<StoreAssortmentMetadataInput, "expectedVersion"> & {
  readonly expectedVersion?: number | undefined;
  readonly inventory: StoreAssortmentInventoryInput;
  readonly price: StoreAssortmentPriceInput;
};

export type FieldStoreAssortmentBatchItem = FieldStoreAssortmentOCCInput & {
  readonly masterProductId: string;
};

export type FieldStoreAssortmentBatchResult = {
  readonly index: number;
  readonly masterProductId: string;
  readonly status: "saved" | "failed";
  readonly assortment?: StoreAssortment;
  readonly code?: string;
  readonly message?: string;
  readonly currentVersion?: number;
  readonly expectedVersion?: number;
};

export type FieldStoreAssortmentBatchResponse = {
  readonly results: readonly FieldStoreAssortmentBatchResult[];
  readonly succeeded: number;
  readonly failed: number;
};

export async function upsertFieldStoreAssortmentBatchOCC(
  partnerId: string,
  storeId: string,
  items: readonly FieldStoreAssortmentBatchItem[],
): Promise<FieldStoreAssortmentBatchResponse> {
  if (items.length === 0 || items.length > 100) {
    throw new Error("FIELD_ASSORTMENT_BATCH_SIZE_INVALID");
  }
  return request<FieldStoreAssortmentBatchResponse>(
    `/dsh/field/partners/${encodeURIComponent(partnerId)}/stores/${encodeURIComponent(storeId)}/assortment/batch`,
    { method: "POST", body: { items } },
  );
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

export type CatalogAssetReviewOCCInput = Omit<AssetReviewInput, "expectedVersion"> & {
  readonly expectedVersion?: number;
};

export async function reviewCatalogAssetOCC(assetId: string, input: CatalogAssetReviewOCCInput): Promise<CatalogAsset> {
  const expectedVersion = await resolveAssetVersion(assetId, input.expectedVersion);
  const response = await request<{ asset: CatalogAsset }>(
    `/dsh/operator/catalog/assets/${encodeURIComponent(assetId)}/review`,
    { method: "POST", body: { ...input, expectedVersion } satisfies AssetReviewInput },
  );
  return response.asset;
}
