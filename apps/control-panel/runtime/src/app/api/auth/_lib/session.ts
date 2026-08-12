import type { ActorIdentity, TokenResponse } from "@bthwani/core-identity/server";
import { identityServerClient } from "./identity-server";

export type ResolvedSession = {
  readonly identity: ActorIdentity;
  /** Present only when the access token was rotated via refresh. */
  readonly rotated: TokenResponse | null;
};

/**
 * Resolves the caller's identity from cookie-held tokens: verifies the access
 * token first, then asks Identity's distributed refresh boundary to rotate the
 * refresh token if necessary. Cross-instance serialization belongs to Identity
 * and PostgreSQL, not to process-local Next.js memory.
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
      // The authoritative refresh path decides whether continuity is possible.
    }
  }

  if (!refreshToken) {
    throw new Error("IDENTITY_SESSION_INVALID");
  }

  const rotated = await identityServerClient().refresh(refreshToken);
  return { identity: rotated.identity, rotated };
}
