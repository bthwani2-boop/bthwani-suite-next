import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, clearSessionCookies, isSameOriginRequest, setSessionCookies } from "../_lib/cookies";
import { identityServerClient } from "../_lib/identity-server";

export const runtime = "nodejs";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function newCorrelationId(): string {
  return `cp-activation-${globalThis.crypto.randomUUID()}`;
}

async function issueWithToken(request: Request, accessToken: string, body: { phone: string }) {
  return identityServerClient().issueActivation(
    accessToken,
    { actorType: "field", phone: body.phone, surface: "app-field" },
    {
      idempotencyKey: request.headers.get("idempotency-key") ?? `field-activation-${globalThis.crypto.randomUUID()}`,
      correlationId: request.headers.get("x-correlation-id") ?? newCorrelationId(),
    },
  );
}

function errorStatus(error: unknown, fallback: number): number {
  return typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status: unknown }).status) || fallback
    : fallback;
}

function errorCode(error: unknown, fallback: string): string {
  return typeof error === "object" && error !== null && "code" in error && typeof (error as { code: unknown }).code === "string"
    ? (error as { code: string }).code
    : fallback;
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
    !isNonEmptyString((body as Record<string, unknown>).phone)
  ) {
    return NextResponse.json({ code: "INVALID_ACTIVATION_PAYLOAD" }, { status: 400 });
  }

  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json(
      { code: "SESSION_NOT_FOUND" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await issueWithToken(request, accessToken, { phone: (body as { phone: string }).phone });
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const initialStatus = errorStatus(error, 500);
    if (initialStatus !== 401) {
      return NextResponse.json(
        { code: errorCode(error, "ACTIVATION_ISSUE_FAILED") },
        { status: initialStatus, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!refreshToken) {
      return NextResponse.json(
        { code: "ACTIVATION_ISSUE_FAILED" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    try {
      const rotated = await identityServerClient().refresh(refreshToken);
      const result = await issueWithToken(request, rotated.accessToken, { phone: (body as { phone: string }).phone });
      const response = NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
      setSessionCookies(response, rotated);
      return response;
    } catch (refreshError) {
      const status = errorStatus(refreshError, 401);
      const response = NextResponse.json(
        { code: errorCode(refreshError, "ACTIVATION_ISSUE_FAILED") },
        { status, headers: { "Cache-Control": "no-store" } },
      );
      if (status === 401) {
        clearSessionCookies(response);
      }
      return response;
    }
  }
}
