import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type { DshMediaAsset } from "../media/dsh-media-api.client";
import {
  completeAssetUpload,
  createAssetUploadIntent,
  fetchCatalogAssetLinks,
  fetchPartnerStoreAssortment,
  unlinkCatalogAsset,
} from "./central-catalog.api";
import { validateImageFile } from "./catalog-media.controller-core";
import type { CatalogAsset, CatalogAssetLink, StoreAssortment } from "./central-catalog.types";

const apiBaseUrl = resolveDshApiBaseUrl().replace(/\/$/, "");
const PARTNER_CUSTOM_IMAGE_ROLE = "partner_custom_product_image";

type CatalogAssetLinkReadModel = CatalogAssetLink & {
  readonly objectKey?: string;
  readonly publicUrl?: string;
  readonly altAr?: string;
  readonly altEn?: string;
  readonly mimeType?: string;
};

export type PartnerProductMediaUploadInput = {
  readonly storeId: string;
  readonly productId: string;
  readonly fileName: string;
  readonly body: Blob;
  readonly mimeType: string;
  readonly fileSizeBytes: number;
  readonly altAr?: string;
};

function publicUrl(path: string | undefined, status: string): string {
  const normalized = path?.trim() ?? "";
  if (status !== "approved" || !normalized) return "";
  return /^https?:\/\//i.test(normalized) ? normalized : `${apiBaseUrl}${normalized.startsWith("/") ? "" : "/"}${normalized}`;
}

function mapLinkToMediaAsset(
  link: CatalogAssetLinkReadModel,
  productId: string,
): DshMediaAsset {
  const url = publicUrl(link.publicUrl, link.status);
  return {
    id: link.assetId,
    entity_id: productId,
    entity_type: "product",
    media_key: link.assetId,
    url,
    public_url: url,
    mime_type: link.mimeType ?? "image/jpeg",
    created_at: link.createdAt,
    purpose: PARTNER_CUSTOM_IMAGE_ROLE,
    status: link.status,
  };
}

function mapCompletedAsset(asset: CatalogAsset, productId: string): DshMediaAsset {
  return {
    id: asset.id,
    entity_id: productId,
    entity_type: "product",
    media_key: asset.id,
    url: "",
    public_url: "",
    mime_type: asset.mimeType,
    created_at: asset.createdAt,
    purpose: PARTNER_CUSTOM_IMAGE_ROLE,
    status: asset.status,
    file_size_bytes: asset.sizeBytes,
  };
}

async function findStoreAssortment(
  storeId: string,
  productId: string,
): Promise<StoreAssortment | null> {
  const assortment = await fetchPartnerStoreAssortment(storeId);
  return assortment.find((item) => item.masterProductId === productId) ?? null;
}

async function requireStoreAssortment(
  storeId: string,
  productId: string,
): Promise<StoreAssortment> {
  const assortment = await findStoreAssortment(storeId, productId);
  if (!assortment) {
    throw new Error("PARTNER_STORE_ASSORTMENT_REQUIRED_BEFORE_PRODUCT_MEDIA");
  }
  return assortment;
}

async function uploadBinary(uploadUrl: string, body: Blob, mimeType: string): Promise<void> {
  const uploadResponse = await globalThis.fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body,
  });
  if (!uploadResponse.ok) {
    throw new Error(`PARTNER_PRODUCT_MEDIA_UPLOAD_FAILED_${uploadResponse.status}`);
  }
}

export async function listPartnerProductMedia(
  storeId: string,
  productId: string,
): Promise<readonly DshMediaAsset[]> {
  const assortment = await findStoreAssortment(storeId, productId);
  if (!assortment) return [];

  const links = await fetchCatalogAssetLinks({
    entityType: "store_assortment",
    entityId: assortment.id,
  });

  return links
    .filter((link) => link.role === PARTNER_CUSTOM_IMAGE_ROLE && link.status !== "archived")
    .map((link) => mapLinkToMediaAsset(link as CatalogAssetLinkReadModel, productId));
}

export async function uploadPartnerProductMedia(
  input: PartnerProductMediaUploadInput,
): Promise<DshMediaAsset> {
  const validationError = validateImageFile({
    type: input.mimeType,
    size: input.fileSizeBytes,
  });
  if (validationError) throw new Error(validationError);

  const assortment = await requireStoreAssortment(input.storeId, input.productId);
  const intent = await createAssetUploadIntent({
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.fileSizeBytes,
    altAr: input.altAr?.trim() || input.fileName,
    intendedEntityType: "store_assortment",
    intendedEntityId: assortment.id,
    intendedRole: PARTNER_CUSTOM_IMAGE_ROLE,
  });

  await uploadBinary(intent.uploadUrl, input.body, input.mimeType);

  // CompleteAssetUpload atomically creates the pending-review link from the
  // intended target captured in the upload intent. Do not create a second link.
  const completed = await completeAssetUpload(intent.asset.id);
  return mapCompletedAsset(completed, input.productId);
}

export async function unlinkPartnerProductMedia(
  storeId: string,
  productId: string,
  assetId: string,
): Promise<void> {
  const assortment = await requireStoreAssortment(storeId, productId);
  const links = await fetchCatalogAssetLinks({
    entityType: "store_assortment",
    entityId: assortment.id,
  });
  const link = links.find(
    (candidate) => candidate.assetId === assetId && candidate.role === PARTNER_CUSTOM_IMAGE_ROLE,
  );
  if (!link) {
    throw new Error("PARTNER_PRODUCT_MEDIA_LINK_NOT_FOUND");
  }
  await unlinkCatalogAsset(assetId, link.id, {
    entityType: "store_assortment",
    entityId: assortment.id,
  });
}
