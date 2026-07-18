import { getIdentityAccessToken } from "@bthwani/core-identity";
import {
  createDshFlexibleHttpClient,
  type DshMutationAuth,
} from "../_kernel/dsh-http-request";
import { resolveDshApiBaseUrl, validateDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import {
  type StoreRoleAction,
  type GetDshStoreContextResponse,
  type StoreActionResponse,
} from "./store-discovery.types";
import { toAdminDetail } from "./store-admin.view-model";
import type { StoreRoleContextState } from "./store-role-context.controller-core";

const baseUrl = resolveDshApiBaseUrl();
const isBffMode = baseUrl.startsWith("/");
const httpClient = validateDshApiBaseUrl(baseUrl) ? createDshFlexibleHttpClient(baseUrl) : null;

export async function fetchStoreRoleContext(storeId?: string): Promise<StoreRoleContextState> {
  const token = isBffMode ? undefined : getIdentityAccessToken();
  if (!isBffMode && token === null) {
    return { kind: "permission_denied", statusCode: 401 };
  }
  if (httpClient === null) {
    return { kind: "error", message: "API_CONFIG_ERROR" };
  }
  try {
    const response = await httpClient.request<GetDshStoreContextResponse>("/dsh/store-context", {
      ...(token ? { token } : {}),
      ...(storeId ? { query: { storeId } } : {}),
    });
    return {
      kind: "success",
      actorRole: response.actorRole,
      scope: response.scope,
      store: toAdminDetail(response.store),
      latestAction: response.latestAction ?? null,
    };
  } catch (error) {
    return classifyRoleError(error);
  }
}

export async function submitStoreRoleAction(
  action: StoreRoleAction,
  auth: DshMutationAuth,
): Promise<StoreActionResponse> {
  const accessToken = isBffMode ? undefined : getIdentityAccessToken();
  if ((!isBffMode && accessToken === null) || httpClient === null) {
    throw { kind: "http", status: 401 };
  }
  const governedAuth: DshMutationAuth = {
    ...(accessToken ? { accessToken } : {}),
    idempotencyKey: auth.idempotencyKey,
    correlationId: auth.correlationId,
  };
  switch (action.kind) {
    case "partner":
      return httpClient.request<StoreActionResponse>(
        `/dsh/partner/stores/${encodeURIComponent(action.storeId)}/settings`,
        { method: "PATCH", body: action.input, auth: governedAuth },
      );
    case "field":
      return httpClient.request<StoreActionResponse>(
        `/dsh/field/stores/${encodeURIComponent(action.storeId)}/verifications`,
        { method: "POST", body: action.input, auth: governedAuth },
      );
    case "captain":
      return httpClient.request<StoreActionResponse>(
        `/dsh/captain/stores/${encodeURIComponent(action.storeId)}/pickup-readiness`,
        { method: "POST", body: action.input, auth: governedAuth },
      );
    case "operator":
      return httpClient.request<StoreActionResponse>(
        `/dsh/operator/stores/${encodeURIComponent(action.storeId)}/governance`,
        { method: "POST", body: action.input, auth: governedAuth },
      );
  }
}

export function classifyRoleError(error: unknown): StoreRoleContextState {
  if (error !== null && typeof error === "object" && "kind" in error) {
    const typed = error as { kind: string; status?: number; message?: string };
    if (typed.kind === "http") {
      if (typed.status === 401 || typed.status === 403) {
        return { kind: "permission_denied", statusCode: typed.status };
      }
      if (typed.status === 404) return { kind: "empty" };
      if (typed.status === 503) return { kind: "service_unavailable" };
      return { kind: "error", message: `HTTP_${typed.status ?? "UNKNOWN"}` };
    }
    if (typed.kind === "network") {
      return { kind: "service_unavailable" };
    }
  }
  return { kind: "error", message: error instanceof Error ? error.message : "UNKNOWN_ERROR" };
}
