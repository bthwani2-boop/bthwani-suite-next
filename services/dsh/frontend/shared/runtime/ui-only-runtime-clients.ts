import type { DshMediaAsset } from "../media/dsh-media-api.client";
import {
  fetchPartnerMasterProducts,
  fetchPartnerStoreAssortment,
  createAssetUploadIntent,
  completeAssetUpload,
  linkCatalogAsset,
  unlinkCatalogAsset,
  fetchCatalogAssetLinks,
} from "../catalog/central-catalog.api";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDispatchAssignment } from "../dispatch/dispatch.api";

const baseUrl = resolveDshApiBaseUrl();

type MediaListQuery = {
  readonly owner_type: "product" | "store" | "category";
  readonly owner_id: string;
  /** Required for owner_type "product": the store this partner is editing the assortment for. */
  readonly store_id?: string;
};

type MediaUploadInput = MediaListQuery & {
  readonly media_type: "image" | "video";
  readonly purpose: string;
  readonly filename: string;
  readonly mime_type: string;
  readonly file_size_bytes?: number;
};

// A partner may only attach a custom image to their own store's assortment
// row for a master product (role=partner_custom_product_image); the master
// product itself (canonical_product_image) is platform-owned and only an
// operator may set it. See services/dsh/backend/internal/http/centralcatalog.go
// authorizeAssetLinkEntity.
async function resolveAssortmentId(storeId: string, productId: string): Promise<string | null> {
  const assortments = await fetchPartnerStoreAssortment(storeId);
  return assortments.find((a) => a.masterProductId === productId)?.id ?? null;
}

function toPublicUrl(relativeOrAbsolute: string): string {
  return relativeOrAbsolute.startsWith("http") ? relativeOrAbsolute : `${baseUrl}${relativeOrAbsolute}`;
}

async function listProductMedia(storeId: string | undefined, productId: string): Promise<readonly DshMediaAsset[]> {
  if (storeId) {
    const assortmentId = await resolveAssortmentId(storeId, productId);
    if (assortmentId) {
      const links = await fetchCatalogAssetLinks({ entityType: "store_assortment", entityId: assortmentId });
      const customImage = links.find((link) => link.role === "partner_custom_product_image" && link.status === "approved");
      if (customImage) {
        const variant = "original";
        const mediaPath = `/dsh/public/media/${customImage.assetId}/${variant}`;
        return [{
          id: customImage.assetId,
          entity_id: productId,
          entity_type: "product",
          media_key: customImage.assetId,
          url: toPublicUrl(mediaPath),
          public_url: toPublicUrl(mediaPath),
          mime_type: "image/webp",
          created_at: customImage.createdAt,
          purpose: "partner_custom_product_image",
          status: customImage.status,
        }];
      }
    }
  }
  const products = await fetchPartnerMasterProducts({ limit: 200 });
  const product = products.find((item) => item.id === productId);
  const objectKey = product?.canonicalImageObjectKey;
  if (!objectKey) return [];
  const publicUrl = objectKey.startsWith("http") ? objectKey : `${baseUrl}/dsh/media?mediaRef=${encodeURIComponent(objectKey)}`;
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

function unsupportedOwnerType(ownerType: string): never {
  throw new Error(`media upload is not implemented for owner_type "${ownerType}" yet.`);
}

export function getDshMediaRuntimeClient() {
  return {
    async listAssets(entityId: string, entityType: "product" | "store" | "category"): Promise<readonly DshMediaAsset[]> {
      if (entityType !== "product") return [];
      return listProductMedia(undefined, entityId);
    },
    async listMedia(query: MediaListQuery): Promise<{ items: readonly DshMediaAsset[] }> {
      if (query.owner_type !== "product") return { items: [] };
      return { items: await listProductMedia(query.store_id, query.owner_id) };
    },
    async createUploadIntent(input: MediaUploadInput, _headers?: Record<string, string>) {
      if (input.owner_type !== "product" || !input.store_id) return unsupportedOwnerType(input.owner_type);
      const intent = await createAssetUploadIntent({
        fileName: input.filename,
        mimeType: input.mime_type,
        sizeBytes: input.file_size_bytes ?? 0,
      });
      return { intent: { upload_url: intent.uploadUrl, media_id: intent.asset.id } };
    },
    async readLocalUriAsBlob(uri: string): Promise<Blob> {
      const callFetch = globalThis.fetch;
      const response = await callFetch(uri);
      if (!response.ok) throw { code: "storage_unavailable", message: `media source read failed with HTTP ${response.status}` };
      return response.blob();
    },
    async putToPresignedUrl(uploadUrl: string, body: Blob, contentType: string): Promise<void> {
      const callFetch = globalThis.fetch;
      const response = await callFetch(uploadUrl, { method: "PUT", body, headers: { "Content-Type": contentType } });
      if (!response.ok) throw { code: "storage_unavailable", message: `presigned upload failed with HTTP ${response.status}` };
    },
    // completeUploadForProduct is the real signature this client needs (mediaId +
    // store/product context to resolve the assortment to link against); the
    // generic (mediaId, body, headers) signature below only covers the
    // "product" owner_type callers currently exercise.
    async completeUpload(mediaId: string, body?: { readonly store_id?: string; readonly product_id?: string }, _headers?: Record<string, string>) {
      const asset = await completeAssetUpload(mediaId);
      const storeId = body?.store_id;
      const productId = body?.product_id;
      if (storeId && productId) {
        const assortmentId = await resolveAssortmentId(storeId, productId);
        if (assortmentId) {
          await linkCatalogAsset(asset.id, {
            entityType: "store_assortment",
            entityId: assortmentId,
            role: "partner_custom_product_image",
            isPrimary: true,
          });
        }
      }
      return asset;
    },
    async deleteMedia(mediaId: string, _headers?: Record<string, string>, context?: { readonly store_id?: string; readonly product_id?: string }): Promise<void> {
      const storeId = context?.store_id;
      const productId = context?.product_id;
      if (!storeId || !productId) return;
      const assortmentId = await resolveAssortmentId(storeId, productId);
      if (!assortmentId) return;
      const links = await fetchCatalogAssetLinks({ entityType: "store_assortment", entityId: assortmentId });
      const link = links.find((l) => l.assetId === mediaId);
      if (!link) return;
      await unlinkCatalogAsset(mediaId, link.id, { entityType: "store_assortment", entityId: assortmentId });
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
