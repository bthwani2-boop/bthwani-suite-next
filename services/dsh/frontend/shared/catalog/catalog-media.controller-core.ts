/**
 * Framework-agnostic catalog media orchestration shared by web and Expo
 * surfaces. Mobile callers pass an Expo File as `body`; web callers may pass a
 * native File directly through `toUploadFileSource`.
 */
import * as catalogMediaApi from "./central-catalog.api";
import { uploadBinaryToPresignedUrl } from "../media/presigned-upload";
import type {
  CatalogAsset,
  CatalogAssetLink,
  AssetUploadProgress,
  CreateReelSubmissionInput,
  ReviewReelInput,
  Reel,
  PublicReel,
} from "./central-catalog.types";

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
  const { file, entityType, entityId, role, altAr = "", altEn = "", onProgress } = opts;
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
  });

  onProgress?.({ stage: "uploading", percent: 0 });
  const uploadResp = await uploadBinaryToPresignedUrl(intent.uploadUrl, file.body, file.type);
  if (!uploadResp.ok) {
    await deleteAssetsBestEffort([intent.asset.id]);
    const message = `Upload to storage failed: HTTP ${uploadResp.status}`;
    onProgress?.({ stage: "failed", error: message });
    throw new Error(message);
  }

  onProgress?.({ stage: "verifying" });
  let uploadedAsset: CatalogAsset;
  try {
    uploadedAsset = await catalogMediaApi.completeAssetUpload(intent.asset.id);
  } catch (error) {
    await deleteAssetsBestEffort([intent.asset.id]);
    onProgress?.({ stage: "failed", error: String(error) });
    throw error;
  }

  let link: CatalogAssetLink | undefined;
  try {
    const links = await catalogMediaApi.fetchCatalogAssetLinks({
      entityType: normalizedEntityType,
      entityId,
    });
    link = links.find((item) => item.assetId === uploadedAsset.id);
  } catch {
    // Explicit linking below remains the canonical fallback.
  }

  try {
    if (!link) {
      link = await catalogMediaApi.linkCatalogAsset(uploadedAsset.id, {
        entityType: normalizedEntityType,
        entityId,
        role,
        isPrimary: false,
      });
    }
  } catch (error) {
    await deleteAssetsBestEffort([uploadedAsset.id]);
    throw error;
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
  readonly onProgress?: (p: AssetUploadProgress) => void;
}

type GovernedReelSubmissionInput = CreateReelSubmissionInput & {
  readonly posterAssetId?: string;
  readonly subtitleAr?: string;
  readonly subtitleEn?: string;
  readonly highlightAr?: string;
  readonly highlightEn?: string;
  readonly ctaLabelAr?: string;
  readonly ctaLabelEn?: string;
};

async function deleteAssetsBestEffort(assetIds: readonly string[]): Promise<void> {
  await Promise.all(assetIds.map(async (assetId) => {
    try {
      await catalogMediaApi.deleteCatalogAsset(assetId);
    } catch {
      // Cleanup is best effort and must not hide the original failure.
    }
  }));
}

async function uploadReelPoster(file: UploadFileSource): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const intent = await catalogMediaApi.createAssetUploadIntent({
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    altAr: "غلاف فيديو ريلز",
    altEn: "Reel poster",
    intendedRole: "reel_poster",
  });

  try {
    const uploadResp = await uploadBinaryToPresignedUrl(intent.uploadUrl, file.body, file.type);
    if (!uploadResp.ok) {
      throw new Error(`Poster upload to storage failed: HTTP ${uploadResp.status}`);
    }
    await catalogMediaApi.completeAssetUpload(intent.asset.id);
    return intent.asset.id;
  } catch (error) {
    await deleteAssetsBestEffort([intent.asset.id]);
    throw error;
  }
}

export async function uploadAndSubmitReel(opts: UploadReelVideoOptions): Promise<Reel> {
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
    onProgress,
  } = opts;

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
    });
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
      resolvedPosterAssetId = await uploadReelPoster(posterFile);
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

    const reel = await catalogMediaApi.submitReel(input);
    onProgress?.({ stage: "linked", assetId: intent.asset.id });
    return reel;
  } catch (error) {
    await deleteAssetsBestEffort(createdAssetIds);
    const message = error instanceof Error ? error.message : String(error);
    onProgress?.({ stage: "failed", error: message });
    throw error;
  }
}

export type GovernedReviewReelInput = ReviewReelInput & {
  readonly posterAssetId?: string;
  readonly titleAr?: string;
  readonly titleEn?: string;
  readonly subtitleAr?: string;
  readonly subtitleEn?: string;
  readonly highlightAr?: string;
  readonly highlightEn?: string;
  readonly ctaLabelAr?: string;
  readonly ctaLabelEn?: string;
};

export async function reviewReelAsOperator(reelId: string, input: GovernedReviewReelInput): Promise<Reel> {
  return catalogMediaApi.reviewReel(reelId, input);
}

export async function fetchPublicReels(limit?: number): Promise<readonly PublicReel[]> {
  return catalogMediaApi.fetchPublicReels(limit);
}

export async function fetchOperatorReels(query?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<readonly Reel[]> {
  return catalogMediaApi.fetchReels(query);
}
