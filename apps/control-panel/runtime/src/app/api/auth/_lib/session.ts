import type { ActorIdentity, TokenResponse } from "@bthwani/core-identity/server";
import { identityServerClient } from "./identity-server";

export type ResolvedSession = {
  readonly identity: ActorIdentity;
  /** Present only when the access token was rotated via refresh. */
  readonly rotated: TokenResponse | null;
};

// Best-effort single-flight de-duplication of concurrent refreshes for the
// same refresh token. This only dedupes within a single Node process; it is
// not a cross-instance lock. Acceptable for the control-panel's traffic
// shape, called out as a follow-up if multi-instance deployment is added.
const inFlightRefresh = new Map<string, Promise<TokenResponse>>();

function refreshOnce(refreshToken: string): Promise<TokenResponse> {
  const existing = inFlightRefresh.get(refreshToken);
  if (existing) return existing;

  const promise = identityServerClient()
    .refresh(refreshToken)
    .finally(() => {
      inFlightRefresh.delete(refreshToken);
    });
  inFlightRefresh.set(refreshToken, promise);
  return promise;
}

/**
 * Resolves the caller's identity from cookie-held tokens: verifies the
 * access token first, and falls back to a single, deduplicated refresh
 * attempt if it has expired. Throws if neither token yields a valid
 * session, so callers can clear cookies and return 401.
 */
export async function resolveSession(
  accessToken: string | undefined,
  refreshToken: string | undefined,
): Promise<ResolvedSession> {
  if (accessToken) {
    try {
      const identity = await identityServerClient().session(accessToken);
      return { identity, rotated: null };
    } catch {
      // fall through to refresh
    }
  }

  if (!refreshToken) {
    throw new Error("IDENTITY_SESSION_INVALID");
  }

  const rotated = await refreshOnce(refreshToken);
  return { identity: rotated.identity, rotated };
}
