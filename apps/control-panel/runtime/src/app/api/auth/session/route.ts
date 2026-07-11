import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, clearSessionCookies, setSessionCookies } from "../_lib/cookies";
import { resolveSession } from "../_lib/session";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json(
      { code: "SESSION_NOT_FOUND" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const resolved = await resolveSession(accessToken, refreshToken);
    if (!resolved.identity.roles.includes("operator")) {
      const response = NextResponse.json(
        { code: "CONTROL_PANEL_FORBIDDEN" },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
      clearSessionCookies(response);
      return response;
    }
    const response = NextResponse.json(
      { identity: resolved.identity },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
    if (resolved.rotated) {
      setSessionCookies(response, resolved.rotated);
    }
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
