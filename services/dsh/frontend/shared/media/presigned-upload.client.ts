export type PresignedUploadResult = {
  readonly ok: boolean;
  readonly status: number;
};

export async function uploadBinaryToPresignedUrl(
  uploadUrl: string,
  body: Blob,
  contentType: string,
): Promise<PresignedUploadResult> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body,
    headers: { "Content-Type": contentType },
  });
  return { ok: response.ok, status: response.status };
}
