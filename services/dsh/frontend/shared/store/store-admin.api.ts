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
  type DshStoreAuditEvent,
  type DshStoreAuditState,
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

function buildOperatorStoreListPath(params?: {
  readonly limit?: number;
  readonly offset?: number;
}): string {
  const query = new URLSearchParams();
  if (params?.limit !== undefined) query.set("limit", String(params.limit));
  if (params?.offset !== undefined) query.set("offset", String(params.offset));
  const encoded = query.toString();
  return encoded.length > 0 ? `/dsh/operator/stores?${encoded}` : "/dsh/operator/stores";
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
      buildOperatorStoreListPath(params),
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
  } catch (error: unknown) {
    return classifyAdminError(error);
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
  } catch (error: unknown) {
    return classifyAdminDetailError(error);
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
  } catch (error: unknown) {
    return classifyAdminDiagnosticsError(error);
  }
}

function toAuditEvent(value: unknown): DshStoreAuditEvent | null {
  if (value === null || typeof value !== "object") return null;
  const event = value as Record<string, unknown>;
  const fromState = event.fromState;
  const toState = event.toState;
  if (
    typeof event.id !== "string" ||
    typeof event.actorId !== "string" ||
    typeof event.actorRole !== "string" ||
    typeof event.storeId !== "string" ||
    typeof event.action !== "string" ||
    fromState === null || typeof fromState !== "object" || Array.isArray(fromState) ||
    toState === null || typeof toState !== "object" || Array.isArray(toState) ||
    typeof event.reason !== "string" ||
    typeof event.correlationId !== "string" ||
    typeof event.createdAt !== "string"
  ) {
    return null;
  }
  return {
    id: event.id,
    actorId: event.actorId,
    actorRole: event.actorRole,
    storeId: event.storeId,
    action: event.action,
    fromState: fromState as Readonly<Record<string, unknown>>,
    toState: toState as Readonly<Record<string, unknown>>,
    reason: event.reason,
    correlationId: event.correlationId,
    createdAt: event.createdAt,
  };
}

export async function fetchAdminStoreAudit(storeId: string): Promise<DshStoreAuditState> {
  if (!adminHttpClient) {
    return { kind: "error", message: "API_CONFIG_ERROR: DSH admin client not initialized" };
  }
  const token = adminToken();
  if (!isBffMode && token === null) return { kind: "permission_denied", statusCode: 401 };

  try {
    const response = await adminHttpClient.request<unknown>(
      `/dsh/operator/stores/${encodeURIComponent(storeId)}/audit`,
      { ...(token ? { token } : {}) },
    );
    if (response === null || typeof response !== "object") {
      return { kind: "error", message: "INVALID_RESPONSE: audit object missing" };
    }
    const value = response as Record<string, unknown>;
    if (!Array.isArray(value.events)) {
      return { kind: "error", message: "INVALID_RESPONSE: audit events missing" };
    }
    const events = value.events.map(toAuditEvent);
    if (events.some((event) => event === null)) {
      return { kind: "error", message: "INVALID_RESPONSE: audit event contract mismatch" };
    }
    return { kind: "success", events: events as DshStoreAuditEvent[] };
  } catch (error: unknown) {
    return classifyAdminAuditError(error);
  }
}

function classifyAdminDetailError(error: unknown): DshStoreAdminDetailState {
  if (error !== null && typeof error === "object" && "kind" in error) {
    const typed = error as { kind: string; status?: number; message?: string };
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
  const errorMessage = error instanceof Error ? error.message : String(error);
  return { kind: "error", message: `FETCH_ERROR: ${errorMessage}` };
}

function classifyAdminDiagnosticsError(error: unknown): DshStorePublicationDiagnosticsState {
  const detail = classifyAdminDetailError(error);
  if (detail.kind === "not_found") return detail;
  if (detail.kind === "permission_denied") return detail;
  if (detail.kind === "error") return detail;
  return { kind: "error", message: "UNKNOWN_DIAGNOSTICS_ERROR" };
}

function classifyAdminAuditError(error: unknown): DshStoreAuditState {
  const detail = classifyAdminDetailError(error);
  if (detail.kind === "not_found") return detail;
  if (detail.kind === "permission_denied") return detail;
  if (detail.kind === "error") return detail;
  return { kind: "error", message: "UNKNOWN_AUDIT_ERROR" };
}

function classifyAdminError(error: unknown): DshStoreAdminListState {
  if (error !== null && typeof error === "object" && "kind" in error) {
    const typed = error as { kind: string; status?: number; message?: string };
    if (typed.kind === "http") {
      if (typed.status === 503) return adminServiceUnavailableState();
      if (typed.status === 401) return adminPermissionDeniedState(401);
      if (typed.status === 403) return adminPermissionDeniedState(403);
      return adminErrorState(`HTTP_STATUS: ${typed.status ?? "unknown"}`);
    }
    if (typed.kind === "network") {
      const message = typed.message ?? "";
      if (message.includes("ECONNREFUSED") || message.includes("connect")) {
        return adminServiceUnavailableState();
      }
      return adminErrorState(`NETWORK_ERROR: ${message}`);
    }
  }
  const errorMessage = error instanceof Error ? error.message : String(error);
  return adminErrorState(`FETCH_ERROR: ${errorMessage}`);
}
