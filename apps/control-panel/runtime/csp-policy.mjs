/**
 * Single canonical Content-Security-Policy + security-headers authority for the
 * Control Panel web runtime.
 *
 * This module is the ONLY writer of the production CSP. The Next.js
 * `middleware.ts` is the only header emitter; the `next.config.mjs` no longer
 * owns security headers. Tests import this module directly to assert the
 * contract against the real policy output (not against source-text regexes).
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
 */

const PRODUCTION_SCRIPT_HOSTS = Object.freeze([
  "https://*.googleapis.com",
  "https://*.gstatic.com",
  "https://*.google.com",
  "https://*.ggpht.com",
  "https://*.googleusercontent.com",
]);

const PRODUCTION_CONNECT_HOSTS = Object.freeze([
  "https://*.googleapis.com",
  "https://*.google.com",
  "https://*.gstatic.com",
]);

const PRODUCTION_DEV_CONNECT_HOSTS = Object.freeze([
  "http://localhost:*",
  "http://127.0.0.1:*",
  "ws:",
  "wss:",
]);

/**
 * Build the production Content-Security-Policy header value with a fresh
 * per-request nonce. `nonce` MUST be a non-empty base64 string drawn from the
 * charset accepted by Next.js' CSP nonce extractor (`[A-Za-z0-9+/_-]+={0,2}`).
 *
 * @param {object} options
 * @param {string} options.nonce
 * @param {boolean} [options.isDevelopment]
 * @returns {string}
 */
export function buildControlPanelContentSecurityPolicy({ nonce, isDevelopment = false }) {
  if (typeof nonce !== "string" || nonce.length === 0) {
    throw new Error("buildControlPanelContentSecurityPolicy requires a non-empty nonce");
  }

  const scriptSources = ["'self'", `'nonce-${nonce}'`, ...PRODUCTION_SCRIPT_HOSTS];
  if (isDevelopment) {
    scriptSources.push("'unsafe-eval'", "'unsafe-inline'");
  }

  const styleSources = ["'self'", `'nonce-${nonce}'`];
  if (isDevelopment) {
    styleSources.push("'unsafe-inline'");
  }

  const styleAttrSources = ["'unsafe-inline'"];

  const connectSources = ["'self'", ...PRODUCTION_CONNECT_HOSTS];
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

/**
 * Build the full governed security-header set for one response. Returns a
 * frozen array of `{ key, value }` pairs in the order Next.js' `headers()`
 * and middleware apply them. The CSP header is at the front because the
 * browser parses it independently of ordering.
 *
 * @param {object} options
 * @param {string} options.nonce
 * @param {boolean} [options.isDevelopment]
 * @returns {ReadonlyArray<{ key: string, value: string }>}
 */
export function buildControlPanelSecurityHeaders({ nonce, isDevelopment = false }) {
  return Object.freeze([
    { key: "Content-Security-Policy", value: buildControlPanelContentSecurityPolicy({ nonce, isDevelopment }) },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()",
    },
  ]);
}

/**
 * Path matchers that the middleware should NOT apply the full governed
 * security-header set to. Immutable-hashed Next assets do not need CSP,
 * nosniff or X-Frame-Options, and re-applying the policy on every static
 * fetch wastes cycles.
 */
export const STATIC_ASSET_PATH_PATTERNS = Object.freeze([
  /^\/_next\/static\//,
  /^\/_next\/image\//,
  /^\/favicon\.ico$/,
]);

/**
 * Determine whether the middleware should skip a given pathname. Static asset
 * paths return `true`; everything else (HTML documents, API routes, dynamic
 * chunks) returns `false` and receives the full governed header set.
 *
 * @param {string} pathname
 * @returns {boolean}
 */
export function isStaticAssetPath(pathname) {
  if (typeof pathname !== "string" || pathname.length === 0) {
    return false;
  }
  return STATIC_ASSET_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * Generate a CSP nonce suitable for the Next.js SSR extractor. Uses the Web
 * Crypto API which is available in the Edge runtime, Node.js, and the
 * browser. Output is standard base64 (charset `[A-Za-z0-9+/_-]+={0,2}`).
 *
 * @param {number} [byteLength=16]
 * @returns {string}
 */
export function generateCspNonce(byteLength = 16) {
  const globalCrypto = globalThis.crypto;
  if (!globalCrypto || typeof globalCrypto.getRandomValues !== "function") {
    throw new Error("generateCspNonce requires a runtime with Web Crypto getRandomValues");
  }
  const bytes = new Uint8Array(byteLength);
  globalCrypto.getRandomValues(bytes);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  // btoa exists in the Edge runtime and Node.js 16+.
  return btoa(binary);
}
