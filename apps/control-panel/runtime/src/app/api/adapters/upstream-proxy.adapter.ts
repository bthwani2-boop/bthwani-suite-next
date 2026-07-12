import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearSessionCookies,
  isSameOriginRequest,
  setSessionCookies,
} from "../auth/_lib/cookies";
import { identityServerClient } from "../auth/_lib/identity-server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type TokenPair = { accessToken: string; refreshToken: string };

async function forwardUpstream(
  request: Request,
  path: readonly string[],
  baseUrl: string,
  accessToken: string,
): Promise<Response> {
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

function noStoreJson(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function tryForward(
  request: Request,
  path: readonly string[],
  baseUrl: string,
  accessToken: string,
): Promise<Response | NextResponse> {
  try {
    return await forwardUpstream(request, path, baseUrl, accessToken);
  } catch {
    return noStoreJson({ code: "UPSTREAM_UNAVAILABLE" }, 502);
  }
}

export async function proxyAuthenticatedUpstream(
  request: Request,
  path: readonly string[],
  baseUrl: string,
): Promise<NextResponse> {
  if (MUTATING_METHODS.has(request.method) && !isSameOriginRequest(request)) {
    return noStoreJson({ code: "CROSS_ORIGIN_REJECTED" }, 403);
  }

  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return noStoreJson({ code: "SESSION_NOT_FOUND" }, 401);
  }

  let upstream = await tryForward(request.clone(), path, baseUrl, accessToken);
  let rotatedCookies: TokenPair | null = null;

  if (upstream.status === 401 && refreshToken) {
    try {
      const rotated = await identityServerClient().refresh(refreshToken);
      rotatedCookies = rotated;
      upstream = await tryForward(request.clone(), path, baseUrl, rotated.accessToken);
    } catch {
      const response = noStoreJson({ code: "SESSION_EXPIRED" }, 401);
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
