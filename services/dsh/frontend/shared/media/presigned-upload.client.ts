import { rewriteMobileDevPresignedMediaUrl } from "../_kernel/mobile-dev-gateway";

export type PresignedUploadResult = {
  readonly ok: boolean;
  readonly status: number;
};

export async function uploadBinaryToPresignedUrl(
  uploadUrl: string,
  body: Blob,
  contentType: string,
): Promise<PresignedUploadResult> {
  // Production and normal remote URLs pass through unchanged. Local development
  // presigned MinIO URLs are translated to the governed LAN gateway so a physical
  // device never needs direct access to the host-only MinIO listener.
  const targetUrl = rewriteMobileDevPresignedMediaUrl(uploadUrl);
  const response = await fetch(targetUrl, {
    method: "PUT",
    body,
    headers: { "Content-Type": contentType },
  });
  return { ok: response.ok, status: response.status };
}
