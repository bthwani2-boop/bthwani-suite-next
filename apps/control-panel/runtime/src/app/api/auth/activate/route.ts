import type { ActorIdentity } from "@bthwani/core-identity";
import { NextResponse } from "next/server";
import { isSameOriginRequest, setSessionCookies } from "../_lib/cookies";
import { resolveIdentityServerBaseUrl } from "../_lib/env";

export const runtime = "nodejs";

type IdentityTokenResponse = {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly identity: ActorIdentity;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAccessCode(value: unknown): value is string {
  return typeof value === "string" && /^\d{6}$/.test(value.trim());
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ code: "CROSS_ORIGIN_REJECTED" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "INVALID_BODY" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !isNonEmptyString((body as Record<string, unknown>).phone) ||
    !isAccessCode((body as Record<string, unknown>).code)
  ) {
    return NextResponse.json({ code: "INVALID_ACCESS_CODE_PAYLOAD" }, { status: 400 });
  }

  const { phone, code } = body as { phone: string; code: string };
  const baseUrl = resolveIdentityServerBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      { code: "IDENTITY_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let identityResponse: Response;
  try {
    identityResponse = await fetch(new URL("/auth/activate", baseUrl), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        actorType: "employee",
        phone: phone.trim(),
        code: code.trim(),
        deviceFingerprint: "control-panel-access-code",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return NextResponse.json(
      { code: "IDENTITY_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!identityResponse.ok) {
    const errorBody = (await identityResponse.json().catch(() => ({}))) as { code?: string };
    return NextResponse.json(
      { code: errorBody.code ?? "ACCESS_CODE_FAILED" },
      {
        status: identityResponse.status >= 400 ? identityResponse.status : 401,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const tokens = (await identityResponse.json()) as IdentityTokenResponse;
  if (!tokens.identity.roles.includes("operator")) {
    return NextResponse.json(
      { code: "CONTROL_PANEL_FORBIDDEN" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const response = NextResponse.json(
    { identity: tokens.identity },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
  setSessionCookies(response, tokens);
  return response;
}
