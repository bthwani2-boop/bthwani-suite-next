import { createDshHttpClient } from "../_kernel/dsh-http-request";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type { operations } from "../../../clients/generated/dsh-api";
import type {
  ClientProfile,
  ClientProfilePreferencesInput,
  ClientProfileConsentsInput,
} from "./client-profile.types";
import type { ClientProfileMutationContext } from "./client-profile-mutation-attempt";

// For client-facing operations, use standard client session.
const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "dsh-client-profile");

type ClientProfileReadResponse =
  operations["get_dsh_client_me_profile"]["responses"][200]["content"]["application/json"];
type ClientProfilePreferencesResponse =
  operations["patch_dsh_client_me_profile_preferences"]["responses"][200]["content"]["application/json"];
type ClientProfileConsentsResponse =
  operations["patch_dsh_client_me_profile_consents"]["responses"][200]["content"]["application/json"];

export async function fetchClientProfile(): Promise<ClientProfile> {
  const resp = await request<ClientProfileReadResponse>("/dsh/client/me/profile");
  return resp.profile;
}

export async function upsertClientProfilePreferences(
  input: ClientProfilePreferencesInput,
  mutation: ClientProfileMutationContext,
): Promise<ClientProfile> {
  const resp = await request<ClientProfilePreferencesResponse>("/dsh/client/me/profile/preferences", {
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
  const resp = await request<ClientProfileConsentsResponse>("/dsh/client/me/profile/consents", {
    method: "PATCH",
    body: input,
    idempotencyKey: mutation.idempotencyKey,
    correlationId: mutation.correlationId,
    ...(input.expectedVersion !== undefined ? { expectedVersion: input.expectedVersion } : {}),
  });
  return resp.profile;
}
