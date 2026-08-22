export {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearSessionCookies,
  setSessionCookies,
} from "../../../../server/session-cookies";

export { isSameOriginRequest } from "../../../../server/bff-proxy";

/**
 * Same-origin check for state-changing authentication requests. Canonical
 * session cookies use SameSite=Strict; this explicit origin comparison also
 * rejects cross-origin fetches before credentials reach Identity.
 */
