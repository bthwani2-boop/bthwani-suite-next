import * as api from "./central-catalog.api";
import type { CatalogAsset, CatalogAssetLink } from "./central-catalog.types";

const entityTypeMap: Record<string, CatalogAssetLink["entityType"]> = {
  domains: "domain",
  nodes: "node",
  "master-products": "master_product",
  "product-proposals": "product_proposal",
  stores: "store",
};

/**
 * DAM Helper orchestrating asset uploads, reviews, and entity associations.
 */
export async function uploadAndLinkAsset(
  file: File,
  entityType: string,
  entityId: string,
  role: string,
  sourceSurface: "control-panel-catalog" | "app-partner" | "app-field",
  altAr: string,
  altEn = "",
): Promise<{ readonly asset: CatalogAsset; readonly link: CatalogAssetLink }> {
  // 1. Create upload intent: registers a draft asset row and returns a
  // short-lived presigned MinIO PUT URL. dsh-api never sees the file body.
  const intent = await api.createAssetUploadIntent({
    fileName: file.name,
    mimeType: file.type || "image/jpeg",
    sizeBytes: file.size,
    sourceSurface,
    altAr,
    altEn,
  });

  // 2. Upload the binary directly to MinIO via the presigned URL.
  await fetch(intent.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "image/jpeg" },
  });

  // 3. Complete: dsh-api stats the object in MinIO to confirm it actually
  // landed before moving the asset out of draft into the review queue.
  const uploadedAsset = await api.completeAssetUpload(intent.asset.id);

  // 4. Link asset to the entity
  const normalizedEntityType = entityTypeMap[entityType] ?? entityType;
  const link = await api.linkCatalogAsset(uploadedAsset.id, {
    entityType: normalizedEntityType,
    entityId,
    role,
    isPrimary: true,
  });

  return { asset: uploadedAsset, link };
}
