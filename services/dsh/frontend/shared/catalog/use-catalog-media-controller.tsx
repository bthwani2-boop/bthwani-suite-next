/**
 * use-catalog-media-controller.tsx
 *
 * React hook binding the catalog-media controller-core.
 * Manages upload progress state and exposes stable callbacks.
 */
import { useState, useCallback, useRef } from "react";
import type { AssetUploadProgress, CatalogAsset, CatalogAssetLink } from "./central-catalog.types";
import {
  uploadAndLinkImage,
  uploadAndSubmitReel,
  type UploadImageOptions,
  type UploadReelVideoOptions,
} from "./catalog-media.controller-core";
import type { Reel } from "./central-catalog.types";

export interface UseCatalogMediaController {
  readonly progress: AssetUploadProgress;
  readonly isUploading: boolean;
  readonly uploadImage: (
    opts: Omit<UploadImageOptions, "onProgress">,
  ) => Promise<{ asset: CatalogAsset; link: CatalogAssetLink } | null>;
  readonly uploadReelVideo: (
    opts: Omit<UploadReelVideoOptions, "onProgress">,
  ) => Promise<Reel | null>;
  readonly reset: () => void;
}

export function useCatalogMediaController(): UseCatalogMediaController {
  const [progress, setProgress] = useState<AssetUploadProgress>({ stage: "idle" });
  const aborted = useRef(false);

  const reset = useCallback(() => {
    aborted.current = false;
    setProgress({ stage: "idle" });
  }, []);

  const uploadImage = useCallback(
    async (opts: Omit<UploadImageOptions, "onProgress">) => {
      aborted.current = false;
      try {
        const result = await uploadAndLinkImage({
          ...opts,
          onProgress: (p) => {
            if (!aborted.current) setProgress(p);
          },
        });
        return result;
      } catch {
        // Error already reflected in progress state via onProgress.
        return null;
      }
    },
    [],
  );

  const uploadReelVideo = useCallback(
    async (opts: Omit<UploadReelVideoOptions, "onProgress">) => {
      aborted.current = false;
      try {
        const reel = await uploadAndSubmitReel({
          ...opts,
          onProgress: (p) => {
            if (!aborted.current) setProgress(p);
          },
        });
        return reel;
      } catch {
        return null;
      }
    },
    [],
  );

  const isUploading =
    progress.stage === "signing" ||
    progress.stage === "uploading" ||
    progress.stage === "verifying";

  return { progress, isUploading, uploadImage, uploadReelVideo, reset };
}
