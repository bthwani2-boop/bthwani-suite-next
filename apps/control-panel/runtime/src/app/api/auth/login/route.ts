import { NextResponse } from "next/server";
import { isSameOriginRequest, setSessionCookies } from "../_lib/cookies";
import { identityServerClient } from "../_lib/identity-server";

export const runtime = "nodejs";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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
    !isNonEmptyString((body as Record<string, unknown>).username) ||
    !isNonEmptyString((body as Record<string, unknown>).password)
  ) {
    return NextResponse.json({ code: "INVALID_CREDENTIALS_PAYLOAD" }, { status: 400 });
  }

  const { username, password } = body as { username: string; password: string };

  try {
    const tokens = await identityServerClient().login({
      username,
      password,
      deviceFingerprint: "control-panel-bff",
    });

    const response = NextResponse.json(
      { identity: tokens.identity },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
    setSessionCookies(response, tokens);
    return response;
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status: unknown }).status) || 401
        : 401;
    return NextResponse.json(
      { code: "LOGIN_FAILED" },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
