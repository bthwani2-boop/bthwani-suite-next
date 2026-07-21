import { createDshFlexibleHttpClient } from "../_kernel/dsh-http-request";
import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl, validateDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type { OperatorStoreListResponse, OperatorStoreDetailResponse } from "./store-discovery.types";
import {
  toAdminTableRow,
  toAdminDetail,
  adminLoadingState,
  adminErrorState,
  adminServiceUnavailableState,
  adminPermissionDeniedState,
  adminSuccessState,
  type DshStoreAdminListState,
  type DshStoreAdminDetailState,
  type DshStorePublicationDiagnosticsState,
} from "./store-admin.view-model";

const DSH_ADMIN_API_BASE_URL = resolveDshApiBaseUrl();
const isBffMode = DSH_ADMIN_API_BASE_URL.startsWith("/");

const adminHttpClient = validateDshApiBaseUrl(DSH_ADMIN_API_BASE_URL)
  ? createDshFlexibleHttpClient(DSH_ADMIN_API_BASE_URL)
  : null;

export { adminLoadingState };

function adminToken(): string | undefined | null {
  return isBffMode ? undefined : getIdentityAccessToken();
}

export async function fetchAdminStoreList(params?: {
  limit?: number;
  offset?: number;
}): Promise<DshStoreAdminListState> {
  if (!adminHttpClient) {
    return adminErrorState(
      `API_CONFIG_ERROR: DSH API base URL is invalid ("${DSH_ADMIN_API_BASE_URL}"). ` +
      `Set NEXT_PUBLIC_DSH_API_BASE_URL in apps/control-panel/runtime/.env.local`,
    );
  }
  const token = adminToken();
  if (!isBffMode && token === null) return adminPermissionDeniedState(401);

  try {
    const response = await adminHttpClient.request<OperatorStoreListResponse>(
      "/dsh/operator/stores",
      { ...(token ? { token } : {}) },
    );

    if (!response || !Array.isArray(response.stores)) {
      return adminErrorState("INVALID_RESPONSE: stores array missing");
    }

    const rows = response.stores.map(toAdminTableRow);
    return adminSuccessState(
      rows,
      response.pagination.total,
      response.pagination.limit,
      response.pagination.offset,
    );
  } catch (err: unknown) {
    return classifyAdminError(err);
  }
}

export async function fetchAdminStoreDetail(
  storeId: string,
): Promise<DshStoreAdminDetailState> {
  if (!adminHttpClient) {
    return { kind: "error", message: "API_CONFIG_ERROR: DSH admin client not initialized" };
  }
  const token = adminToken();
  if (!isBffMode && token === null) return { kind: "permission_denied", statusCode: 401 };

  try {
    const response = await adminHttpClient.request<OperatorStoreDetailResponse>(
      `/dsh/operator/stores/${encodeURIComponent(storeId)}`,
      { ...(token ? { token } : {}) },
    );
    if (!response || !response.store) {
      return { kind: "not_found" };
    }
    return { kind: "success", detail: toAdminDetail(response.store) };
  } catch (err: unknown) {
    return classifyAdminDetailError(err);
  }
}

export async function fetchAdminStorePublicationDiagnostics(
  storeId: string,
): Promise<DshStorePublicationDiagnosticsState> {
  if (!adminHttpClient) {
    return { kind: "error", message: "API_CONFIG_ERROR: DSH admin client not initialized" };
  }
  const token = adminToken();
  if (!isBffMode && token === null) return { kind: "permission_denied", statusCode: 401 };

  try {
    const response = await adminHttpClient.request<unknown>(
      `/dsh/operator/diagnostics/stores/${encodeURIComponent(storeId)}`,
      { ...(token ? { token } : {}) },
    );
    if (response === null || typeof response !== "object") {
      return { kind: "error", message: "INVALID_RESPONSE: diagnostics object missing" };
    }
    const value = response as Record<string, unknown>;
    if (
      typeof value.isReady !== "boolean" ||
      !Array.isArray(value.blockers) ||
      !value.blockers.every((blocker) => typeof blocker === "string")
    ) {
      return { kind: "error", message: "INVALID_RESPONSE: publication diagnostics contract mismatch" };
    }
    if (value.isReady && value.blockers.length > 0) {
      return { kind: "error", message: "INVALID_RESPONSE: ready diagnostics cannot contain blockers" };
    }
    return { kind: "success", isReady: value.isReady, blockers: value.blockers };
  } catch (err: unknown) {
    return classifyAdminDiagnosticsError(err);
  }
}

function classifyAdminDetailError(err: unknown): DshStoreAdminDetailState {
  if (err !== null && typeof err === "object" && "kind" in err) {
    const typed = err as { kind: string; status?: number; message?: string };
    if (typed.kind === "http") {
      if (typed.status === 404) return { kind: "not_found" };
      if (typed.status === 401) return { kind: "permission_denied", statusCode: 401 };
      if (typed.status === 403) return { kind: "permission_denied", statusCode: 403 };
      return { kind: "error", message: `HTTP_STATUS: ${typed.status ?? "unknown"}` };
    }
    if (typed.kind === "network") {
      return { kind: "error", message: `NETWORK_ERROR: ${typed.message ?? "unknown"}` };
    }
  }
  const errMsg = err instanceof Error ? err.message : String(err);
  return { kind: "error", message: `FETCH_ERROR: ${errMsg}` };
}

function classifyAdminDiagnosticsError(err: unknown): DshStorePublicationDiagnosticsState {
  const detail = classifyAdminDetailError(err);
  if (detail.kind === "not_found") return detail;
  if (detail.kind === "permission_denied") return detail;
  if (detail.kind === "error") return detail;
  return { kind: "error", message: "UNKNOWN_DIAGNOSTICS_ERROR" };
}

function classifyAdminError(err: unknown): DshStoreAdminListState {
  if (err !== null && typeof err === "object" && "kind" in err) {
    const typed = err as { kind: string; status?: number; message?: string };
    if (typed.kind === "http") {
      if (typed.status === 503) return adminServiceUnavailableState();
      if (typed.status === 401) return adminPermissionDeniedState(401);
      if (typed.status === 403) return adminPermissionDeniedState(403);
      return adminErrorState(`HTTP_STATUS: ${typed.status ?? "unknown"}`);
    }
    if (typed.kind === "network") {
      const msg = typed.message ?? "";
      if (msg.includes("ECONNREFUSED") || msg.includes("connect")) {
        return adminServiceUnavailableState();
      }
      return adminErrorState(`NETWORK_ERROR: ${msg}`);
    }
  }
  const errMsg = err instanceof Error ? err.message : String(err);
  return adminErrorState(`FETCH_ERROR: ${errMsg}`);
}
