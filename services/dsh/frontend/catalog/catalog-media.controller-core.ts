/**
 * Framework-agnostic catalog media orchestration shared by web and Expo
 * surfaces. Mobile callers pass an Expo File as `body`; web callers may pass a
 * native File directly through `toUploadFileSource`.
 */
import * as catalogMediaApi from "./central-catalog.api";
import { submitGovernedReel } from "./reels.api";
import { uploadBinaryToPresignedUrl } from "../shared/media/presigned-upload.client";
import { corrId } from "../shared/_kernel/dsh-http-request";
import type { CatalogAsset, CatalogAssetLink, AssetUploadProgress } from "./central-catalog.types";
import type { GovernedReel, GovernedReelSubmissionInput } from "./reels.types";

export type { AssetUploadProgress };

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4"] as const;
export const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];
export type AllowedVideoMime = (typeof ALLOWED_VIDEO_MIME_TYPES)[number];

export type UploadFileSource = {
  readonly name: string;
  readonly type: string;
  readonly size: number;
  readonly body: Blob;
};

export function toUploadFileSource(file: File): UploadFileSource {
  return { name: file.name, type: file.type, size: file.size, body: file };
}

export function isAllowedImageMime(mime: string): mime is AllowedImageMime {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}

export function isAllowedVideoMime(mime: string): mime is AllowedVideoMime {
  return (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(mime);
}

export function validateImageFile(file: Pick<UploadFileSource, "type" | "size">): string | null {
  if (!isAllowedImageMime(file.type)) {
    return `File type "${file.type}" is not allowed. Only JPEG, PNG, and WebP images are accepted.`;
  }
  if (file.size <= 0) return "Image file is empty or unreadable.";
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `Image size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the 15 MB limit.`;
  }
  return null;
}

export function validateVideoFile(file: Pick<UploadFileSource, "type" | "size">): string | null {
  if (!isAllowedVideoMime(file.type)) {
    return `File type "${file.type}" is not allowed. Only MP4 videos are accepted for reels.`;
  }
  if (file.size <= 0) return "Video file is empty or unreadable.";
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return `Video size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the 100 MB limit.`;
  }
  return null;
}

export interface UploadImageOptions {
  readonly file: UploadFileSource;
  readonly entityType: string;
  readonly entityId: string;
  readonly role: string;
  readonly altAr?: string;
  readonly altEn?: string;
  readonly idempotencyKey?: string;
  readonly onProgress?: (p: AssetUploadProgress) => void;
}

const entityTypeServerMap: Record<string, string> = {
  domains: "domain",
  nodes: "node",
  "master-products": "master_product",
  "product-proposals": "product_proposal",
  stores: "store",
  "store-assortment": "store_assortment",
};

export async function uploadAndLinkImage(
  opts: UploadImageOptions,
): Promise<{ asset: CatalogAsset; link: CatalogAssetLink }> {
  const { file, entityType, entityId, role, altAr = "", altEn = "", idempotencyKey = corrId("catalog-asset-link"), onProgress } = opts;
  const validationError = validateImageFile(file);
  if (validationError) {
    onProgress?.({ stage: "failed", error: validationError });
    throw new Error(validationError);
  }

  const normalizedEntityType = entityTypeServerMap[entityType] ?? entityType;
  onProgress?.({ stage: "signing" });
  const intent = await catalogMediaApi.createAssetUploadIntent({
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    altAr,
    altEn,
    intendedEntityType: normalizedEntityType,
    intendedEntityId: entityId,
    intendedRole: role,
  }, idempotencyKey);

  onProgress?.({ stage: "uploading", percent: 0 });
  const uploadResp = await uploadBinaryToPresignedUrl(intent.uploadUrl, file.body, file.type);
  if (!uploadResp.ok) {
    const message = `Upload to storage failed: HTTP ${uploadResp.status}`;
    const cleanupError = await cleanupCatalogAssets([intent.asset.id]);
    onProgress?.({ stage: "failed", error: message });
    throw combineOperationAndCleanupError(message, cleanupError);
  }

  onProgress?.({ stage: "verifying" });
  let uploadedAsset: CatalogAsset;
  try {
    uploadedAsset = await catalogMediaApi.completeAssetUpload(intent.asset.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cleanupError = await cleanupCatalogAssets([intent.asset.id]);
    onProgress?.({ stage: "failed", error: message });
    throw combineOperationAndCleanupError(message, cleanupError);
  }

  const links = await catalogMediaApi.fetchCatalogAssetLinks({
    entityType: normalizedEntityType,
    entityId,
  });
  const link = links.find((item) => item.assetId === uploadedAsset.id);
  if (!link) {
    const message = "The completed catalog asset has no canonical intended link.";
    const cleanupError = await cleanupCatalogAssets([uploadedAsset.id]);
    throw combineOperationAndCleanupError(message, cleanupError);
  }

  onProgress?.({ stage: "linked", assetId: uploadedAsset.id, linkId: link.id });
  return { asset: uploadedAsset, link };
}

export interface UploadReelVideoOptions {
  readonly file: UploadFileSource;
  readonly posterFile?: UploadFileSource;
  readonly posterAssetId?: string;
  readonly targetType: "master_product" | "store" | "offer";
  readonly targetId: string;
  readonly titleAr?: string;
  readonly titleEn?: string;
  readonly subtitleAr?: string;
  readonly subtitleEn?: string;
  readonly highlightAr?: string;
  readonly highlightEn?: string;
  readonly ctaLabelAr?: string;
  readonly ctaLabelEn?: string;
  readonly sourceStoreId?: string;
  readonly idempotencyKey?: string;
  readonly onProgress?: (p: AssetUploadProgress) => void;
}

async function cleanupCatalogAssets(assetIds: readonly string[]): Promise<Error | null> {
  const failures: string[] = [];
  await Promise.all(assetIds.map(async (assetId) => {
    try {
      await catalogMediaApi.deleteCatalogAsset(assetId);
    } catch (error) {
      failures.push(`${assetId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }));
  return failures.length > 0 ? new Error(failures.join("; ")) : null;
}

function combineOperationAndCleanupError(message: string, cleanupError: Error | null): Error {
  return cleanupError
    ? new Error(`${message}; catalog cleanup failed: ${cleanupError.message}`)
    : new Error(message);
}

async function uploadReelPoster(file: UploadFileSource, idempotencyKey: string): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const intent = await catalogMediaApi.createAssetUploadIntent({
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    altAr: "غلاف فيديو ريلز",
    altEn: "Reel poster",
    intendedRole: "reel_poster",
  }, idempotencyKey);

  try {
    const uploadResp = await uploadBinaryToPresignedUrl(intent.uploadUrl, file.body, file.type);
    if (!uploadResp.ok) {
      throw new Error(`Poster upload to storage failed: HTTP ${uploadResp.status}`);
    }
    await catalogMediaApi.completeAssetUpload(intent.asset.id);
    return intent.asset.id;
  } catch (error) {
    const cleanupError = await cleanupCatalogAssets([intent.asset.id]);
    throw combineOperationAndCleanupError(error instanceof Error ? error.message : String(error), cleanupError);
  }
}

export async function uploadAndSubmitReel(opts: UploadReelVideoOptions): Promise<GovernedReel> {
  const {
    file,
    posterFile,
    posterAssetId,
    targetType,
    targetId,
    titleAr,
    titleEn,
    subtitleAr,
    subtitleEn,
    highlightAr,
    highlightEn,
    ctaLabelAr,
    ctaLabelEn,
    sourceStoreId,
    idempotencyKey,
    onProgress,
  } = opts;
  const workflowKey = idempotencyKey ?? corrId("catalog-reel-workflow");

  const validationError = validateVideoFile(file);
  if (validationError) {
    onProgress?.({ stage: "failed", error: validationError });
    throw new Error(validationError);
  }
  if (posterFile) {
    const posterError = validateImageFile(posterFile);
    if (posterError) {
      onProgress?.({ stage: "failed", error: posterError });
      throw new Error(posterError);
    }
  }

  const createdAssetIds: string[] = [];
  onProgress?.({ stage: "signing" });
  try {
    const intent = await catalogMediaApi.createAssetUploadIntent({
      fileName: file.name,
      mimeType: "video/mp4",
      sizeBytes: file.size,
      intendedRole: "reel_video",
    }, `${workflowKey}:video`);
    createdAssetIds.push(intent.asset.id);

    onProgress?.({ stage: "uploading", percent: 0 });
    const uploadResp = await uploadBinaryToPresignedUrl(intent.uploadUrl, file.body, "video/mp4");
    if (!uploadResp.ok) {
      throw new Error(`Video upload to storage failed: HTTP ${uploadResp.status}`);
    }

    onProgress?.({ stage: "verifying" });
    await catalogMediaApi.completeAssetUpload(intent.asset.id);

    let resolvedPosterAssetId = posterAssetId?.trim() || undefined;
    if (posterFile) {
      resolvedPosterAssetId = await uploadReelPoster(posterFile, `${workflowKey}:poster`);
      createdAssetIds.push(resolvedPosterAssetId);
    }

    const input: GovernedReelSubmissionInput = {
      assetId: intent.asset.id,
      targetType,
      targetId,
      ...(resolvedPosterAssetId ? { posterAssetId: resolvedPosterAssetId } : {}),
      ...(titleAr !== undefined ? { titleAr } : {}),
      ...(titleEn !== undefined ? { titleEn } : {}),
      ...(subtitleAr !== undefined ? { subtitleAr } : {}),
      ...(subtitleEn !== undefined ? { subtitleEn } : {}),
      ...(highlightAr !== undefined ? { highlightAr } : {}),
      ...(highlightEn !== undefined ? { highlightEn } : {}),
      ...(ctaLabelAr !== undefined ? { ctaLabelAr } : {}),
      ...(ctaLabelEn !== undefined ? { ctaLabelEn } : {}),
      ...(sourceStoreId !== undefined ? { sourceStoreId } : {}),
    };

    const reel = await submitGovernedReel(input, `${workflowKey}:submit`);
    onProgress?.({ stage: "linked", assetId: intent.asset.id });
    return reel;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cleanupError = await cleanupCatalogAssets(createdAssetIds);
    onProgress?.({ stage: "failed", error: message });
    throw combineOperationAndCleanupError(message, cleanupError);
  }
}

