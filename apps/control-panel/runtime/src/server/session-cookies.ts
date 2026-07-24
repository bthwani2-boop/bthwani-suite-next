import type { NextResponse } from "next/server";

export const ACCESS_TOKEN_COOKIE = "dsh_cp_at";
export const REFRESH_TOKEN_COOKIE = "dsh_cp_rt";

const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

/**
 * Canonical control-panel session cookie owner. All authentication routes and
 * the generic service BFF must use these helpers so a successful login creates
 * exactly one server-readable session and browser JavaScript never sees the
 * real Identity tokens.
 */
export function setSessionCookies(
  response: NextResponse,
  session: { readonly accessToken: string; readonly refreshToken: string },
): void {
  response.cookies.set(
    ACCESS_TOKEN_COOKIE,
    session.accessToken,
    cookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS),
  );
  response.cookies.set(
    REFRESH_TOKEN_COOKIE,
    session.refreshToken,
    cookieOptions(REFRESH_TOKEN_MAX_AGE_SECONDS),
  );
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", cookieOptions(0));
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", cookieOptions(0));
}
