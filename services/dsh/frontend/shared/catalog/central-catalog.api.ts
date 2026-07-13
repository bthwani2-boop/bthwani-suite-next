import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient, createDshPublicHttpClient } from "../_kernel/dsh-http-request";
import type {
  CentralCatalogDomain,
  CentralCatalogNode,
  MasterProduct,
  ProductProposal,
  StoreAssortment,
  CatalogPlatformPolicy,
  ClientVisibleCatalogResponse,
  CatalogAsset,
  CatalogAssetLink,
} from "./central-catalog.types";

const baseUrl = resolveDshApiBaseUrl();
const { request } = createDshHttpClient(baseUrl, "central-catalog-corr");
const { request: publicRequest } = createDshPublicHttpClient(baseUrl);

// ─── Operator APIs ────────────────────────────────────────────────────────────

export async function fetchCatalogDomains(): Promise<readonly CentralCatalogDomain[]> {
  const resp = await request<{ domains: readonly CentralCatalogDomain[] }>("/dsh/operator/catalog/domains");
  return resp.domains;
}

export async function createCatalogDomain(input: {
  readonly slug: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly icon: string;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly isClientVisible: boolean;
  readonly requiresProductCatalog: boolean;
  readonly isManualRequest: boolean;
}): Promise<CentralCatalogDomain> {
  const resp = await request<{ domain: CentralCatalogDomain }>("/dsh/operator/catalog/domains", {
    method: "POST",
    body: input,
  });
  return resp.domain;
}

export async function updateCatalogDomain(
  domainId: string,
  input: {
    readonly slug?: string;
    readonly nameAr?: string;
    readonly nameEn?: string;
    readonly icon?: string;
    readonly sortOrder?: number;
    readonly isActive?: boolean;
    readonly isClientVisible?: boolean;
    readonly requiresProductCatalog?: boolean;
    readonly isManualRequest?: boolean;
  },
): Promise<CentralCatalogDomain> {
  const resp = await request<{ domain: CentralCatalogDomain }>(`/dsh/operator/catalog/domains/${encodeURIComponent(domainId)}`, {
    method: "PATCH",
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
  const resp = await request<{ nodes: readonly CentralCatalogNode[] }>(path);
  return resp.nodes;
}

export async function createCatalogNode(input: {
  readonly domainId: string;
  readonly parentId: string | null;
  readonly level: string;
  readonly slug: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly icon: string;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly isClientVisible: boolean;
  readonly requiresBarcode: boolean;
  readonly allowsProductProposal: boolean;
  readonly allowsStoreProductCustomImage: boolean;
  readonly requiresCatalogReview: boolean;
  readonly requiresProductCatalog: boolean;
}): Promise<CentralCatalogNode> {
  const resp = await request<{ node: CentralCatalogNode }>("/dsh/operator/catalog/nodes", {
    method: "POST",
    body: input,
  });
  return resp.node;
}

export async function updateCatalogNode(
  nodeId: string,
  input: {
    readonly domainId?: string;
    readonly parentId?: string | null;
    readonly level?: string;
    readonly slug?: string;
    readonly nameAr?: string;
    readonly nameEn?: string;
    readonly icon?: string;
    readonly sortOrder?: number;
    readonly isActive?: boolean;
    readonly isClientVisible?: boolean;
    readonly requiresBarcode?: boolean;
    readonly allowsProductProposal?: boolean;
    readonly allowsStoreProductCustomImage?: boolean;
    readonly requiresCatalogReview?: boolean;
    readonly requiresProductCatalog?: boolean;
  },
): Promise<CentralCatalogNode> {
  const resp = await request<{ node: CentralCatalogNode }>(`/dsh/operator/catalog/nodes/${encodeURIComponent(nodeId)}`, {
    method: "PATCH",
    body: input,
  });
  return resp.node;
}

export async function fetchMasterProducts(query?: {
  domainId?: string;
  categoryNodeId?: string;
  approvalStatus?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<readonly MasterProduct[]> {
  const params = new URLSearchParams();
  if (query?.domainId) params.set("domainId", query.domainId);
  if (query?.categoryNodeId) params.set("categoryNodeId", query.categoryNodeId);
  if (query?.approvalStatus) params.set("approvalStatus", query.approvalStatus);
  if (query?.search) params.set("search", query.search);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  if (query?.offset !== undefined) params.set("offset", String(query.offset));
  const qs = params.toString();
  const path = qs ? `/dsh/operator/catalog/master-products?${qs}` : "/dsh/operator/catalog/master-products";
  const resp = await request<{ masterProducts: readonly MasterProduct[] }>(path);
  return resp.masterProducts;
}

export async function createMasterProduct(input: {
  readonly domainId: string;
  readonly categoryNodeId: string | null;
  readonly canonicalNameAr: string;
  readonly canonicalNameEn: string;
  readonly brand: string;
  readonly barcode: string | null;
  readonly gtin: string | null;
  readonly sku: string | null;
  readonly unit: string;
  readonly measurementType: string;
  readonly canonicalImageObjectKey: string | null;
  readonly approvalStatus: string;
  readonly isActive: boolean;
  readonly createdSource?: string;
}): Promise<MasterProduct> {
  const resp = await request<{ masterProduct: MasterProduct }>("/dsh/operator/catalog/master-products", {
    method: "POST",
    body: input,
  });
  return resp.masterProduct;
}

export async function updateMasterProduct(
  productId: string,
  input: {
    readonly domainId?: string;
    readonly categoryNodeId?: string | null;
    readonly canonicalNameAr?: string;
    readonly canonicalNameEn?: string;
    readonly brand?: string;
    readonly barcode?: string | null;
    readonly gtin?: string | null;
    readonly sku?: string | null;
    readonly unit?: string;
    readonly measurementType?: string;
    readonly canonicalImageObjectKey?: string | null;
    readonly approvalStatus?: string;
    readonly isActive?: boolean;
  },
): Promise<MasterProduct> {
  const resp = await request<{ masterProduct: MasterProduct }>(`/dsh/operator/catalog/master-products/${encodeURIComponent(productId)}`, {
    method: "PATCH",
    body: input,
  });
  return resp.masterProduct;
}

export async function fetchProductProposals(query?: {
  status?: string;
  storeId?: string;
  limit?: number;
  offset?: number;
}): Promise<readonly ProductProposal[]> {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  if (query?.storeId) params.set("storeId", query.storeId);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  if (query?.offset !== undefined) params.set("offset", String(query.offset));
  const qs = params.toString();
  const path = qs ? `/dsh/operator/catalog/product-proposals?${qs}` : "/dsh/operator/catalog/product-proposals";
  const resp = await request<{ proposals: readonly ProductProposal[] }>(path);
  return resp.proposals;
}

export async function decideProductProposal(
  proposalId: string,
  input: {
    readonly decision: "under_review" | "adopted" | "rejected" | "needs_fix";
    readonly reviewNote: string;
    readonly adoptedMasterProductId?: string | null;
  },
): Promise<ProductProposal> {
  const resp = await request<{ proposal: ProductProposal }>(`/dsh/operator/catalog/product-proposals/${encodeURIComponent(proposalId)}/decision`, {
    method: "POST",
    body: input,
  });
  return resp.proposal;
}

export async function transitionProductProposal(
  proposalId: string,
  input: {
    readonly nextStatus: string;
    readonly note: string;
    readonly adoptedMasterProductId?: string | null | undefined;
    readonly createMasterProduct?: boolean | undefined;
  },
): Promise<ProductProposal> {
  const resp = await request<{ proposal: ProductProposal }>(`/dsh/operator/catalog/product-proposals/${encodeURIComponent(proposalId)}/transition`, {
    method: "POST",
    body: input,
  });
  return resp.proposal;
}

export async function fetchCatalogPlatformPolicies(): Promise<readonly CatalogPlatformPolicy[]> {
  const resp = await request<{ policies: readonly CatalogPlatformPolicy[] }>("/dsh/operator/catalog/platform-policies");
  return resp.policies;
}

export async function updateCatalogPlatformPolicy(
  policyId: string,
  input: {
    readonly platformCommissionRate: number;
    readonly fieldPartnerOnboardingCommissionAmount: number;
    readonly fieldPartnerOnboardingCommissionCurrency: string;
    readonly storeOnboardingFeeAmount: number;
    readonly storeOnboardingFeeCurrency: string;
    readonly allowsStoreProductCustomImage: boolean;
    readonly allowsProductProposal: boolean;
    readonly requiresBarcode: boolean;
    readonly requiresCatalogReview: boolean;
    readonly isActive: boolean;
    readonly effectiveFrom: string;
    readonly notes: string;
  },
): Promise<CatalogPlatformPolicy> {
  const resp = await request<{ policy: CatalogPlatformPolicy }>(`/dsh/operator/catalog/platform-policies/${encodeURIComponent(policyId)}`, {
    method: "PUT",
    body: input,
  });
  return resp.policy;
}

export async function fetchOperatorStoreAssortment(storeId: string): Promise<readonly StoreAssortment[]> {
  const resp = await request<{ assortment: readonly StoreAssortment[] }>(`/dsh/operator/stores/${encodeURIComponent(storeId)}/assortment`);
  return resp.assortment;
}

export async function upsertOperatorStoreAssortment(
  storeId: string,
  masterProductId: string,
  input: {
    readonly unitPrice: number;
    readonly currency: string;
    readonly available: boolean;
    readonly stockStatus: "in_stock" | "low_stock" | "out_of_stock";
    readonly localNote: string;
    readonly customImageObjectKey: string | null;
    readonly publicationStatus: string;
  },
): Promise<StoreAssortment> {
  const resp = await request<{ assortment: StoreAssortment }>(`/dsh/operator/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(masterProductId)}`, {
    method: "PUT",
    body: input,
  });
  return resp.assortment;
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

export async function fetchPartnerStoreAssortment(storeId: string): Promise<readonly StoreAssortment[]> {
  const resp = await request<{ assortment: readonly StoreAssortment[] }>(`/dsh/partner/stores/${encodeURIComponent(storeId)}/assortment`);
  return resp.assortment;
}

export async function upsertPartnerStoreAssortment(
  storeId: string,
  masterProductId: string,
  input: {
    readonly unitPrice: number;
    readonly currency: string;
    readonly available: boolean;
    readonly stockStatus: "in_stock" | "low_stock" | "out_of_stock";
    readonly localNote: string;
    readonly customImageObjectKey: string | null;
    readonly publicationStatus: string;
  },
): Promise<StoreAssortment> {
  const resp = await request<{ assortment: StoreAssortment }>(`/dsh/partner/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(masterProductId)}`, {
    method: "PUT",
    body: input,
  });
  return resp.assortment;
}

export async function createPartnerProductProposal(input: {
  readonly proposedNameAr: string;
  readonly proposedNameEn: string;
  readonly domainId: string;
  readonly categoryNodeId: string | null;
  readonly brand: string;
  readonly barcode: string | null;
  readonly imageObjectKey: string | null;
  readonly sourceSurface: "app-partner";
}): Promise<ProductProposal> {
  const resp = await request<{ proposal: ProductProposal }>("/dsh/partner/catalog/product-proposals", {
    method: "POST",
    body: input,
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

export async function upsertFieldStoreAssortment(
  partnerId: string,
  storeId: string,
  masterProductId: string,
  input: {
    readonly unitPrice: number;
    readonly currency: string;
    readonly available: boolean;
    readonly stockStatus: "in_stock" | "low_stock" | "out_of_stock";
    readonly localNote: string;
    readonly customImageObjectKey: string | null;
    readonly publicationStatus: string;
  },
): Promise<StoreAssortment> {
  const resp = await request<{ assortment: StoreAssortment }>(`/dsh/field/partners/${encodeURIComponent(partnerId)}/stores/${encodeURIComponent(storeId)}/assortment/${encodeURIComponent(masterProductId)}`, {
    method: "PUT",
    body: input,
  });
  return resp.assortment;
}

export async function fetchFieldStoreAssortment(partnerId: string): Promise<{
  readonly storeId: string;
  readonly assortment: readonly StoreAssortment[];
}> {
  return request<{
    readonly storeId: string;
    readonly assortment: readonly StoreAssortment[];
  }>(`/dsh/field/partners/${encodeURIComponent(partnerId)}/assortment`);
}

export async function createFieldProductProposal(partnerId: string, input: {
  readonly proposedNameAr: string;
  readonly proposedNameEn: string;
  readonly domainId: string;
  readonly categoryNodeId: string | null;
  readonly brand: string;
  readonly barcode: string | null;
  readonly imageObjectKey: string | null;
  readonly sourceSurface: "app-field";
}): Promise<ProductProposal> {
  const resp = await request<{ proposal: ProductProposal }>(`/dsh/field/partners/${encodeURIComponent(partnerId)}/catalog/product-proposals`, {
    method: "POST",
    body: input,
  });
  return resp.proposal;
}

// ─── Public Published Catalog ──────────────────────────────────────────────────

export async function fetchPublishedCentralCatalog(storeId: string): Promise<ClientVisibleCatalogResponse> {
  return publicRequest<ClientVisibleCatalogResponse>(`/dsh/stores/${encodeURIComponent(storeId)}/catalog`);
}

export interface SeedStatus {
  readonly domainsCount: number;
  readonly nodesCount: number;
  readonly masterProductsCount: number;
  readonly assortmentsCount: number;
  readonly manualRequestExists: boolean;
  readonly shayInExists: boolean;
  readonly awnakExists: boolean;
  readonly seedVersion: string;
  readonly missingSeeds: readonly string[];
}

export async function fetchSeedStatus(): Promise<SeedStatus> {
  return request<SeedStatus>("/dsh/operator/catalog/seed-status");
}

export async function fetchCatalogAssets(query?: { status?: string; limit?: number; offset?: number }): Promise<readonly CatalogAsset[]> {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  if (query?.offset !== undefined) params.set("offset", String(query.offset));
  const qs = params.toString();
  const path = qs ? `/dsh/operator/catalog/assets?${qs}` : "/dsh/operator/catalog/assets";
  const resp = await request<{ assets: readonly CatalogAsset[] }>(path);
  return resp.assets;
}

export interface AssetUploadIntent {
  readonly asset: CatalogAsset;
  readonly uploadUrl: string;
  readonly expiresAt: string;
}

export async function createAssetUploadIntent(input: {
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly sourceSurface: string;
  readonly altAr?: string;
  readonly altEn?: string;
}): Promise<AssetUploadIntent> {
  return request<AssetUploadIntent>("/dsh/operator/catalog/assets/upload-intents", {
    method: "POST",
    body: input,
  });
}

export async function completeAssetUpload(assetId: string): Promise<CatalogAsset> {
  const resp = await request<{ asset: CatalogAsset }>(`/dsh/operator/catalog/assets/${encodeURIComponent(assetId)}/complete`, {
    method: "POST",
  });
  return resp.asset;
}

export async function updateCatalogAsset(assetId: string, input: {
  readonly altAr?: string;
  readonly altEn?: string;
  readonly dominantColor?: string;
  readonly width?: number;
  readonly height?: number;
}): Promise<CatalogAsset> {
  const resp = await request<{ asset: CatalogAsset }>(`/dsh/operator/catalog/assets/${encodeURIComponent(assetId)}`, {
    method: "PATCH",
    body: input,
  });
  return resp.asset;
}

export async function reviewCatalogAsset(assetId: string, input: {
  readonly decision: "approved" | "rejected" | "archived";
  readonly reviewNote: string;
}): Promise<CatalogAsset> {
  const resp = await request<{ asset: CatalogAsset }>(`/dsh/operator/catalog/assets/${encodeURIComponent(assetId)}/review`, {
    method: "POST",
    body: input,
  });
  return resp.asset;
}

export async function linkCatalogAsset(assetId: string, input: {
  readonly entityType: string;
  readonly entityId: string;
  readonly role: string;
  readonly sortOrder?: number;
  readonly isPrimary?: boolean;
}): Promise<CatalogAssetLink> {
  const resp = await request<{ link: CatalogAssetLink }>(`/dsh/operator/catalog/assets/${encodeURIComponent(assetId)}/link`, {
    method: "POST",
    body: input,
  });
  return resp.link;
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
  const resp = await request<{ links: readonly CatalogAssetLink[] }>(`/dsh/operator/catalog/asset-links?${params.toString()}`);
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
      const exhaustive: never = entityType;
      throw new Error(`Unsupported catalog entity type: ${exhaustive}`);
    }
  }

  const resp = await request<{ link: CatalogAssetLink }>(endpoint, {
    method: "PUT",
    body: { assetId },
  });
  return resp.link;
}
