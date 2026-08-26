import { NextResponse, type NextRequest } from "next/server";
import {
  buildControlPanelSecurityHeaders,
  generateCspNonce,
  isStaticAssetPath,
} from "../csp-policy.mjs";

/**
 * Single canonical security-header writer for the Control Panel runtime.
 *
 * Authority: `csp-policy.mjs` is the ONLY source of CSP truth; this
 * middleware is the ONLY emitter. `next.config.mjs` no longer owns security
 * headers. For per-request nonce propagation into Next SSR, we forward the
 * same `Content-Security-Policy` value on the request headers so Next's
 * app-render picks up the nonce and applies it to every framework-injected
 * script (bootstrap, polyfill, inlined flight data, and HMR for dev).
 */
export function middleware(request: NextRequest): NextResponse {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const nonce = generateCspNonce();
  const securityHeaders = buildControlPanelSecurityHeaders({ nonce, isDevelopment });
  const cspHeader = securityHeaders.find((entry) => entry.key === "Content-Security-Policy");
  if (!cspHeader) {
    throw new Error("control-panel CSP authority emitted no Content-Security-Policy header");
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("content-security-policy", cspHeader.value);
  requestHeaders.set("x-bthwani-csp-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const header of securityHeaders) {
    response.headers.set(header.key, header.value);
  }

  // Echo the nonce on the response too so server-rendered code paths (and
  // the layout's `headers()` call) can confirm what the browser was issued.
  response.headers.set("x-bthwani-csp-nonce", nonce);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the immutable assets we deliberately
     * skip. Next's standard matcher for application routes.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
