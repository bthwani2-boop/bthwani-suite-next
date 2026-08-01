export type PresignedUploadResult = {
  readonly ok: boolean;
  readonly status: number;
};

export async function uploadBinaryToPresignedUrl(
  uploadUrl: string,
  body: Blob,
  contentType: string,
): Promise<PresignedUploadResult> {
  // We use raw fetch instead of createDshHttpClient because we are uploading directly 
  // to an S3 presigned URL, which will reject the request if BThwani custom headers 
  // (added by the approved client) are present.
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body,
    headers: { "Content-Type": contentType },
  });
  return { ok: response.ok, status: response.status };
}
