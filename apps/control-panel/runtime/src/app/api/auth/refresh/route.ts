import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { REFRESH_TOKEN_COOKIE, clearSessionCookies, isSameOriginRequest, setSessionCookies } from "../_lib/cookies";
import { identityServerClient } from "../_lib/identity-server";

export const runtime = "nodejs";

/**
 * Explicit refresh endpoint, distinct from GET /api/auth/session which also
 * refreshes opportunistically. Used by the client-side single-flight retry
 * path after a 401 from /api/dsh/*.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ code: "CROSS_ORIGIN_REJECTED" }, { status: 403 });
  }

  const store = await cookies();
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { code: "SESSION_EXPIRED" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const rotated = await identityServerClient().refresh(refreshToken);
    const response = NextResponse.json(
      { identity: rotated.identity },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
    setSessionCookies(response, rotated);
    return response;
  } catch {
    const response = NextResponse.json(
      { code: "SESSION_EXPIRED" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
    clearSessionCookies(response);
    return response;
  }
}
