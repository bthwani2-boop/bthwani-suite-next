export type UpstreamRequestOptions = {
  readonly request: Request;
  readonly path: readonly string[];
  readonly baseUrl: string;
  readonly accessToken: string;
};

export async function sendAuthenticatedUpstreamRequest({
  request,
  path,
  baseUrl,
  accessToken,
}: UpstreamRequestOptions): Promise<Response> {
  const targetUrl = new URL(path.join("/"), `${baseUrl.replace(/\/$/, "")}/`);
  targetUrl.search = new URL(request.url).search;

  const method = request.method;
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;
  const contentType = request.headers.get("content-type");
  const correlationId = request.headers.get("x-correlation-id") ?? `cp-bff-${globalThis.crypto.randomUUID()}`;
  const idempotencyKey = request.headers.get("idempotency-key");
  const ifMatch = request.headers.get("if-match");

  return fetch(targetUrl, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Correlation-ID": correlationId,
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...(ifMatch ? { "If-Match": ifMatch } : {}),
      ...(contentType ? { "Content-Type": contentType } : {}),
    },
    body: body && body.byteLength > 0 ? body : undefined,
    signal: AbortSignal.timeout(15000),
  });
}
