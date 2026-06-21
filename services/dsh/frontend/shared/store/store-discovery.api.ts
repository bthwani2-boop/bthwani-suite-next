import { createDshStoreClient } from "../../../clients/store-discovery-client";
import { toCardViewModel } from "./store-discovery.view-model";
import {
  loadingState,
  errorState,
  serviceUnavailableState,
  successState,
  type DshStoreListState,
} from "./store-discovery.states";
import { resolveDshApiBaseUrl, validateDshApiBaseUrl } from "../_kernel/dsh-api-base-url";

const DSH_API_BASE_URL = resolveDshApiBaseUrl();

const client = validateDshApiBaseUrl(DSH_API_BASE_URL)
  ? createDshStoreClient(DSH_API_BASE_URL)
  : null;

export { loadingState };

function hasRuntimeCardContract(
  store: unknown,
): store is Parameters<typeof toCardViewModel>[0] {
  if (store === null || typeof store !== "object") return false;
  const value = store as Record<string, unknown>;
  return (
    typeof value["id"] === "string" &&
    typeof value["displayName"] === "string" &&
    typeof value["category"] === "string" &&
    Array.isArray(value["deliveryModes"]) &&
    typeof value["isFreeDelivery"] === "boolean" &&
    typeof value["followerCount"] === "number" &&
    typeof value["hasProBadge"] === "boolean" &&
    typeof value["hasCouponBadge"] === "boolean" &&
    typeof value["isPopular"] === "boolean"
  );
}

export async function fetchStoreList(params?: {
  cityCode?: string;
  serviceAreaCode?: string;
  limit?: number;
  offset?: number;
}): Promise<DshStoreListState> {
  if (!client) {
    return errorState(
      `API_CONFIG_ERROR: DSH API base URL is invalid ("${DSH_API_BASE_URL}"). ` +
      `Set EXPO_PUBLIC_DSH_API_BASE_URL (mobile) or NEXT_PUBLIC_DSH_API_BASE_URL (web) in your .env and restart.`,
    );
  }

  try {
    const listParams: Parameters<typeof client.listStores>[0] = {
      isVisible: true,
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
    };
    if (params?.cityCode !== undefined) listParams.cityCode = params.cityCode;
    if (params?.serviceAreaCode !== undefined) listParams.serviceAreaCode = params.serviceAreaCode;

    const response = await client.listStores(listParams);

    if (!response || !Array.isArray(response.stores)) {
      return errorState("INVALID_RESPONSE: stores array missing");
    }
    if (!response.stores.every(hasRuntimeCardContract)) {
      return errorState("INVALID_RESPONSE: store card contract is incomplete");
    }

    if (response.stores.length === 0 && (params?.offset ?? 0) === 0) {
      return errorState("SEED_MISSING: no stores returned — database may not be seeded");
    }

    const viewModels = response.stores.map(toCardViewModel);
    return successState(
      viewModels,
      response.pagination.total,
      response.pagination.limit,
      response.pagination.offset,
    );
  } catch (err: unknown) {
    if (
      err !== null &&
      typeof err === "object" &&
      "kind" in err
    ) {
      const typed = err as { kind: string; status?: number; message?: string; body?: string };
      if (typed.kind === "http") {
        if (typed.status === 503) return serviceUnavailableState();
        if (typed.status === 401 || typed.status === 403) {
          return errorState(`AUTH_MISSING: HTTP ${typed.status ?? "unknown"}`);
        }
        return errorState(`HTTP_STATUS: ${typed.status ?? "unknown"}`);
      }
      if (typed.kind === "network") {
        const msg = typed.message ?? "";
        if (msg.includes("ECONNREFUSED") || msg.includes("connect")) {
          return errorState("DOCKER_RUNTIME_NOT_READY: API not reachable");
        }
        return errorState(`NETWORK_ERROR: ${msg}`);
      }
      return errorState(`API_NOT_REACHABLE: ${typed.message ?? "unknown error"}`);
    }

    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes("toFixed") || errMsg.includes("is not a function")) {
      return errorState("INVALID_RESPONSE: numeric type mismatch in API response");
    }
    return errorState(`NETWORK_ERROR: ${errMsg}`);
  }
}
