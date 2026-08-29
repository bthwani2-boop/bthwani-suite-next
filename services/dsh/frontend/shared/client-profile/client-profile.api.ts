import { createDshHttpClient } from "../_kernel/dsh-http-request";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type {
  ClientProfile,
  ClientProfilePreferencesInput,
  ClientProfileConsentsInput,
} from "./client-profile.types";
import type { ClientProfileMutationContext } from "./client-profile-mutation-attempt";

// For client-facing operations, use standard client session.
const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "dsh-client-profile");

export async function fetchClientProfile(): Promise<ClientProfile> {
  const resp = await request<{ profile: ClientProfile }>("/dsh/client/me/profile");
  return resp.profile;
}

export async function upsertClientProfilePreferences(
  input: ClientProfilePreferencesInput,
  mutation: ClientProfileMutationContext,
): Promise<ClientProfile> {
  const resp = await request<{ profile: ClientProfile }>("/dsh/client/me/profile/preferences", {
    method: "PATCH",
    body: input,
    idempotencyKey: mutation.idempotencyKey,
    correlationId: mutation.correlationId,
    ...(input.expectedVersion !== undefined ? { expectedVersion: input.expectedVersion } : {}),
  });
  return resp.profile;
}

export async function upsertClientProfileConsents(
  input: ClientProfileConsentsInput,
  mutation: ClientProfileMutationContext,
): Promise<ClientProfile> {
  const resp = await request<{ profile: ClientProfile }>("/dsh/client/me/profile/consents", {
    method: "PATCH",
    body: input,
    idempotencyKey: mutation.idempotencyKey,
    correlationId: mutation.correlationId,
    ...(input.expectedVersion !== undefined ? { expectedVersion: input.expectedVersion } : {}),
  });
  return resp.profile;
}
