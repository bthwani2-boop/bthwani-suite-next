import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, clearSessionCookies, isSameOriginRequest, setSessionCookies } from "../../auth/_lib/cookies";
import { resolveWorkforceServerBaseUrl } from "../../auth/_lib/env";
import { identityServerClient } from "../../auth/_lib/identity-server";

export const runtime = "nodejs";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function forward(
  request: Request,
  path: string[],
  accessToken: string,
): Promise<Response> {
  const search = new URL(request.url).search;
  const targetUrl = new URL(path.join("/"), `${resolveWorkforceServerBaseUrl()}/`);
  targetUrl.search = search;

  const method = request.method;
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;
  const contentType = request.headers.get("content-type");
  const correlationId = request.headers.get("x-correlation-id") ?? `cp-bff-${globalThis.crypto.randomUUID()}`;
  const idempotencyKey = request.headers.get("idempotency-key");

  return fetch(targetUrl, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Correlation-ID": correlationId,
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...(contentType ? { "Content-Type": contentType } : {}),
    },
    body: body && body.byteLength > 0 ? body : undefined,
    signal: AbortSignal.timeout(15000),
  });
}

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  if (MUTATING_METHODS.has(request.method) && !isSameOriginRequest(request)) {
    return NextResponse.json({ code: "CROSS_ORIGIN_REJECTED" }, { status: 403 });
  }

  const { path } = await context.params;
  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json(
      { code: "SESSION_NOT_FOUND" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let upstream = await forward(request.clone(), path, accessToken);
  let rotatedCookies: { accessToken: string; refreshToken: string } | null = null;

  if (upstream.status === 401 && refreshToken) {
    try {
      const rotated = await identityServerClient().refresh(refreshToken);
      rotatedCookies = rotated;
      upstream = await forward(request.clone(), path, rotated.accessToken);
    } catch {
      const response = NextResponse.json(
        { code: "SESSION_EXPIRED" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
      clearSessionCookies(response);
      return response;
    }
  }

  const responseBody = await upstream.arrayBuffer();
  const response = new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });

  if (rotatedCookies) {
    setSessionCookies(response, rotatedCookies);
  }
  return response;
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
