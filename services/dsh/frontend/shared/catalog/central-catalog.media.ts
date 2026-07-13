import * as api from "./central-catalog.api";
import type { CatalogAsset, CatalogAssetLink, AssetUploadIntentInput, AssetUploadProgress } from "./central-catalog.types";

export type { AssetUploadProgress };

const entityTypeMap: Record<string, CatalogAssetLink["entityType"]> = {
  domains: "domain",
  nodes: "node",
  "master-products": "master_product",
  "product-proposals": "product_proposal",
  stores: "store",
  "store-assortment": "store_assortment",
};

export interface UploadAndLinkOptions {
  readonly file: File;
  readonly entityType: string;
  readonly entityId: string;
  readonly role: string;
  readonly altAr?: string;
  readonly altEn?: string;
  readonly onProgress?: (progress: AssetUploadProgress) => void;
}

/**
 * Full upload + link orchestration for catalog media assets.
 *
 * Lifecycle: idle -> signing -> uploading -> verifying -> linked | failed
 *
 * The intent is created with intended entity/role so CompleteAssetUpload can
 * auto-link server-side (idempotent). On success the auto-link is used; if
 * no link comes back from complete the client calls linkCatalogAsset.
 * On any failure after signing, rollback is attempted via deleteCatalogAsset.
 */
export async function uploadAndLinkAsset(
  opts: UploadAndLinkOptions,
): Promise<{ readonly asset: CatalogAsset; readonly link: CatalogAssetLink }> {
  const { file, entityType, entityId, role, altAr = "", altEn = "", onProgress } = opts;
  const normalizedEntityType = entityTypeMap[entityType] ?? entityType;

  onProgress?.({ stage: "signing" });

  const intentInput: AssetUploadIntentInput = {
    fileName: file.name,
    mimeType: file.type || "image/jpeg",
    sizeBytes: file.size,
    altAr,
    altEn,
    intendedEntityType: normalizedEntityType,
    intendedEntityId: entityId,
    intendedRole: role,
  };

  const intent = await api.createAssetUploadIntent(intentInput);

  // Upload binary directly to MinIO presigned URL.
  onProgress?.({ stage: "uploading", percent: 0 });
  const uploadResp = await fetch(intent.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "image/jpeg" },
  });
  if (!uploadResp.ok) {
    // Rollback draft asset so object storage does not accumulate orphans.
    try {
      await api.deleteCatalogAsset(intent.asset.id);
    } catch {
      // best-effort
    }
    const err = `PUT to storage failed: HTTP ${uploadResp.status}`;
    onProgress?.({ stage: "failed", error: err });
    throw new Error(err);
  }

  onProgress?.({ stage: "verifying" });

  // Complete: server verifies object exists and auto-links if intent had target.
  const uploadedAsset = await api.completeAssetUpload(intent.asset.id);

  // Fetch links to find the auto-linked one, or link explicitly.
  let link: CatalogAssetLink | undefined;
  try {
    const links = await api.fetchCatalogAssetLinks({ entityType: normalizedEntityType, entityId });
    link = links.find((l) => l.assetId === uploadedAsset.id);
  } catch {
    // If listing fails, fall through to explicit link.
  }

  if (!link) {
    link = await api.linkCatalogAsset(uploadedAsset.id, {
      entityType: normalizedEntityType,
      entityId,
      role,
      isPrimary: false,
    });
  }

  onProgress?.({ stage: "linked", assetId: uploadedAsset.id, linkId: link.id });
  return { asset: uploadedAsset, link };
}

/**
 * Re-exports for convenience.
 */
export { api };
