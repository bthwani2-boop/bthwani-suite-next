import type { components } from "../../../clients/generated/dsh-catalog-api";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import * as catalogApi from "./central-catalog.api";
import type {
  CatalogAsset,
  CatalogPlatformPolicy,
  CentralCatalogDomain,
  CentralCatalogNode,
  MasterProduct,
  ProductProposal,
  StoreAssortment,
} from "./central-catalog.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "central-catalog-occ-corr");

type DomainMutationInput = components["schemas"]["UpdateDomainRequest"];
type NodeMutationInput = components["schemas"]["UpdateNodeRequest"];
type ProductMutationInput = components["schemas"]["UpdateMasterProductRequest"];
type ProposalDecisionInput = components["schemas"]["ProposalDecisionRequest"];
type ProposalTransitionInput = components["schemas"]["ProposalTransitionRequest"];
type PolicyMutationInput = components["schemas"]["UpdatePolicyRequest"];
type AssortmentMutationInput = components["schemas"]["UpsertAssortmentRequest"];
type ProposalMutationInput = components["schemas"]["UpdateProposalRequest"];
type AssetMutationInput = components["schemas"]["UpdateAssetRequest"];
type AssetReviewInput = components["schemas"]["ReviewAssetRequest"];

export async function updateCatalogDomainOCC(
  domainId: string,
  input: DomainMutationInput,
): Promise<CentralCatalogDomain> {
  const response = await request<{ domain: CentralCatalogDomain }>(
    `/dsh/operator/catalog/domains/${encodeURIComponent(domainId)}`,
    { method: "PATCH", body: input },
  );
  return response.domain;
}

export async function updateCatalogNodeOCC(
  nodeId: string,
  input: NodeMutationInput,
): Promise<CentralCatalogNode> {
  const response = await request<{ node: CentralCatalogNode }>(
    `/dsh/operator/catalog/nodes/${encodeURIComponent(nodeId)}`,
    { method: "PATCH", body: input },
  );
  return response.node;
}

export async function updateMasterProductOCC(
  productId: string,
  input: ProductMutationInput,
): Promise<MasterProduct> {
  const response = await request<{ masterProduct: MasterProduct }>(
    `/dsh/operator/catalog/master-products/${encodeURIComponent(productId)}`,
    { method: "PATCH", body: input },
  );
  return response.masterProduct;
}

export async function decideProductProposalOCC(
  proposalId: string,
  input: ProposalDecisionInput,
): Promise<ProductProposal> {
  const response = await request<{ proposal: ProductProposal }>(
    `/dsh/operator/catalog/product-proposals/${encodeURIComponent(proposalId)}/decision`,
    { method: "POST", body: input },
  );
  return response.proposal;
}

export async function transitionProductProposalOCC(
  proposalId: string,
  input: ProposalTransitionInput,
): Promise<ProductProposal> {
  const response = await request<{ proposal: ProductProposal }>(
    `/dsh/operator/catalog/product-proposals/${encodeURIComponent(proposalId)}/transition`,
    { method: "POST", body: input },
  );
  return response.proposal;
}

export async function updateCatalogPlatformPolicyOCC(
  policyId: string,
  input: PolicyMutationInput,
): Promise<CatalogPlatformPolicy> {
  const response = await request<{ policy: CatalogPlatformPolicy }>(
    `/dsh/operator/catalog/platform-policies/${encodeURIComponent(policyId)}`,
    { method: "PATCH", body: input },
  );
  return response.policy;
}

export type StoreAssortmentOCCInput = AssortmentMutationInput;

export async function upsertOperatorStoreAssortmentOCC(
  storeId: string,
  masterProductId: string,
  input: StoreAssortmentOCCInput,
): Promise<StoreAssortment> {
  const response = await request<{ assortment: StoreAssortment }>(
    `/dsh/operator/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(masterProductId)}`,
    { method: "PUT", body: input },
  );
  return response.assortment;
}

export async function upsertPartnerStoreAssortmentOCC(
  storeId: string,
  masterProductId: string,
  input: StoreAssortmentOCCInput,
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
  input: StoreAssortmentOCCInput,
): Promise<StoreAssortment> {
  const response = await request<{ assortment: StoreAssortment }>(
    `/dsh/field/partners/${encodeURIComponent(partnerId)}/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(masterProductId)}`,
    { method: "PUT", body: input },
  );
  return response.assortment;
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

export type CatalogAssetUpdateOCCInput = Omit<AssetMutationInput, "expectedVersion"> & {
  readonly expectedVersion?: number;
};

export async function updateCatalogAssetOCC(assetId: string, input: CatalogAssetUpdateOCCInput): Promise<CatalogAsset> {
  const expectedVersion = await resolveAssetVersion(assetId, input.expectedVersion);
  const response = await request<{ asset: CatalogAsset }>(
    `/dsh/operator/catalog/assets/${encodeURIComponent(assetId)}`,
    { method: "PATCH", body: { ...input, expectedVersion } satisfies AssetMutationInput },
  );
  return response.asset;
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

export type ProductProposalPatchOCCInput = ProposalMutationInput;

export async function updatePartnerProductProposalOCC(
  proposalId: string,
  input: ProductProposalPatchOCCInput,
): Promise<ProductProposal> {
  const response = await request<{ proposal: ProductProposal }>(
    `/dsh/partner/catalog/product-proposals/${encodeURIComponent(proposalId)}`,
    { method: "PUT", body: input },
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
    { method: "PUT", body: input },
  );
  return response.proposal;
}
