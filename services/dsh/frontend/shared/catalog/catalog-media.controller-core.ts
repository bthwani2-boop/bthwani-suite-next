/**
 * catalog-media.controller-core.ts
 *
 * Pure-function controller logic for catalog media operations.
 * Framework-agnostic: can be used from React hooks, tests, or CLI tools.
 *
 * Architecture: triad pattern (controller-core + view-model + use-*-controller)
 * matching the existing central-catalog.controller-core.ts pattern.
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

// ─── Image upload constraints ─────────────────────────────────────────────────

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4"] as const;
export const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MiB
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100 MiB

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];
export type AllowedVideoMime = (typeof ALLOWED_VIDEO_MIME_TYPES)[number];

export function isAllowedImageMime(mime: string): mime is AllowedImageMime {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}

export function isAllowedVideoMime(mime: string): mime is AllowedVideoMime {
  return (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(mime);
}

export function validateImageFile(file: File): string | null {
  if (!isAllowedImageMime(file.type)) {
    return `File type "${file.type}" is not allowed. Only JPEG, PNG, and WebP images are accepted.`;
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `Image size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the 15 MB limit.`;
  }
  return null;
}

export function validateVideoFile(file: File): string | null {
  if (!isAllowedVideoMime(file.type)) {
    return `File type "${file.type}" is not allowed. Only MP4 videos are accepted for reels.`;
  }
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return `Video size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the 100 MB limit.`;
  }
  return null;
}

// ─── Upload + link orchestration ──────────────────────────────────────────────

export interface UploadImageOptions {
  readonly file: File;
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

/**
 * Upload an image file and link it to a catalog entity.
 * Validates client-side before uploading.
 * Rolls back via deleteCatalogAsset on PUT failure.
 */
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

  const uploadResp = await uploadBinaryToPresignedUrl(intent.uploadUrl, file, file.type);

  if (!uploadResp.ok) {
    try {
      await catalogMediaApi.deleteCatalogAsset(intent.asset.id);
    } catch {
      /* best-effort */
    }
    const err = `Upload to storage failed: HTTP ${uploadResp.status}`;
    onProgress?.({ stage: "failed", error: err });
    throw new Error(err);
  }

  onProgress?.({ stage: "verifying" });

  let uploadedAsset: CatalogAsset;
  try {
    uploadedAsset = await catalogMediaApi.completeAssetUpload(intent.asset.id);
  } catch (err) {
    onProgress?.({ stage: "failed", error: String(err) });
    throw err;
  }

  let link: CatalogAssetLink | undefined;
  try {
    const links = await catalogMediaApi.fetchCatalogAssetLinks({
      entityType: normalizedEntityType,
      entityId,
    });
    link = links.find((l) => l.assetId === uploadedAsset.id);
  } catch {
    /* If listing fails, fall through to explicit link */
  }

  if (!link) {
    link = await catalogMediaApi.linkCatalogAsset(uploadedAsset.id, {
      entityType: normalizedEntityType,
      entityId,
      role,
      isPrimary: false,
    });
  }

  onProgress?.({ stage: "linked", assetId: uploadedAsset.id, linkId: link.id });
  return { asset: uploadedAsset, link };
}

// ─── Reel video upload ────────────────────────────────────────────────────────

export interface UploadReelVideoOptions {
  readonly file: File;
  readonly posterFile?: File;
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
      // Cleanup must not hide the original upload or submission error.
    }
  }));
}

async function uploadReelPoster(file: File): Promise<string> {
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
  const uploadResp = await uploadBinaryToPresignedUrl(intent.uploadUrl, file, file.type);
  if (!uploadResp.ok) {
    await deleteAssetsBestEffort([intent.asset.id]);
    throw new Error(`Poster upload to storage failed: HTTP ${uploadResp.status}`);
  }
  await catalogMediaApi.completeAssetUpload(intent.asset.id);
  return intent.asset.id;
}

/**
 * Upload an MP4 video and optional poster, then create a reel submission.
 * Both assets remain unapproved until the operator reviews the reel; backend
 * approval promotes video and poster in the same transaction.
 */
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
    const uploadResp = await uploadBinaryToPresignedUrl(intent.uploadUrl, file, "video/mp4");
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
  } catch (err) {
    await deleteAssetsBestEffort(createdAssetIds);
    const message = err instanceof Error ? err.message : String(err);
    onProgress?.({ stage: "failed", error: message });
    throw err;
  }
}

// ─── Operator review ──────────────────────────────────────────────────────────

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
