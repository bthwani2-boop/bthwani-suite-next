export type DshBinaryRequestResult = {
  readonly ok: boolean;
  readonly status: number;
};

/**
 * Governed binary transport for presigned object-storage requests.
 *
 * Presigned URLs already carry their authorization in the URL/query string, so
 * this client deliberately does not attach Identity credentials, DSH headers,
 * or JSON framing. It owns timeout/error normalization while preserving the
 * exact URL, method, body, and Content-Type required by SigV4.
 */
export function createDshBinaryHttpClient(timeoutMs = 30_000) {
  async function put(
    url: string,
    body: Blob,
    contentType: string,
  ): Promise<DshBinaryRequestResult> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "PUT",
        body,
        headers: { "Content-Type": contentType },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw {
        kind: "network",
        message: error instanceof Error ? error.message : "network error",
      };
    }
    return { ok: response.ok, status: response.status };
  }

  return { put };
}
