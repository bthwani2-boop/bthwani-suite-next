import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { TokenResponse } from "@bthwani/core-identity/server";
import { identitySessionIsBoundToSurface } from "@bthwani/core-identity/session-policy";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearSessionCookies,
  isSameOriginRequest,
  setSessionCookies,
} from "../auth/_lib/cookies";
import {
  identityServerClient,
  isConcurrentRefreshError,
  isIdentityServerAvailabilityError,
  isIdentityServerInvalidSessionError,
} from "../auth/_lib/identity-server";
import { sendAuthenticatedUpstreamRequest } from "../_kernel/upstream-http-request";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type ControlPanelTokenPair = TokenResponse;

function noStoreJson(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function pathIsSafe(path: readonly string[]): boolean {
  return (
    path.length > 0 &&
    path.every(
      (segment) =>
        segment.length > 0 &&
        segment !== "." &&
        segment !== ".." &&
        !segment.includes("/") &&
        !segment.includes("\\"),
    )
  );
}

async function tryForward(
  request: Request,
  path: readonly string[],
  baseUrl: string,
  accessToken: string,
): Promise<Response | NextResponse> {
  try {
    return await sendAuthenticatedUpstreamRequest({ request, path, baseUrl, accessToken });
  } catch {
    return noStoreJson({ code: "UPSTREAM_UNAVAILABLE" }, 502);
  }
}

async function rotateControlPanelSession(
  refreshToken: string,
): Promise<ControlPanelTokenPair | null> {
  const rotated = await identityServerClient().refresh(refreshToken);
  if (!identitySessionIsBoundToSurface(rotated.identity, "control-panel")) return null;
  return rotated;
}

function expiredSessionResponse(status = 401): NextResponse {
  const response = noStoreJson(
    { code: status === 403 ? "CONTROL_PANEL_FORBIDDEN" : "SESSION_EXPIRED" },
    status,
  );
  clearSessionCookies(response);
  return response;
}

function refreshFailureResponse(error: unknown): NextResponse {
  if (isConcurrentRefreshError(error)) {
    return noStoreJson({ code: "REFRESH_ALREADY_ROTATED" }, 409);
  }
  if (isIdentityServerAvailabilityError(error) || !isIdentityServerInvalidSessionError(error)) {
    return noStoreJson({ code: "IDENTITY_UNAVAILABLE" }, 503);
  }
  return expiredSessionResponse();
}

export async function proxyAuthenticatedUpstream(
  request: Request,
  path: readonly string[],
  baseUrl: string,
): Promise<NextResponse> {
  if (!baseUrl) {
    return noStoreJson({ code: "BFF_UPSTREAM_NOT_CONFIGURED" }, 503);
  }
  if (!pathIsSafe(path)) {
    return noStoreJson({ code: "BFF_PATH_NOT_ALLOWED" }, 404);
  }
  if (MUTATING_METHODS.has(request.method) && !isSameOriginRequest(request)) {
    return noStoreJson({ code: "CROSS_ORIGIN_REJECTED" }, 403);
  }

  const store = await cookies();
  let accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;
  let rotatedCookies: ControlPanelTokenPair | null = null;

  if (!accessToken) {
    if (!refreshToken) return noStoreJson({ code: "SESSION_NOT_FOUND" }, 401);
    try {
      rotatedCookies = await rotateControlPanelSession(refreshToken);
      if (!rotatedCookies) return expiredSessionResponse(403);
      accessToken = rotatedCookies.accessToken;
    } catch (error) {
      return refreshFailureResponse(error);
    }
  }

  let upstream = await tryForward(request.clone(), path, baseUrl, accessToken);

  if (upstream.status === 401 && refreshToken) {
    try {
      rotatedCookies = await rotateControlPanelSession(refreshToken);
      if (!rotatedCookies) return expiredSessionResponse(403);
      upstream = await tryForward(
        request.clone(),
        path,
        baseUrl,
        rotatedCookies.accessToken,
      );
    } catch (error) {
      return refreshFailureResponse(error);
    }
  }

  const responseBody = await upstream.arrayBuffer();
  const response = new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
      ...(upstream.headers.get("etag")
        ? { ETag: upstream.headers.get("etag") as string }
        : {}),
      ...(upstream.headers.get("x-correlation-id")
        ? {
            "X-Correlation-ID": upstream.headers.get(
              "x-correlation-id",
            ) as string,
          }
        : {}),
    },
  });

  if (rotatedCookies) setSessionCookies(response, rotatedCookies);
  return response;
}
