export type BthwaniMediaKind = "image" | "audio" | "video" | "document";
export type BthwaniMediaUploadStatus = "queued" | "uploading" | "processing" | "ready" | "failed";

export type BthwaniMediaDraft = {
  readonly localUri: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly kind: BthwaniMediaKind;
  readonly durationMs?: number;
  readonly thumbnailLocalUri?: string;
  readonly waveformRef?: string;
};

export type BthwaniMediaAssetRef = {
  readonly mediaAssetId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly kind: BthwaniMediaKind;
  readonly durationMs?: number;
  readonly thumbnailMediaAssetId?: string;
  readonly waveformRef?: string;
  readonly uploadStatus: Exclude<BthwaniMediaUploadStatus, "queued" | "uploading">;
};

export type BthwaniMediaUploadCheckpoint = {
  readonly uploadId: string;
  readonly offset: number;
  readonly totalBytes: number;
  readonly updatedAt: number;
};
