import type { BthwaniMediaAssetRef } from "./types";

export type SupportMessageAttachmentInput = {
  readonly mediaAssetId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly kind: BthwaniMediaAssetRef["kind"];
  readonly durationMs?: number;
  readonly thumbnailMediaAssetId?: string;
  readonly waveformRef?: string;
  readonly uploadStatus: BthwaniMediaAssetRef["uploadStatus"];
};

export function toSupportMessageAttachment(
  asset: BthwaniMediaAssetRef,
): SupportMessageAttachmentInput {
  return { ...asset };
}
