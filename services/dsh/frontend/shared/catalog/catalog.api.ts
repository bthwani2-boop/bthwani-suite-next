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
import { fetchPublishedCentralCatalog } from "./central-catalog.api";

const baseUrl = resolveDshApiBaseUrl();
const { request } = createDshHttpClient(baseUrl, "catalog-corr");
const { request: publicRequest } = createDshPublicHttpClient(baseUrl);

export async function fetchPublishedCatalog(storeId: string): Promise<CatalogState> {
  try {
    const response = await fetchPublishedCentralCatalog(storeId);
    const categories: CatalogCategory[] = response.domains.map((d) => ({
      id: d.id,
      storeId: storeId,
      name: d.nameAr,
      description: d.slug,
      sortOrder: d.sortOrder,
      isActive: d.isActive,
      version: 1,
    }));
    const products: CatalogProduct[] = response.products.map((p) => ({
      id: p.id,
      storeId: storeId,
      categoryId: p.domainId,
      name: p.canonicalNameAr,
      description: p.brand || "",
      sku: p.sku || "",
      priceReference: String(p.unitPrice),
      isActive: p.isActive,
      version: 1,
      media: p.imageObjectKey ? [{
        id: p.id + "-media",
        productId: p.id,
        objectKey: p.imageObjectKey,
        contentType: "image/webp",
        state: "complete",
        publicUrl: p.imageObjectKey.startsWith("http") ? p.imageObjectKey : `${baseUrl}/dsh/media?key=${encodeURIComponent(p.imageObjectKey)}`,
        version: 1,
      }] : [],
    }));
    const catalog: PartnerCatalog = { storeId, categories, products };
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
