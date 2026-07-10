import type { DshMediaAsset } from "../media/dsh-media-api.client";
import type { CatalogMedia } from "../catalog/catalog.types";
import {
  completeMedia,
  deleteMedia as deleteCatalogMedia,
  uploadMediaIntent,
} from "../catalog/catalog.api";
import { fetchPartnerCatalog } from "../catalog/legacy-catalog-compat.api";
import { createDispatchAssignment } from "../dispatch/dispatch.api";

type MediaListQuery = {
  readonly owner_type: "product" | "store" | "category";
  readonly owner_id: string;
};

type MediaUploadInput = MediaListQuery & {
  readonly media_type: "image" | "video";
  readonly purpose: string;
  readonly filename: string;
  readonly mime_type: string;
  readonly file_size_bytes?: number;
};

function toRuntimeMedia(media: CatalogMedia): DshMediaAsset {
  return {
    id: media.id,
    entity_id: media.productId ?? "",
    entity_type: "product",
    media_key: media.objectKey,
    url: media.publicUrl ?? "",
    mime_type: media.contentType,
    created_at: "",
    purpose: "primary",
    ...(media.publicUrl ? { public_url: media.publicUrl } : {}),
    status: media.state,
  };
}

async function listProductMedia(productId: string): Promise<readonly DshMediaAsset[]> {
  const state = await fetchPartnerCatalog();

  if (state.kind === "permission_denied") {
    throw { kind: "http", status: 403 };
  }
  if (state.kind === "error") {
    throw { kind: "runtime", message: state.message };
  }
  if (state.kind !== "success") {
    return [];
  }

  const product = state.catalog.products.find((item) => item.id === productId);
  return product?.media.map(toRuntimeMedia) ?? [];
}

export function getDshMediaRuntimeClient() {
  return {
    async listAssets(
      entityId: string,
      entityType: "product" | "store" | "category",
    ): Promise<readonly DshMediaAsset[]> {
      // The current partner catalog contract exposes product media only.
      if (entityType !== "product") return [];
      return listProductMedia(entityId);
    },

    async listMedia(query: MediaListQuery): Promise<{ items: readonly DshMediaAsset[] }> {
      if (query.owner_type !== "product") return { items: [] };
      return { items: await listProductMedia(query.owner_id) };
    },

    async createUploadIntent(
      input: MediaUploadInput,
      _headers?: Record<string, string>,
    ) {
      if (input.owner_type !== "product") {
        throw { kind: "validation", message: "Only product media upload is supported." };
      }

      const intent = await uploadMediaIntent({
        productId: input.owner_id,
        contentType: input.mime_type,
        fileName: input.filename,
      });

      return {
        intent: {
          media_id: intent.mediaId,
          upload_url: intent.uploadUrl,
          object_key: intent.objectKey,
          expires_at: intent.expiresAt,
        },
      };
    },

    async readLocalUriAsBlob(uri: string): Promise<Blob> {
      let response: Response;
      try {
        response = await fetch(uri);
      } catch (error) {
        throw {
          code: "offline",
          message: error instanceof Error ? error.message : "media source read failed",
        };
      }

      if (!response.ok) {
        throw {
          code: "storage_unavailable",
          message: `media source read failed with HTTP ${response.status}`,
        };
      }

      return response.blob();
    },

    async putToPresignedUrl(
      uploadUrl: string,
      body: Blob,
      contentType: string,
    ): Promise<void> {
      let response: Response;
      try {
        response = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": contentType,
          },
          body,
        });
      } catch (error) {
        throw {
          code: "offline",
          message: error instanceof Error ? error.message : "media upload network error",
        };
      }

      if (!response.ok) {
        throw {
          code: "storage_unavailable",
          message: `media upload failed with HTTP ${response.status}`,
        };
      }
    },

    async completeUpload(
      mediaId: string,
      _body?: unknown,
      _headers?: Record<string, string>,
    ) {
      return { media: toRuntimeMedia(await completeMedia(mediaId)) };
    },

    async deleteMedia(
      mediaId: string,
      _headers?: Record<string, string>,
    ): Promise<void> {
      await deleteCatalogMedia(mediaId);
    },
  };
}

export function getDshOrderLifecycleRuntimeClient() {
  return {
    assignCaptain(
      orderId: string,
      input: { readonly captain_id: string },
    ) {
      return createDispatchAssignment({
        orderId,
        captainId: input.captain_id,
      });
    },
  };
}
