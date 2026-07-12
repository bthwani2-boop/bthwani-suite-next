import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, clearSessionCookies, isSameOriginRequest } from "../_lib/cookies";
import { identityServerClient } from "../_lib/identity-server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ code: "CROSS_ORIGIN_REJECTED" }, { status: 403 });
  }

  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;

  if (accessToken) {
    await identityServerClient()
      .logout(accessToken)
      .catch(() => undefined);
  }

  const response = NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
  clearSessionCookies(response);
  return response;
}
