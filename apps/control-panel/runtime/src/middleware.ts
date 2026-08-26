import { NextResponse, type NextRequest } from "next/server";
import {
  buildControlPanelSecurityHeaders,
  generateCspNonce,
} from "./server/csp-policy";

/**
 * Single canonical security-header writer for the Control Panel runtime.
 *
 * Authority: `./server/csp-policy.ts` is the ONLY source of CSP truth; this
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

  response.headers.set("x-bthwani-csp-nonce", nonce);
  return response;
}

// The Next.js 16 Turbopack static config analyzer requires the `matcher`
// entry to be a plain string literal — it cannot resolve cross-module
// references. The literal below is the inverse-lookahead of the static-asset
// patterns exported from `./server/csp-policy`; the two are kept coupled by
// `runtime-security.test.mjs`, which asserts equality between the literal
// here and the canonical constant.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
