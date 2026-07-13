import type { DshMediaAsset } from "../media/dsh-media-api.client";
import { fetchPartnerMasterProducts } from "../catalog/central-catalog.api";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDispatchAssignment } from "../dispatch/dispatch.api";

type MediaListQuery = {
  readonly owner_type: "product" | "store" | "category";
  readonly owner_id: string;
};

type MediaUploadInput = MediaListQuery & {
  readonly media_type: "image" | "video";
  readonly purpose: string;
  readonly filename: string;
  readonly mime_type: string;
  readonly file_size_bytes?: number;
};

async function listProductMedia(productId: string): Promise<readonly DshMediaAsset[]> {
  const products = await fetchPartnerMasterProducts({ limit: 200 });
  const product = products.find((item) => item.id === productId);
  const objectKey = product?.canonicalImageObjectKey;
  if (!objectKey) return [];
  const baseUrl = resolveDshApiBaseUrl();
  const publicUrl = objectKey.startsWith("http") ? objectKey : `${baseUrl}/dsh/media?key=${encodeURIComponent(objectKey)}`;
  return [{
    id: `${productId}-canonical-image`,
    entity_id: productId,
    entity_type: "product",
    media_key: objectKey,
    url: publicUrl,
    public_url: publicUrl,
    mime_type: "image/webp",
    created_at: product?.updatedAt ?? "",
    purpose: "canonical_product_image",
    status: "approved",
  }];
}

function centralDamOnlyError(): never {
  throw new Error("صور المنتجات المركزية تُرفع كأصول DAM وتخضع للمراجعة؛ مسار وسائط الكتالوج المحلي متقاعد.");
}

export function getDshMediaRuntimeClient() {
  return {
    async listAssets(entityId: string, entityType: "product" | "store" | "category"): Promise<readonly DshMediaAsset[]> {
      if (entityType !== "product") return [];
      return listProductMedia(entityId);
    },
    async listMedia(query: MediaListQuery): Promise<{ items: readonly DshMediaAsset[] }> {
      if (query.owner_type !== "product") return { items: [] };
      return { items: await listProductMedia(query.owner_id) };
    },
    async createUploadIntent(_input: MediaUploadInput, _headers?: Record<string, string>) {
      return centralDamOnlyError();
    },
    async readLocalUriAsBlob(uri: string): Promise<Blob> {
      const callFetch = globalThis.fetch;
      const response = await callFetch(uri);
      if (!response.ok) throw { code: "storage_unavailable", message: `media source read failed with HTTP ${response.status}` };
      return response.blob();
    },
    async putToPresignedUrl(_uploadUrl: string, _body: Blob, _contentType: string): Promise<void> {
      return centralDamOnlyError();
    },
    async completeUpload(_mediaId: string, _body?: unknown, _headers?: Record<string, string>) {
      return centralDamOnlyError();
    },
    async deleteMedia(_mediaId: string, _headers?: Record<string, string>): Promise<void> {
      return centralDamOnlyError();
    },
  };
}

export function getDshOrderLifecycleRuntimeClient() {
  return {
    assignCaptain(orderId: string, input: { readonly captain_id: string }) {
      return createDispatchAssignment({ orderId, captainId: input.captain_id });
    },
  };
}
