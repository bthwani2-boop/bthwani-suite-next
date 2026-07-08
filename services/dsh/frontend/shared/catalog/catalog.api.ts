import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  CatalogMedia,
  CatalogSubmission,
  CatalogSubmissionState,
  MediaUploadIntent,
} from "./catalog.types";
import { fetchAdminStoreDetail } from "../store/store-admin.api";
import { resolveCatalogSubmissionError } from "./catalog.controller-core";
import { resolveCatalogSubmissionState } from "./catalog.view-model";

const baseUrl = resolveDshApiBaseUrl();
const { request } = createDshHttpClient(baseUrl, "catalog-corr");

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
