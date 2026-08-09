import { NextResponse } from "next/server";
import type { TokenResponse } from "@bthwani/core-identity";
import { BFF_OPAQUE_TOKEN } from "../../../../server/bff-proxy";
import { isSameOriginRequest, setSessionCookies } from "../_lib/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEV_SESSION_BROKER_URL = "http://127.0.0.1:58100/session";
const CONTROL_PANEL_DEV_FINGERPRINT = "control-panel-bff-dev";

function unavailable(status: number, code: string): NextResponse {
  return NextResponse.json(
    { code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function isValidOperatorSession(value: unknown): value is TokenResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<TokenResponse>;
  const identity = candidate.identity;
  return Boolean(
    typeof candidate.accessToken === "string"
      && candidate.accessToken.length > 0
      && typeof candidate.refreshToken === "string"
      && candidate.refreshToken.length > 0
      && identity
      && Array.isArray(identity.roles)
      && identity.roles.includes("operator")
      && identity.surfaceAccess?.["control-panel"] === true
      && identity.sessionSurface === "control-panel",
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return unavailable(404, "NOT_FOUND");
  }
  if (!isSameOriginRequest(request)) {
    return unavailable(403, "CROSS_ORIGIN_REJECTED");
  }

  let upstream: Response;
  try {
    upstream = await fetch(DEV_SESSION_BROKER_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "operator",
        surface: "control-panel",
        deviceFingerprint: CONTROL_PANEL_DEV_FINGERPRINT,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return unavailable(503, "DEV_SESSION_BROKER_UNAVAILABLE");
  }

  const body: unknown = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    const code =
      typeof body === "object"
        && body !== null
        && "code" in body
        && typeof (body as { code?: unknown }).code === "string"
        ? (body as { code: string }).code
        : "DEV_SESSION_FAILED";
    return unavailable(upstream.status, code);
  }
  if (!isValidOperatorSession(body)) {
    return unavailable(502, "DEV_SESSION_BINDING_INVALID");
  }

  const response = NextResponse.json(
    {
      accessToken: BFF_OPAQUE_TOKEN,
      refreshToken: BFF_OPAQUE_TOKEN,
      identity: body.identity,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
  setSessionCookies(response, body);
  return response;
}
