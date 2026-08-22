import { createDshHttpClient } from "../_kernel/dsh-http-request";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type {
  ClientProfile,
  ClientProfilePreferencesInput,
  ClientProfileConsentsInput,
} from "./client-profile.types";

// For client-facing operations, use standard client session.
const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "dsh-client-profile");

export async function fetchClientProfile(): Promise<ClientProfile> {
  const resp = await request<{ profile: ClientProfile }>("/dsh/client/me/profile");
  return resp.profile;
}

export async function upsertClientProfilePreferences(
  input: ClientProfilePreferencesInput,
  idempotencyKey?: string,
): Promise<ClientProfile> {
  const resp = await request<{ profile: ClientProfile }>("/dsh/client/me/profile/preferences", {
    method: "PATCH",
    body: input,
    ...(idempotencyKey !== undefined ? { idempotencyKey } : {}),
    ...(input.expectedVersion !== undefined ? { expectedVersion: input.expectedVersion } : {}),
  });
  return resp.profile;
}

export async function upsertClientProfileConsents(
  input: ClientProfileConsentsInput,
  idempotencyKey?: string,
): Promise<ClientProfile> {
  const resp = await request<{ profile: ClientProfile }>("/dsh/client/me/profile/consents", {
    method: "PATCH",
    body: input,
    ...(idempotencyKey !== undefined ? { idempotencyKey } : {}),
    ...(input.expectedVersion !== undefined ? { expectedVersion: input.expectedVersion } : {}),
  });
  return resp.profile;
}
