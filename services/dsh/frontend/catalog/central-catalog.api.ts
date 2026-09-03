import { resolveDshApiBaseUrl } from "../shared/_kernel/dsh-api-base-url";
import { corrId, createDshHttpClient } from "../shared/_kernel/dsh-http-request";
import type { operations } from "../../clients/generated/dsh-api";
import type { CentralCatalogDomain, CentralCatalogNode, MasterProduct, ProductProposal, StoreAssortment, CatalogAsset, CatalogAssetLink, AssetUploadIntent, AssetUploadIntentInput, SeedStatus, StoreAssortmentMetadataInput, StoreAssortmentInventory, StoreAssortmentPrice, StoreAssortmentCommercialReadback } from "./central-catalog.types";

type JsonResponse<Operation extends keyof operations, Status extends keyof operations[Operation]["responses"]> =
  operations[Operation]["responses"][Status] extends { content: { "application/json": infer Body } } ? Body : never;
type JsonRequest<Operation extends keyof operations> = operations[Operation]["requestBody"] extends { content: infer Content }
  ? Content extends { "application/json": infer Body }
    ? Body
    : never
  : never;

type CatalogDomainsResponse = JsonResponse<"listCatalogDomains", 200>;
type CatalogDomainCreateInput = JsonRequest<"createCatalogDomain">;
type CatalogNodesResponse = JsonResponse<"listCatalogNodes", 200>;
type CatalogNodeCreateInput = JsonRequest<"createCatalogNode">;
type MasterProductsResponse = JsonResponse<"listMasterProductsOperator", 200>;
type MasterProductCreateInput = JsonRequest<"createMasterProduct">;
type MasterProductResponse = JsonResponse<"getMasterProductOperator", 200>;
type ProductProposalsResponse = JsonResponse<"listProductProposals", 200>;
type ProductProposalCreateInput = JsonRequest<"createPartnerProductProposal">;
type ProductProposalTransitionInput = JsonRequest<"transitionProductProposal">;
type ProductProposalResponse = JsonResponse<"transitionProductProposal", 200>;
type CatalogAssetsResponse = JsonResponse<"listCatalogAssets", 200>;
type CatalogAssetUploadIntentResponse = JsonResponse<"createAssetUploadIntent", 201>;
type CatalogAssetResponse = JsonResponse<"completeAssetUpload", 200>;
type CatalogAssetReviewInput = JsonRequest<"reviewCatalogAsset">;
type CatalogAssetResponseAfterReview = JsonResponse<"reviewCatalogAsset", 200>;
type CatalogAssetLinksResponse = JsonResponse<"listCatalogAssetLinks", 200>;
type CatalogSeedStatusResponse = JsonResponse<"getCatalogSeedStatus", 200>;
type OperatorInventoryInput = JsonRequest<"updateOperatorStoreAssortmentInventory">;
type OperatorPriceInput = JsonRequest<"createOperatorStoreAssortmentPrice">;
type PartnerInventoryInput = JsonRequest<"updatePartnerStoreAssortmentInventory">;
type PartnerPriceInput = JsonRequest<"createPartnerStoreAssortmentPrice">;
type AssortmentResponse = { readonly assortment: StoreAssortment };
type InventoryResponse = JsonResponse<"updatePartnerStoreAssortmentInventory", 200>;
type PriceResponse = JsonResponse<"createPartnerStoreAssortmentPrice", 200>;

const baseUrl = resolveDshApiBaseUrl();
const { request } = createDshHttpClient(baseUrl, "central-catalog-corr");

// ─── Operator APIs ────────────────────────────────────────────────────────────

export async function fetchCatalogDomains(): Promise<readonly CentralCatalogDomain[]> {
  const resp = await request<CatalogDomainsResponse>("/dsh/operator/catalog/domains");
  return resp.domains;
}

export async function createCatalogDomain(input: CatalogDomainCreateInput): Promise<CentralCatalogDomain> {
  const resp = await request<JsonResponse<"createCatalogDomain", 201>>("/dsh/operator/catalog/domains", {
    method: "POST",
    body: input,
  });
  return resp.domain;
}

export async function fetchCatalogNodes(query?: { domainId?: string; parentId?: string }): Promise<readonly CentralCatalogNode[]> {
  const params = new URLSearchParams();
  if (query?.domainId) params.set("domainId", query.domainId);
  if (query?.parentId) params.set("parentId", query.parentId);
  const qs = params.toString();
  const path = qs ? `/dsh/operator/catalog/nodes?${qs}` : "/dsh/operator/catalog/nodes";
  const resp = await request<CatalogNodesResponse>(path);
  return resp.nodes;
}

export async function createCatalogNode(input: CatalogNodeCreateInput): Promise<CentralCatalogNode> {
  const resp = await request<JsonResponse<"createCatalogNode", 201>>("/dsh/operator/catalog/nodes", {
    method: "POST",
    body: input,
  });
  return resp.node;
}

export async function moveCatalogNode(nodeId: string, targetParentId: string | null): Promise<CentralCatalogNode> {
  const resp = await request<{ node: CentralCatalogNode }>(`/dsh/operator/catalog/nodes/${encodeURIComponent(nodeId)}/move`, {
    method: "POST",
    body: { targetParentId },
  });
  return resp.node;
}

export async function mergeCatalogNode(nodeId: string, targetNodeId: string): Promise<void> {
  await request<{ success: boolean }>(`/dsh/operator/catalog/nodes/${encodeURIComponent(nodeId)}/merge`, {
    method: "POST",
    body: { targetNodeId },
  });
}

export async function deprecateCatalogNode(nodeId: string): Promise<CentralCatalogNode> {
  const resp = await request<{ node: CentralCatalogNode }>(`/dsh/operator/catalog/nodes/${encodeURIComponent(nodeId)}/deprecate`, {
    method: "POST",
  });
  return resp.node;
}

export interface PagedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export async function fetchMasterProductsPage(query?: {
  domainId?: string;
  categoryNodeId?: string;
  approvalStatus?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PagedResult<MasterProduct>> {
  const params = new URLSearchParams();
  if (query?.domainId) params.set("domainId", query.domainId);
  if (query?.categoryNodeId) params.set("categoryNodeId", query.categoryNodeId);
  if (query?.approvalStatus) params.set("approvalStatus", query.approvalStatus);
  if (query?.search) params.set("search", query.search);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  if (query?.offset !== undefined) params.set("offset", String(query.offset));
  const qs = params.toString();
  const path = qs ? `/dsh/operator/catalog/master-products?${qs}` : "/dsh/operator/catalog/master-products";
  const resp = await request<MasterProductsResponse>(path);
  return { items: resp.masterProducts, total: resp.total, limit: resp.limit, offset: resp.offset };
}

export async function createMasterProduct(input: MasterProductCreateInput): Promise<MasterProduct> {
  const resp = await request<JsonResponse<"createMasterProduct", 201>>("/dsh/operator/catalog/master-products", {
    method: "POST",
    body: input,
  });
  return resp.masterProduct;
}

export async function fetchMasterProductById(productId: string): Promise<MasterProduct> {
  const resp = await request<MasterProductResponse>(
    `/dsh/operator/catalog/master-products/${encodeURIComponent(productId)}`,
  );
  return resp.masterProduct;
}

export async function fetchProductProposalsPage(query?: {
  status?: string;
  storeId?: string;
  limit?: number;
  offset?: number;
}): Promise<PagedResult<ProductProposal>> {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  if (query?.storeId) params.set("storeId", query.storeId);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  if (query?.offset !== undefined) params.set("offset", String(query.offset));
  const qs = params.toString();
  const path = qs ? `/dsh/operator/catalog/product-proposals?${qs}` : "/dsh/operator/catalog/product-proposals";
  const resp = await request<ProductProposalsResponse>(path);
  return { items: resp.proposals, total: resp.total, limit: resp.limit, offset: resp.offset };
}

export type ProductProposalReadbackQuery = {
  readonly status?: string;
  readonly limit?: number;
  readonly offset?: number;
};

function buildProductProposalReadbackQuery(query?: ProductProposalReadbackQuery, storeId?: string): string {
  const params = new URLSearchParams();
  if (storeId !== undefined) {
    const normalizedStoreId = storeId.trim();
    if (!normalizedStoreId) {
      throw new Error("storeId is required for product proposal readback");
    }
    params.set("storeId", normalizedStoreId);
  }
  if (query?.status) params.set("status", query.status);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  if (query?.offset !== undefined) params.set("offset", String(query.offset));
  const value = params.toString();
  return value ? `?${value}` : "";
}

async function fetchProductProposalReadbackPage(path: string): Promise<PagedResult<ProductProposal>> {
  const response = await request<ProductProposalsResponse>(path);
  return {
    items: response.proposals,
    total: response.total,
    limit: response.limit,
    offset: response.offset,
  };
}

export async function transitionProductProposal(
  proposalId: string,
  input: ProductProposalTransitionInput,
): Promise<ProductProposal> {
  const resp = await request<ProductProposalResponse>(`/dsh/operator/catalog/product-proposals/${encodeURIComponent(proposalId)}/transition`, {
    method: "POST",
    body: input,
  });
  return resp.proposal;
}

export async function fetchOperatorStoreAssortment(storeId: string): Promise<readonly StoreAssortment[]> {
  const resp = await request<{ assortment: readonly StoreAssortment[] }>(`/dsh/operator/stores/${encodeURIComponent(storeId)}/assortment`);
  return resp.assortment;
}

export async function upsertOperatorStoreAssortmentMetadata(
  storeId: string,
  masterProductId: string,
  input: StoreAssortmentMetadataInput,
): Promise<StoreAssortment> {
  const resp = await request<AssortmentResponse>(`/dsh/operator/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(masterProductId)}`, {
    method: "PUT",
    body: input,
  });
  return resp.assortment;
}

export async function fetchOperatorStoreAssortmentInventory(
  storeId: string,
  masterProductId: string,
): Promise<StoreAssortmentInventory> {
  const resp = await request<JsonResponse<"getOperatorStoreAssortmentInventory", 200>>(
    `/dsh/operator/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(masterProductId)}/inventory`,
  );
  return resp.inventory;
}

export async function upsertOperatorStoreAssortmentInventory(
  storeId: string,
  masterProductId: string,
  input: OperatorInventoryInput,
): Promise<StoreAssortmentInventory> {
  const resp = await request<JsonResponse<"updateOperatorStoreAssortmentInventory", 200>>(
    `/dsh/operator/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(masterProductId)}/inventory`,
    { method: "PUT", body: input },
  );
  return resp.inventory;
}

export async function fetchOperatorStoreAssortmentPrices(
  storeId: string,
  masterProductId: string,
): Promise<readonly StoreAssortmentPrice[]> {
  const resp = await request<JsonResponse<"listOperatorStoreAssortmentPrices", 200>>(
    `/dsh/operator/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(masterProductId)}/prices`,
  );
  return resp.prices;
}

export async function createOperatorStoreAssortmentPrice(
  storeId: string,
  masterProductId: string,
  input: OperatorPriceInput,
  idempotencyKey = corrId("catalog-operator-price-create"),
): Promise<StoreAssortmentPrice> {
  const resp = await request<JsonResponse<"createOperatorStoreAssortmentPrice", 200>>(
    `/dsh/operator/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(masterProductId)}/prices`,
    { method: "POST", body: input, idempotencyKey },
  );
  return resp.price;
}

export async function fetchOperatorStoreAssortmentCommercial(
  storeId: string,
  masterProductId: string,
): Promise<StoreAssortmentCommercialReadback> {
  const [inventory, prices] = await Promise.all([
    fetchOperatorStoreAssortmentInventory(storeId, masterProductId),
    fetchOperatorStoreAssortmentPrices(storeId, masterProductId),
  ]);
  return { inventory, prices };
}

export async function fetchOperatorStoreAssortmentsCommercial(
  storeId: string,
  assortments: readonly StoreAssortment[],
): Promise<ReadonlyMap<string, StoreAssortmentCommercialReadback>> {
  const entries = await Promise.all(assortments.map(async (assortment) => [
    assortment.masterProductId,
    await fetchOperatorStoreAssortmentCommercial(storeId, assortment.masterProductId),
  ] as const));
  return new Map(entries);
}

// ─── Partner APIs ─────────────────────────────────────────────────────────────

export async function fetchPartnerTaxonomy(): Promise<{
  readonly domains: readonly CentralCatalogDomain[];
  readonly nodes: readonly CentralCatalogNode[];
}> {
  return request<{
    readonly domains: readonly CentralCatalogDomain[];
    readonly nodes: readonly CentralCatalogNode[];
  }>("/dsh/partner/catalog/taxonomy");
}

export async function fetchPartnerMasterProducts(query?: {
  domainId?: string;
  categoryNodeId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<readonly MasterProduct[]> {
  const params = new URLSearchParams();
  if (query?.domainId) params.set("domainId", query.domainId);
  if (query?.categoryNodeId) params.set("categoryNodeId", query.categoryNodeId);
  if (query?.search) params.set("search", query.search);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  if (query?.offset !== undefined) params.set("offset", String(query.offset));
  const qs = params.toString();
  const path = qs ? `/dsh/partner/catalog/master-products?${qs}` : "/dsh/partner/catalog/master-products";
  const resp = await request<{ masterProducts: readonly MasterProduct[] }>(path);
  return resp.masterProducts;
}

export async function upsertPartnerStoreAssortmentInventory(
  storeId: string,
  masterProductId: string,
  input: PartnerInventoryInput,
): Promise<StoreAssortmentInventory> {
  const resp = await request<InventoryResponse>(`/dsh/partner/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(masterProductId)}/inventory`, {
    method: "PUT",
    body: input,
  });
  return resp.inventory;
}

export async function fetchPartnerStoreAssortmentInventory(
  storeId: string,
  masterProductId: string,
): Promise<StoreAssortmentInventory> {
  const resp = await request<{ inventory: StoreAssortmentInventory }>(`/dsh/partner/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(masterProductId)}/inventory`);
  return resp.inventory;
}

export async function createPartnerStoreAssortmentPrice(
  storeId: string,
  masterProductId: string,
  input: PartnerPriceInput,
  idempotencyKey = corrId("catalog-price-create"),
): Promise<StoreAssortmentPrice> {
  const resp = await request<PriceResponse>(`/dsh/partner/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(masterProductId)}/prices`, {
    method: "POST",
    body: input,
    idempotencyKey,
  });
  return resp.price;
}

export async function fetchPartnerStoreAssortmentPrices(
  storeId: string,
  masterProductId: string,
): Promise<readonly StoreAssortmentPrice[]> {
  const resp = await request<{ prices: readonly StoreAssortmentPrice[] }>(`/dsh/partner/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(masterProductId)}/prices`);
  return resp.prices;
}

export async function fetchPartnerStoreAssortmentCommercial(
  storeId: string,
  masterProductId: string,
): Promise<StoreAssortmentCommercialReadback> {
  const [inventory, prices] = await Promise.all([
    fetchPartnerStoreAssortmentInventory(storeId, masterProductId),
    fetchPartnerStoreAssortmentPrices(storeId, masterProductId),
  ]);
  return { inventory, prices };
}

export async function fetchPartnerStoreAssortmentsCommercial(
  storeId: string,
  assortments: readonly StoreAssortment[],
): Promise<ReadonlyMap<string, StoreAssortmentCommercialReadback>> {
  const entries = await Promise.all(assortments.map(async (assortment) => [
    assortment.masterProductId,
    await fetchPartnerStoreAssortmentCommercial(storeId, assortment.masterProductId),
  ] as const));
  return new Map(entries);
}

export async function fetchPartnerStoreAssortment(storeId: string): Promise<readonly StoreAssortment[]> {
  const resp = await request<{ assortment: readonly StoreAssortment[] }>(`/dsh/partner/stores/${encodeURIComponent(storeId)}/assortment`);
  return resp.assortment;
}

export function fetchPartnerProductProposals(
  storeId: string,
  query?: ProductProposalReadbackQuery,
): Promise<PagedResult<ProductProposal>> {
  return fetchProductProposalReadbackPage(
    `/dsh/partner/catalog/product-proposals${buildProductProposalReadbackQuery(query, storeId)}`,
  );
}

export async function createPartnerProductProposal(input: {
  readonly storeId: string;
} & ProductProposalCreateInput & {
  readonly idempotencyKey?: string;
}): Promise<ProductProposal> {
  const storeId = input.storeId.trim();
  if (!storeId) {
    throw new Error("storeId is required for partner product proposals");
  }
  const { storeId: ignoredStoreId, idempotencyKey, ...requestBody } = input;
  void ignoredStoreId;
  const resp = await request<JsonResponse<"createPartnerProductProposal", 201>>(
    `/dsh/partner/catalog/product-proposals?storeId=${encodeURIComponent(storeId)}`,
    {
      method: "POST",
      body: requestBody,
      idempotencyKey: idempotencyKey ?? corrId("catalog-proposal-create"),
    },
  );
  return resp.proposal;
}

export async function withdrawPartnerProductProposal(proposalId: string, expectedVersion: number): Promise<ProductProposal> {
  const resp = await request<JsonResponse<"post_dsh_partner_catalog_product_proposals__proposalId__withdraw", 200>>(`/dsh/partner/catalog/product-proposals/${encodeURIComponent(proposalId)}/withdraw`, {
    method: "POST",
    body: { expectedVersion },
  });
  return resp.proposal;
}

// ─── Field APIs ───────────────────────────────────────────────────────────────

export async function fetchFieldTaxonomy(): Promise<{
  readonly domains: readonly CentralCatalogDomain[];
  readonly nodes: readonly CentralCatalogNode[];
}> {
  return request<{
    readonly domains: readonly CentralCatalogDomain[];
    readonly nodes: readonly CentralCatalogNode[];
  }>("/dsh/field/catalog/taxonomy");
}

export async function fetchFieldMasterProducts(query?: {
  domainId?: string;
  categoryNodeId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<readonly MasterProduct[]> {
  const params = new URLSearchParams();
  if (query?.domainId) params.set("domainId", query.domainId);
  if (query?.categoryNodeId) params.set("categoryNodeId", query.categoryNodeId);
  if (query?.search) params.set("search", query.search);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  if (query?.offset !== undefined) params.set("offset", String(query.offset));
  const qs = params.toString();
  const path = qs ? `/dsh/field/catalog/master-products?${qs}` : "/dsh/field/catalog/master-products";
  const resp = await request<{ masterProducts: readonly MasterProduct[] }>(path);
  return resp.masterProducts;
}

export async function fetchFieldStoreAssortment(partnerId: string): Promise<{
  readonly storeId: string;
  readonly assortment: readonly StoreAssortment[];
  readonly commercial: ReadonlyMap<string, StoreAssortmentCommercialReadback>;
}> {
  const response = await request<{
    readonly storeId: string;
    readonly assortment: readonly StoreAssortment[];
    readonly commercial: Readonly<Record<string, StoreAssortmentCommercialReadback>>;
  }>(`/dsh/field/partners/${encodeURIComponent(partnerId)}/assortment`);
  return { ...response, commercial: new Map(Object.entries(response.commercial ?? {})) };
}

export async function createFieldProductProposal(partnerId: string, input: ProductProposalCreateInput, idempotencyKey = corrId("catalog-field-proposal-create")): Promise<ProductProposal> {
  const resp = await request<JsonResponse<"createFieldProductProposal", 201>>(`/dsh/field/partners/${encodeURIComponent(partnerId)}/catalog/product-proposals`, {
    method: "POST",
    body: input,
    idempotencyKey,
  });
  return resp.proposal;
}

export async function withdrawFieldProductProposal(partnerId: string, proposalId: string, expectedVersion: number): Promise<ProductProposal> {
  const resp = await request<JsonResponse<"post_dsh_partner_catalog_product_proposals__proposalId__withdraw", 200>>(`/dsh/field/partners/${encodeURIComponent(partnerId)}/catalog/product-proposals/${encodeURIComponent(proposalId)}/withdraw`, {
    method: "POST",
    body: { expectedVersion },
  });
  return resp.proposal;
}

export function fetchFieldProductProposals(
  partnerId: string,
  query?: ProductProposalReadbackQuery,
): Promise<PagedResult<ProductProposal>> {
  return fetchProductProposalReadbackPage(
    `/dsh/field/partners/${encodeURIComponent(partnerId)}/catalog/product-proposals${buildProductProposalReadbackQuery(query)}`,
  );
}

// ─── Public Published Catalog ──────────────────────────────────────────────────

export async function fetchSeedStatus(): Promise<SeedStatus> {
  return request<CatalogSeedStatusResponse>("/dsh/operator/catalog/seed-status");
}

export async function fetchCatalogAssetsPage(query?: { status?: string; limit?: number; offset?: number }): Promise<PagedResult<CatalogAsset>> {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  if (query?.offset !== undefined) params.set("offset", String(query.offset));
  const qs = params.toString();
  const path = qs ? `/dsh/operator/catalog/assets?${qs}` : "/dsh/operator/catalog/assets";
  const resp = await request<CatalogAssetsResponse>(path);
  return { items: resp.assets, total: resp.total, limit: resp.limit, offset: resp.offset };
}

export async function createAssetUploadIntent(input: AssetUploadIntentInput, idempotencyKey = corrId("catalog-asset-intent-create")): Promise<AssetUploadIntent> {
  return request<CatalogAssetUploadIntentResponse>("/dsh/operator/catalog/assets/upload-intents", {
    method: "POST",
    body: input,
    idempotencyKey,
  });
}

export async function completeAssetUpload(assetId: string): Promise<CatalogAsset> {
  const resp = await request<CatalogAssetResponse>(`/dsh/operator/catalog/assets/${encodeURIComponent(assetId)}/complete`, {
    method: "POST",
  });
  return resp.asset;
}

export async function reviewCatalogAsset(assetId: string, input: CatalogAssetReviewInput): Promise<CatalogAsset> {
  const resp = await request<CatalogAssetResponseAfterReview>(`/dsh/operator/catalog/assets/${encodeURIComponent(assetId)}/review`, {
    method: "POST",
    body: input,
  });
  return resp.asset;
}

export async function cleanupOrphanCatalogAssets(): Promise<number> {
  const resp = await request<{ deletedCount: number }>("/dsh/operator/catalog/assets/cleanup-orphans", {
    method: "POST",
  });
  return resp.deletedCount;
}

export async function unlinkCatalogAsset(assetId: string, linkId: string, query: { entityType: string; entityId: string }): Promise<void> {
  const params = new URLSearchParams();
  params.set("entityType", query.entityType);
  params.set("entityId", query.entityId);
  await request<void>(`/dsh/operator/catalog/assets/${encodeURIComponent(assetId)}/links/${encodeURIComponent(linkId)}?${params.toString()}`, {
    method: "DELETE",
  });
}

export async function fetchCatalogAssetLinks(query: { entityType: string; entityId: string }): Promise<readonly CatalogAssetLink[]> {
  const params = new URLSearchParams();
  params.set("entityType", query.entityType);
  params.set("entityId", query.entityId);
  const resp = await request<CatalogAssetLinksResponse>(`/dsh/operator/catalog/asset-links?${params.toString()}`);
  return resp.links;
}

export async function putEntityImage(
  entityType: "domains" | "nodes" | "master-products" | "product-proposals",
  entityId: string,
  role: string,
  assetId: string,
): Promise<CatalogAssetLink> {
  const encodedEntityId = encodeURIComponent(entityId);
  const encodedRole = encodeURIComponent(role);
  let endpoint: string;

  switch (entityType) {
    case "domains":
      endpoint = `/dsh/operator/catalog/domains/${encodedEntityId}/images/${encodedRole}`;
      break;
    case "nodes":
      endpoint = `/dsh/operator/catalog/nodes/${encodedEntityId}/images/${encodedRole}`;
      break;
    case "master-products":
      endpoint = `/dsh/operator/catalog/master-products/${encodedEntityId}/images/${encodedRole}`;
      break;
    case "product-proposals":
      endpoint = `/dsh/operator/catalog/product-proposals/${encodedEntityId}/images/${encodedRole}`;
      break;
    default: {
      throw new Error("Unsupported catalog entity type");
    }
  }

  const resp = await request<{ link: CatalogAssetLink }>(endpoint, {
    method: "PUT",
    body: { assetId },
  });
  return resp.link;
}

export async function deleteCatalogAsset(assetId: string): Promise<void> {
  await request<void>(`/dsh/operator/catalog/assets/${encodeURIComponent(assetId)}`, {
    method: "DELETE",
  });
}

// ─── Reels APIs ───────────────────────────────────────────────────────────────
