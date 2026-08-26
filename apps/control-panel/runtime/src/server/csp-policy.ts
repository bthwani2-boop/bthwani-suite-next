/**
 * Single canonical Content-Security-Policy + security-headers authority for the
 * Control Panel web runtime.
 *
 * This module is the ONLY writer of the production CSP. The Next.js
 * `src/middleware.ts` is the only header emitter; `next.config.mjs` no longer
 * owns security headers. Tests import this module directly (Node 24 strips
 * types from `.ts` dynamic imports) to assert the contract against the real
 * policy output (not against source-text regexes).
 *
 * Production design (per objective CU-E-CONTROL-PANEL-CSP-EXECUTION-BOUNDARY):
 *   - script-src drops 'unsafe-eval' and 'unsafe-inline'.
 *   - Per-request nonce travels via the request's own
 *     `content-security-policy` header (which Next.js SSR inspects to propagate
 *     the nonce to bootstrap, polyfill and flight-data scripts).
 *   - Explicit Google Maps hosts remain (pre-existing governed surface; no new
 *     exemption is added).
 *   - No 'strict-dynamic' (keeps the explicit host list authoritative for
 *     Google Maps subresource loading instead of turning it into dead letters
 *     via trust inheritance).
 *   - style-src is nonce-bound for parser-injected <style> elements.
 *   - style-src-attr 'unsafe-inline' is the sole documented technical
 *     remainder: react-native-web / WebView render style objects as inline
 *     `style` attributes on every element, and the control-panel surface
 *     transitively depends on them.
 *   - Tamagui runtime rule insertion uses CSSOM `insertRule` against an empty
 *     <style id="_tamagui-styles"> element, which is governed by spec to be
 *     allowed regardless of style-src (CSP does not regulate CSSOM writes);
 *     tamagui's TamaguiProvider also exposes a nonce via `setNonce()` and
 *     `disableInjectCSS`, which we use to keep its single parser-inserted
 *     <style precedence href="tamagui-css">{config.getCSS()}</style> out of
 *     the request entirely (we re-emit that same content ourselves with the
 *     per-request nonce from inside WebThemeStyle).
 *
 * Development design:
 *   - 'unsafe-eval' and 'unsafe-inline' are appended to script-src and
 *     style-src only when NODE_ENV !== "production" so Next.js dev tools
 *     (react-refresh, error overlay, HMR style injection) keep working.
 *   - WebSocket / localhost connect sources are added in dev only.
 *
 * Edge runtime: this file is also imported from `src/middleware.ts`, which
 * Next.js compiles to the Edge runtime. It therefore must not depend on
 * Node-only APIs (`fs`, `node:crypto`, `Buffer`, …). It uses only the Web
 * Crypto API (`globalThis.crypto.getRandomValues`) and `btoa`, both of which
 * are available in the Edge runtime, Node.js 16+ and the browser.
 */

export const PRODUCTION_SCRIPT_HOSTS: ReadonlyArray<string> = Object.freeze([
  "https://*.googleapis.com",
  "https://*.gstatic.com",
  "https://*.google.com",
  "https://*.ggpht.com",
  "https://*.googleusercontent.com",
]);

export const PRODUCTION_CONNECT_HOSTS: ReadonlyArray<string> = Object.freeze([
  "https://*.googleapis.com",
  "https://*.google.com",
  "https://*.gstatic.com",
]);

export const PRODUCTION_DEV_CONNECT_HOSTS: ReadonlyArray<string> = Object.freeze([
  "http://localhost:*",
  "http://127.0.0.1:*",
  "ws:",
  "wss:",
]);

export interface BuildControlPanelCspOptions {
  nonce: string;
  isDevelopment?: boolean;
}

export interface SecurityHeader {
  readonly key: string;
  readonly value: string;
}

export interface BuildControlPanelSecurityHeadersOptions {
  nonce: string;
  isDevelopment?: boolean;
}

const CSP_NONCE_CHARSET = /^[A-Za-z0-9+/_-]+={0,2}$/;

function assertValidNonce(nonce: string): void {
  if (typeof nonce !== "string" || nonce.length === 0) {
    throw new Error("buildControlPanelContentSecurityPolicy requires a non-empty nonce");
  }
  if (!CSP_NONCE_CHARSET.test(nonce)) {
    throw new Error(
      "buildControlPanelContentSecurityPolicy: nonce must match the charset accepted by Next.js "
        + "([A-Za-z0-9+/_-]+={0,2})",
    );
  }
}

export function buildControlPanelContentSecurityPolicy(
  options: BuildControlPanelCspOptions,
): string {
  const { nonce, isDevelopment = false } = options;
  assertValidNonce(nonce);

  const scriptSources: string[] = ["'self'", `'nonce-${nonce}'`, ...PRODUCTION_SCRIPT_HOSTS];
  if (isDevelopment) {
    scriptSources.push("'unsafe-eval'", "'unsafe-inline'");
  }

  const styleSources: string[] = ["'self'", `'nonce-${nonce}'`];
  if (isDevelopment) {
    styleSources.push("'unsafe-inline'");
  }

  const styleAttrSources: string[] = ["'unsafe-inline'"];

  const connectSources: string[] = ["'self'", ...PRODUCTION_CONNECT_HOSTS];
  if (isDevelopment) {
    connectSources.push(...PRODUCTION_DEV_CONNECT_HOSTS);
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    `style-src ${styleSources.join(" ")}`,
    `style-src-attr ${styleAttrSources.join(" ")}`,
    "img-src 'self' data: blob: http: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "media-src 'self' data: blob: http: https:",
    `connect-src ${connectSources.join(" ")}`,
    "frame-src https://*.google.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function buildControlPanelSecurityHeaders(
  options: BuildControlPanelSecurityHeadersOptions,
): ReadonlyArray<SecurityHeader> {
  const { nonce, isDevelopment = false } = options;
  return Object.freeze([
    {
      key: "Content-Security-Policy",
      value: buildControlPanelContentSecurityPolicy({ nonce, isDevelopment }),
    },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()",
    },
  ]) as ReadonlyArray<SecurityHeader>;
}

/**
 * Source patterns for paths the middleware should NOT apply the full governed
 * security-header set to. Immutable-hashed Next assets do not need CSP,
 * nosniff or X-Frame-Options, and re-applying the policy on every static
 * fetch wastes cycles.
 *
 * Exported so the Next.js `matcher` config (and any test that needs to assert
 * the matcher surface) is derived from the single canonical source.
 */
export const STATIC_ASSET_PATH_PATTERNS: ReadonlyArray<RegExp> = Object.freeze([
  /^\/_next\/static\//,
  /^\/_next\/image\//,
  /^\/favicon\.ico$/,
]);

/**
 * The Next.js `matcher` string literal that mirrors `STATIC_ASSET_PATH_PATTERNS`.
 * Kept as a single literal (not a function call) because Next.js 16's static
 * config analyzer requires `config.matcher` entries to be statically
 * parseable strings or objects; it cannot evaluate function calls. The literal
 * here is the same negative-lookahead pattern that
 * `STATIC_ASSET_PATH_PATTERNS` would generate, so the two remain coupled by
 * convention inside this single canonical file.
 */
export const STATIC_ASSET_PATH_MATCHER: string = "/((?!_next/static|_next/image|favicon.ico).*)";

/**
 * Determine whether the middleware should skip a given pathname. Static asset
 * paths return `true`; everything else (HTML documents, API routes, dynamic
 * chunks) returns `false` and receives the full governed header set.
 */
export function isStaticAssetPath(pathname: string): boolean {
  if (typeof pathname !== "string" || pathname.length === 0) {
    return false;
  }
  return STATIC_ASSET_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * Generate a CSP nonce suitable for the Next.js SSR extractor. Uses the Web
 * Crypto API which is available in the Edge runtime, Node.js, and the
 * browser. Output is standard base64 (charset `[A-Za-z0-9+/_-]+={0,2}`).
 */
export function generateCspNonce(byteLength: number = 16): string {
  const globalCrypto = globalThis.crypto;
  if (!globalCrypto || typeof globalCrypto.getRandomValues !== "function") {
    throw new Error("generateCspNonce requires a runtime with Web Crypto getRandomValues");
  }
  const bytes = new Uint8Array(byteLength);
  globalCrypto.getRandomValues(bytes);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index] ?? 0;
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
