export async function uploadCatalogBinary(input: {
  readonly uploadUrl: string;
  readonly body: Blob;
  readonly mimeType: string;
  readonly timeoutMs?: number;
}): Promise<void> {
  let response: Response;
  try {
    response = await globalThis.fetch(input.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": input.mimeType },
      body: input.body,
      signal: AbortSignal.timeout(input.timeoutMs ?? 30000),
    });
  } catch (error) {
    throw new Error(
      `PARTNER_PRODUCT_MEDIA_UPLOAD_NETWORK_FAILED: ${error instanceof Error ? error.message : "network error"}`,
    );
  }
  if (!response.ok) {
    throw new Error(`PARTNER_PRODUCT_MEDIA_UPLOAD_FAILED_${response.status}`);
  }
}
