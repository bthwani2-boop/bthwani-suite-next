export async function readCatalogNativeUriAsBlob(uri: string): Promise<Blob> {
  const normalizedUri = uri.trim();
  if (!normalizedUri) {
    throw new Error("PARTNER_PRODUCT_MEDIA_SOURCE_URI_REQUIRED");
  }

  let response: Response;
  try {
    response = await globalThis.fetch(normalizedUri);
  } catch (error) {
    throw new Error(
      `PARTNER_PRODUCT_MEDIA_SOURCE_READ_NETWORK_FAILED: ${error instanceof Error ? error.message : "network error"}`,
    );
  }
  if (!response.ok) {
    throw new Error(`PARTNER_PRODUCT_MEDIA_SOURCE_READ_FAILED_${response.status}`);
  }
  return response.blob();
}
