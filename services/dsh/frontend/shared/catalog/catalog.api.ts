import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
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

const baseUrl = resolveDshApiBaseUrl();

type RequestOptions = {
  readonly method?: "GET" | "POST" | "PATCH" | "DELETE";
  readonly body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getIdentityAccessToken();
  if (!token) throw { kind: "http", status: 401 };
  let response: Response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Correlation-ID": requestId("catalog-corr"),
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw { kind: "network", message: error instanceof Error ? error.message : "network error" };
  }
  if (!response.ok) {
    throw { kind: "http", status: response.status, body: await response.text().catch(() => "") };
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function publicRequest<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw { kind: "network", message: error instanceof Error ? error.message : "network error" };
  }
  if (!response.ok) throw { kind: "http", status: response.status };
  return response.json() as Promise<T>;
}

export async function fetchPublishedCatalog(storeId: string): Promise<CatalogState> {
  try {
    const response = await publicRequest<Omit<PartnerCatalog, "storeId">>(
      `/dsh/stores/${encodeURIComponent(storeId)}/catalog`,
    );
    const catalog: PartnerCatalog = { storeId, ...response };
    return catalog.products.length === 0
      ? { kind: "empty", storeId }
      : { kind: "success", catalog };
  } catch (error) {
    return classifyCatalogError(error);
  }
}

export async function fetchPartnerCatalog(): Promise<CatalogState> {
  try {
    const catalog = await request<PartnerCatalog>("/dsh/partner/catalog");
    if (catalog.categories.length === 0 && catalog.products.length === 0) {
      return { kind: "empty", storeId: catalog.storeId };
    }
    return { kind: "success", catalog };
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
    readonly name?: string;
    readonly description?: string;
    readonly sortOrder?: number;
    readonly isActive?: boolean;
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
    readonly name?: string;
    readonly description?: string;
    readonly sku?: string;
    readonly priceReference?: string;
    readonly categoryId?: string | null;
    readonly isActive?: boolean;
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
    return response.submissions.length === 0
      ? { kind: "empty" }
      : { kind: "success", submissions: response.submissions };
  } catch (error) {
    const state = classifyCatalogError(error);
    if (state.kind === "permission_denied") return state;
    if (state.kind === "error") return state;
    return { kind: "error", message: "تعذر تحميل طلبات اعتماد الكتالوج." };
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
  const typed = error as { kind?: string; status?: number; message?: string };
  if (typed.kind === "http" && (typed.status === 401 || typed.status === 403)) {
    return { kind: "permission_denied" };
  }
  if (typed.kind === "http" && typed.status === 409) {
    return { kind: "error", message: "تغيّرت نسخة الكتالوج. أعد التحميل ثم حاول مجددًا." };
  }
  if (typed.kind === "network") {
    return { kind: "error", message: "خدمة الكتالوج غير متاحة حاليًا." };
  }
  return { kind: "error", message: "تعذر تنفيذ عملية الكتالوج." };
}

function requestId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}
