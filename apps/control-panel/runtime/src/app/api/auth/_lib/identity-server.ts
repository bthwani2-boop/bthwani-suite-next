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
