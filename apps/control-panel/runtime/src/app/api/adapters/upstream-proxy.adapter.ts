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
import { sendAuthenticatedUpstreamRequest } from "../_kernel/upstream-http-request";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type OperatorTokenPair = {
  accessToken: string;
  refreshToken: string;
  identity: { roles: readonly string[] };
};

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
    return await sendAuthenticatedUpstreamRequest({ request, path, baseUrl, accessToken });
  } catch {
    return noStoreJson({ code: "UPSTREAM_UNAVAILABLE" }, 502);
  }
}

async function rotateOperatorSession(
  refreshToken: string,
): Promise<OperatorTokenPair | null> {
  const rotated = await identityServerClient().refresh(refreshToken);
  if (!rotated.identity.roles.includes("operator")) return null;
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

export async function proxyAuthenticatedUpstream(
  request: Request,
  path: readonly string[],
  baseUrl: string,
): Promise<NextResponse> {
  if (MUTATING_METHODS.has(request.method) && !isSameOriginRequest(request)) {
    return noStoreJson({ code: "CROSS_ORIGIN_REJECTED" }, 403);
  }

  const store = await cookies();
  let accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;
  let rotatedCookies: OperatorTokenPair | null = null;

  if (!accessToken) {
    if (!refreshToken) return noStoreJson({ code: "SESSION_NOT_FOUND" }, 401);
    try {
      rotatedCookies = await rotateOperatorSession(refreshToken);
      if (!rotatedCookies) return expiredSessionResponse(403);
      accessToken = rotatedCookies.accessToken;
    } catch {
      return expiredSessionResponse();
    }
  }

  let upstream = await tryForward(request.clone(), path, baseUrl, accessToken);

  if (upstream.status === 401 && refreshToken) {
    try {
      rotatedCookies = await rotateOperatorSession(refreshToken);
      if (!rotatedCookies) return expiredSessionResponse(403);
      upstream = await tryForward(
        request.clone(),
        path,
        baseUrl,
        rotatedCookies.accessToken,
      );
    } catch {
      return expiredSessionResponse();
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
