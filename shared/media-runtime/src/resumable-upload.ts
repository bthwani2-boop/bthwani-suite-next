import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  BthwaniMediaAssetRef,
  BthwaniMediaDraft,
  BthwaniMediaUploadCheckpoint,
} from "./types";
import { validateBthwaniMediaDraft } from "./validation";

export type BthwaniMediaUploadSession = {
  readonly uploadId: string;
  readonly chunkSizeBytes: number;
};

export type BthwaniMediaUploadTransport = {
  createSession(draft: BthwaniMediaDraft): Promise<BthwaniMediaUploadSession>;
  uploadChunk(
    session: BthwaniMediaUploadSession,
    chunk: Blob,
    offset: number,
    totalBytes: number,
  ): Promise<void>;
  completeSession(
    session: BthwaniMediaUploadSession,
    draft: BthwaniMediaDraft,
  ): Promise<BthwaniMediaAssetRef>;
  abortSession?(session: BthwaniMediaUploadSession): Promise<void>;
};

export type UploadResumableMediaOptions = {
  readonly checkpointKey: string;
  readonly onProgress?: (uploadedBytes: number, totalBytes: number) => void;
};

export async function uploadResumableMedia(
  draft: BthwaniMediaDraft,
  transport: BthwaniMediaUploadTransport,
  options: UploadResumableMediaOptions,
): Promise<BthwaniMediaAssetRef> {
  validateBthwaniMediaDraft(draft);
  const source = await fetch(draft.localUri);
  if (!source.ok) throw new Error(`MEDIA_LOCAL_READ_FAILED:${source.status}`);
  const blob = await source.blob();
  if (blob.size !== draft.sizeBytes) throw new Error("MEDIA_SIZE_CHANGED");

  let session: BthwaniMediaUploadSession;
  let offset = 0;
  const persisted = await AsyncStorage.getItem(options.checkpointKey);
  if (persisted) {
    const checkpoint = JSON.parse(persisted) as BthwaniMediaUploadCheckpoint;
    session = {
      uploadId: checkpoint.uploadId,
      chunkSizeBytes: Math.min(5 * 1024 * 1024, checkpoint.totalBytes),
    };
    offset = Math.min(checkpoint.offset, draft.sizeBytes);
  } else {
    session = await transport.createSession(draft);
  }

  try {
    while (offset < draft.sizeBytes) {
      const chunkSize = Math.max(session.chunkSizeBytes, 256 * 1024);
      const end = Math.min(offset + chunkSize, draft.sizeBytes);
      await transport.uploadChunk(
        session,
        blob.slice(offset, end, draft.mimeType),
        offset,
        draft.sizeBytes,
      );
      offset = end;
      const checkpoint: BthwaniMediaUploadCheckpoint = {
        uploadId: session.uploadId,
        offset,
        totalBytes: draft.sizeBytes,
        updatedAt: Date.now(),
      };
      await AsyncStorage.setItem(options.checkpointKey, JSON.stringify(checkpoint));
      options.onProgress?.(offset, draft.sizeBytes);
    }
    const asset = await transport.completeSession(session, draft);
    await AsyncStorage.removeItem(options.checkpointKey);
    return asset;
  } catch (error) {
    if (offset === 0 && transport.abortSession) {
      await transport.abortSession(session).catch(() => undefined);
    }
    throw error;
  }
}
