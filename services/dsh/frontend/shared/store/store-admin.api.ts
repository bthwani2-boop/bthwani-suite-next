import { createDshStoreClient } from "../../../clients/store-discovery-client";
import { resolveDshApiBaseUrl, validateDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
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
} from "./store-admin.view-model";

const DSH_ADMIN_API_BASE_URL = resolveDshApiBaseUrl();

const adminClient = validateDshApiBaseUrl(DSH_ADMIN_API_BASE_URL)
  ? createDshStoreClient(DSH_ADMIN_API_BASE_URL)
  : null;

export { adminLoadingState };

export async function fetchAdminStoreList(params?: {
  limit?: number;
  offset?: number;
}): Promise<DshStoreAdminListState> {
  if (!adminClient) {
    return adminErrorState(
      `API_CONFIG_ERROR: DSH API base URL is invalid ("${DSH_ADMIN_API_BASE_URL}"). ` +
      `Set NEXT_PUBLIC_DSH_API_BASE_URL in apps/control-panel/runtime/.env.local`,
    );
  }

  try {
    const response = await adminClient.listStores({
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
    });

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
  if (!adminClient) {
    return { kind: "error", message: "API_CONFIG_ERROR: DSH admin client not initialized" };
  }

  try {
    const response = await adminClient.getStore(storeId);
    if (!response || !response.store) {
      return { kind: "not_found" };
    }
    return { kind: "success", detail: toAdminDetail(response.store) };
  } catch (err: unknown) {
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
