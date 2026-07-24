import type { BthwaniMediaDraft, BthwaniMediaKind } from "./types";

const LIMITS: Record<BthwaniMediaKind, number> = {
  image: 12 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  document: 25 * 1024 * 1024,
};

export function inferBthwaniMediaKind(mimeType: string): BthwaniMediaKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

export function validateBthwaniMediaDraft(draft: BthwaniMediaDraft): void {
  if (!draft.localUri.trim() || !draft.fileName.trim() || !draft.mimeType.trim()) {
    throw new Error("MEDIA_METADATA_REQUIRED");
  }
  if (!Number.isSafeInteger(draft.sizeBytes)
    || draft.sizeBytes <= 0
    || draft.sizeBytes > LIMITS[draft.kind]) {
    throw new Error("MEDIA_SIZE_OUT_OF_RANGE");
  }
  if (inferBthwaniMediaKind(draft.mimeType) !== draft.kind && draft.kind !== "document") {
    throw new Error("MEDIA_KIND_MIME_MISMATCH");
  }
  if (draft.durationMs !== undefined
    && (!Number.isSafeInteger(draft.durationMs) || draft.durationMs < 0)) {
    throw new Error("MEDIA_DURATION_INVALID");
  }
}
