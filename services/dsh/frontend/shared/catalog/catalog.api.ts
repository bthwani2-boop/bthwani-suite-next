import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient, createDshPublicHttpClient } from "../_kernel/dsh-http-request";
import type {
  CatalogCategory,
  CatalogMedia,
  CatalogProduct,
  CatalogState,
  CatalogSubmission,
  CatalogSubmissionState,
  MediaUploadIntent,
  PartnerCatalog,
} from "./catalog.types";
import { fetchAdminStoreDetail } from "../store/store-admin.api";
import { resolveCatalogError, resolveCatalogSubmissionError } from "./catalog.controller-core";
import { resolveCatalogSubmissionState, resolvePartnerCatalogState, resolvePublishedCatalogState } from "./catalog.view-model";

const baseUrl = resolveDshApiBaseUrl();
const { request } = createDshHttpClient(baseUrl, "catalog-corr");
const { request: publicRequest } = createDshPublicHttpClient(baseUrl);

export async function fetchPublishedCatalog(storeId: string): Promise<CatalogState> {
  try {
    const response = await publicRequest<Omit<PartnerCatalog, "storeId">>(
      `/dsh/stores/${encodeURIComponent(storeId)}/catalog`,
    );
    const catalog: PartnerCatalog = { storeId, ...response };
    return resolvePublishedCatalogState(catalog);
  } catch (error) {
    return classifyCatalogError(error);
  }
}

export async function fetchPartnerCatalog(): Promise<CatalogState> {
  try {
    const catalog = await request<PartnerCatalog>("/dsh/partner/catalog");
    return resolvePartnerCatalogState(catalog);
  } catch (error) {
    return classifyCatalogError(error);
  }
}

export async function createCatalogCategory(input: {
  readonly name: string;
  readonly description: string;
  readonly sortOrder: number;
}): Promise<CatalogCategory> {
  const response = await request<{ category: CatalogCategory }>("/dsh/partner/catalog/categories", {
    method: "POST",
    body: { ...input, isActive: true, expectedVersion: 0 },
  });
  return response.category;
}

export async function createCatalogProduct(input: {
  readonly categoryId: string | null;
  readonly name: string;
  readonly description: string;
  readonly sku: string;
  readonly priceReference: string;
}): Promise<CatalogProduct> {
  const response = await request<{ product: CatalogProduct }>("/dsh/partner/catalog/products", {
    method: "POST",
    body: { ...input, isActive: true, expectedVersion: 0 },
  });
  return response.product;
}

export async function updateCatalogCategory(
  categoryId: string,
  input: {
    readonly name?: string | undefined;
    readonly description?: string | undefined;
    readonly sortOrder?: number | undefined;
    readonly isActive?: boolean | undefined;
    readonly expectedVersion: number;
  },
): Promise<CatalogCategory> {
  const response = await request<{ category: CatalogCategory }>(
    `/dsh/partner/catalog/categories/${encodeURIComponent(categoryId)}`,
    { method: "PATCH", body: input },
  );
  return response.category;
}

export async function deleteCatalogCategory(
  categoryId: string,
  expectedVersion: number,
): Promise<void> {
  await request(
    `/dsh/partner/catalog/categories/${encodeURIComponent(categoryId)}`,
    { method: "DELETE", body: { expectedVersion } },
  );
}

export async function updateCatalogProduct(
  productId: string,
  input: {
    readonly name?: string | undefined;
    readonly description?: string | undefined;
    readonly sku?: string | undefined;
    readonly priceReference?: string | undefined;
    readonly categoryId?: string | null | undefined;
    readonly isActive?: boolean | undefined;
    readonly expectedVersion: number;
  },
): Promise<CatalogProduct> {
  const response = await request<{ product: CatalogProduct }>(
    `/dsh/partner/catalog/products/${encodeURIComponent(productId)}`,
    { method: "PATCH", body: input },
  );
  return response.product;
}

export async function deleteCatalogProduct(
  productId: string,
  expectedVersion: number,
): Promise<void> {
  await request(
    `/dsh/partner/catalog/products/${encodeURIComponent(productId)}`,
    { method: "DELETE", body: { expectedVersion } },
  );
}

export async function uploadMediaIntent(input: {
  readonly productId: string | null;
  readonly contentType: string;
  readonly fileName: string;
}): Promise<MediaUploadIntent> {
  return request<MediaUploadIntent>("/dsh/partner/catalog/media/upload-intents", {
    method: "POST",
    body: input,
  });
}

export async function completeMedia(mediaId: string): Promise<CatalogMedia> {
  const response = await request<{ media: CatalogMedia }>(
    `/dsh/partner/catalog/media/${encodeURIComponent(mediaId)}/complete`,
    { method: "PATCH" },
  );
  return response.media;
}

export async function deleteMedia(mediaId: string): Promise<void> {
  await request(
    `/dsh/partner/catalog/media/${encodeURIComponent(mediaId)}`,
    { method: "DELETE" },
  );
}

export async function submitCatalog(): Promise<void> {
  await request("/dsh/partner/catalog/submit", { method: "POST" });
}

export async function fetchCatalogAudit(
  storeId: string,
): Promise<readonly CatalogSubmission[]> {
  const response = await request<{ entries: CatalogSubmission[] }>(
    `/dsh/operator/catalog/${encodeURIComponent(storeId)}/audit`,
  );
  return response.entries;
}

export async function fetchCatalogSubmissions(): Promise<CatalogSubmissionState> {
  try {
    const response = await request<{ submissions: CatalogSubmission[] }>("/dsh/operator/catalog/submissions");
    return resolveCatalogSubmissionState(response.submissions);
  } catch (error) {
    return resolveCatalogSubmissionError(error);
  }
}

export async function decideCatalog(input: {
  readonly storeId: string;
  readonly decision: "approved" | "rejected";
  readonly reason: string;
}): Promise<void> {
  const detail = await fetchAdminStoreDetail(input.storeId);
  if (detail.kind !== "success") {
    throw { kind: "http", status: detail.kind === "permission_denied" ? detail.statusCode : 409 };
  }
  await request(`/dsh/operator/catalog/${encodeURIComponent(input.storeId)}/decision`, {
    method: "POST",
    body: {
      expectedVersion: detail.detail.version,
      decision: input.decision,
      reason: input.reason,
    },
  });
}

export function classifyCatalogError(error: unknown): CatalogState {
  return resolveCatalogError(error);
}
