import { createIdentityClient, type IdentityClient } from "@bthwani/core-identity/server";
import { resolveIdentityServerBaseUrl } from "./env";

let client: IdentityClient | null = null;

/** Server-only Identity client. Never imported by browser code. */
export function identityServerClient(): IdentityClient {
  if (client === null) {
    client = createIdentityClient(resolveIdentityServerBaseUrl());
  }
  return client;
}
