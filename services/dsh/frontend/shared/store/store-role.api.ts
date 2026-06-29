import { getIdentityAccessToken } from "@bthwani/core-identity";
import {
  createDshStoreClient,
  type CaptainPickupReadinessRequest,
  type FieldStoreVerificationRequest,
  type OperatorStoreGovernanceRequest,
  type PartnerStoreSettingsRequest,
  type StoreActionResponse,
} from "../../../clients/store-discovery-client";

import { resolveDshApiBaseUrl, validateDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { type StoreRoleAction } from "./store-discovery.types";
import { toAdminDetail } from "./store-admin.view-model";
import type { StoreRoleContextState } from "./store-role-context.controller-core";

const baseUrl = resolveDshApiBaseUrl();
const client = validateDshApiBaseUrl(baseUrl) ? createDshStoreClient(baseUrl) : null;

export async function fetchStoreRoleContext(): Promise<StoreRoleContextState> {
  const token = getIdentityAccessToken();
  if (token === null) {
    return { kind: "permission_denied", statusCode: 401 };
  }
  if (client === null) {
    return { kind: "error", message: "API_CONFIG_ERROR" };
  }
  try {
    const response = await client.getStoreContext(token);
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


export async function submitStoreRoleAction(action: StoreRoleAction): Promise<StoreActionResponse> {
  const accessToken = getIdentityAccessToken();
  if (accessToken === null || client === null) {
    throw { kind: "http", status: 401 };
  }
  const auth = {
    accessToken,
    idempotencyKey: createRequestId("idem"),
    correlationId: createRequestId("corr"),
  };
  switch (action.kind) {
    case "partner":
      return client.updatePartnerSettings(action.storeId, action.input, auth);
    case "field":
      return client.submitFieldVerification(action.storeId, action.input, auth);
    case "captain":
      return client.reportCaptainReadiness(action.storeId, action.input, auth);
    case "operator":
      return client.governStore(action.storeId, action.input, auth);
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

function createRequestId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${prefix}-${random}`;
}
