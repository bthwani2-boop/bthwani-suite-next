import { createDshStoreClient } from "../../../clients/store-discovery-client";
import { toCardViewModel } from "./store-discovery.view-model";
import {
  loadingState,
  errorState,
  serviceUnavailableState,
  successState,
  type DshStoreListState,
} from "./store-discovery.states";

const DSH_API_BASE_URL =
  process.env.EXPO_PUBLIC_DSH_API_BASE_URL ?? "http://localhost:58080";

// Guard: reject URLs that are obviously broken (no host — e.g. "http://").
// This happens when EXPO_PUBLIC_DSH_API_BASE_URL is set to just the scheme.
function isValidBaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

const client = isValidBaseUrl(DSH_API_BASE_URL)
  ? createDshStoreClient(DSH_API_BASE_URL)
  : null;

export { loadingState };

export async function fetchStoreList(params?: {
  cityCode?: string;
  serviceAreaCode?: string;
  limit?: number;
  offset?: number;
}): Promise<DshStoreListState> {
  if (!client) {
    return errorState(
      `API_CONFIG_ERROR: EXPO_PUBLIC_DSH_API_BASE_URL is invalid ("${DSH_API_BASE_URL}"). ` +
      `Set it to your machine LAN IP in apps/app-client/runtime/.env and restart Metro.`,
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
