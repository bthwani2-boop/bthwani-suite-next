import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, clearSessionCookies, isSameOriginRequest } from "../_lib/cookies";
import { identityServerClient } from "../_lib/identity-server";

export const runtime = "nodejs";

function logoutSuccess(): NextResponse {
  const response = NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
  clearSessionCookies(response);
  return response;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ code: "CROSS_ORIGIN_REJECTED" }, { status: 403 });
  }

  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return logoutSuccess();

  try {
    await identityServerClient().logout(accessToken);
    return logoutSuccess();
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status: unknown }).status)
        : 0;

    // A 401 proves this access session is already invalid server-side, so
    // local cookies can be removed without pretending an active session was
    // successfully revoked by this request.
    if (status === 401) return logoutSuccess();

    // Keep HttpOnly credentials so the caller can retry authoritative
    // revocation after Identity recovers. Never report successful logout while
    // server-side revocation is unconfirmed.
    return NextResponse.json(
      { code: "IDENTITY_LOGOUT_REVOCATION_UNCONFIRMED" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
