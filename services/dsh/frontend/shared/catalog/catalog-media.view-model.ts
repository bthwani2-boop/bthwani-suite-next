/**
 * catalog-media.view-model.ts
 *
 * View model helpers for catalog media UI.
 * Provides computed values from raw data for rendering states.
 */
import type {
  CatalogAsset,
  CatalogAssetLink,
  AssetUploadProgress,
  EffectiveImage,
  ClientVisibleCatalogEntry,
} from "./central-catalog.types";

// ─── Upload state labels ───────────────────────────────────────────────────────

export function uploadStageLabel(progress: AssetUploadProgress): string {
  switch (progress.stage) {
    case "idle":
      return "";
    case "signing":
      return "Preparing upload...";
    case "uploading":
      return `Uploading... ${progress.percent}%`;
    case "verifying":
      return "Verifying upload...";
    case "linked":
      return "Upload complete";
    case "failed":
      return `Upload failed: ${progress.error}`;
  }
}

export function isUploadInProgress(progress: AssetUploadProgress): boolean {
  return progress.stage === "signing" || progress.stage === "uploading" || progress.stage === "verifying";
}

export function isUploadTerminal(progress: AssetUploadProgress): boolean {
  return progress.stage === "linked" || progress.stage === "failed";
}

// ─── Asset card states ─────────────────────────────────────────────────────────

export type AssetCardState =
  | { kind: "draft"; asset: CatalogAsset }
  | { kind: "pending"; asset: CatalogAsset }
  | { kind: "approved"; asset: CatalogAsset; link: CatalogAssetLink }
  | { kind: "rejected"; asset: CatalogAsset; reason: string }
  | { kind: "archived"; asset: CatalogAsset };

export function assetCardStateFromAsset(asset: CatalogAsset, link?: CatalogAssetLink): AssetCardState {
  switch (asset.status) {
    case "draft":
      return { kind: "draft", asset };
    case "uploaded":
    case "pending_review":
      return { kind: "pending", asset };
    case "approved":
      return link ? { kind: "approved", asset, link } : { kind: "pending", asset };
    case "rejected":
      return { kind: "rejected", asset, reason: asset.reviewNote };
    case "archived":
      return { kind: "archived", asset };
  }
}

// ─── Effective image resolution ────────────────────────────────────────────────

/**
 * Resolve the effective image URL for a catalog product entry.
 * Priority: effectiveImage from server > fallback to null.
 * Client must not reconstruct image URLs from objectKey.
 */
export function resolveProductImage(entry: ClientVisibleCatalogEntry): EffectiveImage | null {
  return entry.effectiveImage ?? null;
}

/**
 * Find the approved primary link with a given role from a list of links.
 */
export function findPrimaryApprovedLink(
  links: readonly CatalogAssetLink[],
  role: CatalogAssetLink["role"],
): CatalogAssetLink | undefined {
  return links.find((l) => l.role === role && l.isPrimary && l.status === "approved");
}

/**
 * Build the public media URL for an asset served via /dsh/public/media.
 */
export function buildPublicMediaUrl(baseUrl: string, assetId: string, variant: "original" | "thumbnail" = "original"): string {
  return `${baseUrl}/dsh/public/media/${encodeURIComponent(assetId)}/${variant}`;
}

// ─── Gallery ordering ──────────────────────────────────────────────────────────

export function sortLinksByOrder(links: readonly CatalogAssetLink[]): readonly CatalogAssetLink[] {
  return [...links].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return a.sortOrder - b.sortOrder;
  });
}

// ─── Alt text validation ───────────────────────────────────────────────────────

export function validateAltText(altAr: string): string | null {
  if (!altAr || altAr.trim().length === 0) {
    return "Arabic alt text is required for accessibility.";
  }
  if (altAr.trim().length > 200) {
    return "Alt text must be 200 characters or fewer.";
  }
  return null;
}
