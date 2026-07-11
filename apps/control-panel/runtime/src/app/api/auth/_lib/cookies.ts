import type { NextResponse } from "next/server";

export const ACCESS_TOKEN_COOKIE = "dsh_cp_at";
export const REFRESH_TOKEN_COOKIE = "dsh_cp_rt";

const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * HttpOnly session cookies. The access/refresh tokens are never readable by
 * browser JavaScript; only this server-side BFF layer reads them.
 */
export function setSessionCookies(
  response: NextResponse,
  session: { readonly accessToken: string; readonly refreshToken: string },
): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, session.accessToken, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, session.refreshToken, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Same-origin check for state-changing BFF requests. SameSite=Lax cookies
 * already block cross-site form/simple-GET submission of the session
 * cookie; this adds an explicit rejection for cross-origin fetches that
 * would otherwise still carry the cookie under some browser Lax exemptions.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    return (
      requestUrl.protocol === originUrl.protocol &&
      requestUrl.host === originUrl.host
    );
  } catch {
    return false;
  }
}
