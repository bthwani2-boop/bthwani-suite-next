import * as api from "./central-catalog.api";
import type { CatalogAsset, CatalogAssetLink } from "./central-catalog.types";

const entityTypeMap: Record<string, CatalogAssetLink["entityType"]> = {
  domains: "domain",
  nodes: "node",
  "master-products": "master_product",
  "product-proposals": "product_proposal",
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
  // 1. Create upload intent
  const asset = await api.createAssetUploadIntent({
    objectKey: `catalog-assets/${Date.now()}-${file.name}`,
    originalFileName: file.name,
    mimeType: file.type || "image/jpeg",
    sizeBytes: file.size,
    sourceSurface,
  });

  // 2. Perform actual file upload binary write (simulated client upload using MinIO pre-signed URL)
  if (asset.publicUrl) {
    const callFetch = fetch;
    await callFetch(asset.publicUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "image/jpeg" },
    });
  }

  // 3. Update asset metadata to trigger draft -> uploaded status
  const updatedAsset = await api.updateCatalogAsset(asset.id, {
    altAr,
    altEn,
  });

  // 4. Link asset to the entity
  const normalizedEntityType = entityTypeMap[entityType] ?? entityType;
  const link = await api.linkCatalogAsset(updatedAsset.id, {
    entityType: normalizedEntityType,
    entityId,
    role,
    isPrimary: true,
  });

  return { asset: updatedAsset, link };
}
