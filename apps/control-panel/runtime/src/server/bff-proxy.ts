import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearSessionCookies,
  setSessionCookies,
} from "./session-cookies";

export const BFF_ACCESS_COOKIE = ACCESS_TOKEN_COOKIE;
export const BFF_REFRESH_COOKIE = REFRESH_TOKEN_COOKIE;
export const BFF_OPAQUE_TOKEN = "BFF_HTTP_ONLY_COOKIE_SESSION";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "content-type",
  "idempotency-key",
  "if-match",
  "if-match-version",
  "x-correlation-id",
] as const;

const SERVICE_CONFIG = {
  dsh: {
    env: ["DSH_API_BASE_URL", "NEXT_PUBLIC_DSH_API_BASE_URL"],
    fallback: "http://127.0.0.1:58080",
  },
  identity: {
    env: ["IDENTITY_API_BASE_URL", "NEXT_PUBLIC_IDENTITY_API_BASE_URL"],
    fallback: "http://127.0.0.1:58082",
  },
  wlt: {
    env: ["WLT_API_BASE_URL", "NEXT_PUBLIC_WLT_API_BASE_URL"],
    fallback: "http://127.0.0.1:58083",
  },
  workforce: {
    env: ["WORKFORCE_API_BASE_URL", "NEXT_PUBLIC_WORKFORCE_API_BASE_URL"],
    fallback: "http://127.0.0.1:58086",
  },
  providers: {
    env: ["PROVIDERS_API_BASE_URL", "NEXT_PUBLIC_PROVIDERS_API_BASE_URL"],
    fallback: "http://127.0.0.1:58087",
  },
  "platform-control": {
    env: [
      "PLATFORM_CONTROL_API_BASE_URL",
      "NEXT_PUBLIC_PLATFORM_CONTROL_API_BASE_URL",
    ],
    fallback: "http://127.0.0.1:58088",
  },
} as const;

export type ControlPanelBffService = keyof typeof SERVICE_CONFIG;

function serviceBaseUrl(service: ControlPanelBffService): string {
  const config = SERVICE_CONFIG[service];
  for (const key of config.env) {
    const value = process.env[key];
    if (value?.trim()) return value.trim().replace(/\/$/, "");
  }
  return config.fallback;
}

function requestIsSameSite(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return false;
  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || ["same-origin", "same-site", "none"].includes(fetchSite);
}

function jsonError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json(
    { code, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function buildUpstreamHeaders(
  request: NextRequest,
  accessToken: string | undefined,
): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("accept")) headers.set("accept", "application/json");
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  return headers;
}

function copyResponseHeaders(upstream: Response): Headers {
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const name of ["content-type", "etag", "last-modified", "x-correlation-id"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

function isTokenResponse(value: unknown): value is {
  accessToken: string;
  refreshToken: string;
  identity?: unknown;
} {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { accessToken?: unknown; refreshToken?: unknown };
  return (
    typeof candidate.accessToken === "string" &&
    candidate.accessToken.length > 0 &&
    typeof candidate.refreshToken === "string" &&
    candidate.refreshToken.length > 0
  );
}

function tokenResponseHasOperatorIdentity(value: {
  identity?: unknown;
}): boolean {
  if (!value.identity || typeof value.identity !== "object") return false;
  const roles = (value.identity as { roles?: unknown }).roles;
  return Array.isArray(roles) && roles.includes("operator");
}

async function requestBody(
  request: NextRequest,
  service: ControlPanelBffService,
  upstreamPath: string,
  refreshToken: string | undefined,
): Promise<BodyInit | undefined> {
  if (SAFE_METHODS.has(request.method)) return undefined;

  if (service === "identity" && upstreamPath === "/auth/refresh") {
    if (!refreshToken) return undefined;
    return JSON.stringify({ refreshToken });
  }

  const body = await request.arrayBuffer();
  return body.byteLength > 0 ? body : undefined;
}

export async function proxyControlPanelRequest(
  request: NextRequest,
  service: ControlPanelBffService,
  pathSegments: readonly string[],
): Promise<NextResponse> {
  if (!SAFE_METHODS.has(request.method) && !requestIsSameSite(request)) {
    return jsonError(403, "BFF_CROSS_SITE_FORBIDDEN", "Cross-site mutation is forbidden.");
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(BFF_ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(BFF_REFRESH_COOKIE)?.value;
  const upstreamPath = `/${pathSegments.map(encodeURIComponent).join("/")}`;

  if (
    service === "identity" &&
    upstreamPath === "/auth/refresh" &&
    !refreshToken
  ) {
    return jsonError(401, "IDENTITY_REFRESH_COOKIE_MISSING", "Refresh session is unavailable.");
  }

  const upstreamUrl = new URL(
    `${upstreamPath}${request.nextUrl.search}`,
    `${serviceBaseUrl(service)}/`,
  );
  const body = await requestBody(
    request,
    service,
    upstreamPath,
    refreshToken,
  );
  const headers = buildUpstreamHeaders(request, accessToken);
  if (body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    return jsonError(
      502,
      "BFF_UPSTREAM_UNAVAILABLE",
      error instanceof Error ? error.message : "Upstream request failed.",
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  const shouldInspectIdentityResponse =
    service === "identity" && contentType.includes("application/json");

  if (shouldInspectIdentityResponse) {
    const text = await upstream.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (upstream.ok && isTokenResponse(parsed)) {
      if (!tokenResponseHasOperatorIdentity(parsed)) {
        const response = jsonError(
          403,
          "CONTROL_PANEL_FORBIDDEN",
          "Identity is not authorized for the control panel.",
        );
        clearSessionCookies(response);
        return response;
      }

      const publicBody = {
        ...parsed,
        accessToken: BFF_OPAQUE_TOKEN,
        refreshToken: BFF_OPAQUE_TOKEN,
      };
      const response = NextResponse.json(publicBody, {
        status: upstream.status,
        headers: copyResponseHeaders(upstream),
      });
      setSessionCookies(response, parsed);
      return response;
    }

    const response = new NextResponse(text || null, {
      status: upstream.status,
      headers: copyResponseHeaders(upstream),
    });
    if (upstreamPath === "/auth/logout") clearSessionCookies(response);
    return response;
  }

  const response = new NextResponse(
    upstream.status === 204 ? null : await upstream.arrayBuffer(),
    {
      status: upstream.status,
      headers: copyResponseHeaders(upstream),
    },
  );
  if (service === "identity" && upstreamPath === "/auth/logout") {
    clearSessionCookies(response);
  }
  return response;
}
