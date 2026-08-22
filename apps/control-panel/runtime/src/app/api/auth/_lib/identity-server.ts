import {
  createIdentityClient,
  type IdentityClient,
  type IdentityClientError,
} from "@bthwani/core-identity/server";
import { resolveIdentityServerBaseUrl } from "./env";

let client: IdentityClient | null = null;

/** Server-only Identity client. Never imported by browser code. */
export function identityServerClient(): IdentityClient {
  if (client === null) {
    client = createIdentityClient(resolveIdentityServerBaseUrl());
  }
  return client;
}

/**
 * Another request may have won the same refresh rotation on another BFF or
 * Identity instance. This is not proof that the session is invalid and must
 * never trigger cookie deletion.
 */
export function isConcurrentRefreshError(error: unknown): boolean {
  const typed = error as Partial<IdentityClientError>;
  return typed.kind === "http"
    && typed.status === 409
    && typed.code === "REFRESH_ALREADY_ROTATED";
}

/** Infrastructure failure is not authentication failure. */
export function isIdentityServerAvailabilityError(error: unknown): boolean {
  const typed = error as Partial<IdentityClientError>;
  if (typed.kind === "network") return true;
  if (typed.kind !== "http") return false;
  return typed.status === 502
    || typed.status === 503
    || typed.status === 504
    || typed.code === "IDENTITY_NOT_READY"
    || typed.code === "IDENTITY_UNAVAILABLE"
    || typed.code === "BFF_UPSTREAM_UNAVAILABLE"
    || typed.code === "BFF_UPSTREAM_NOT_CONFIGURED";
}

export function isIdentityServerInvalidSessionError(error: unknown): boolean {
  const typed = error as Partial<IdentityClientError>;
  return typed.kind === "http"
    && (typed.status === 401
      || typed.code === "UNAUTHENTICATED"
      || typed.code === "INVALID_REFRESH_TOKEN"
      || typed.code === "SESSION_NOT_FOUND");
}
