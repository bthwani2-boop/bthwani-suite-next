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

type StoreListResponse = Awaited<ReturnType<NonNullable<typeof client>["listStores"]>>;

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

    return normalizeStoreListResponse(response);
  } catch (err: unknown) {
    return classifyStoreDiscoveryError(err);
  }
}

export function normalizeStoreListResponse(
  response: StoreListResponse | null | undefined,
): DshStoreListState {
  if (!response || !Array.isArray(response.stores)) {
    return errorState("INVALID_RESPONSE: stores array missing");
  }
  if (!response.stores.every(hasRuntimeCardContract)) {
    return errorState("INVALID_RESPONSE: store card contract is incomplete");
  }

  const viewModels = response.stores.map(toCardViewModel);
  return successState(
    viewModels,
    response.pagination.total,
    response.pagination.limit,
    response.pagination.offset,
  );
}

export function classifyStoreDiscoveryError(err: unknown): DshStoreListState {
  if (err !== null && typeof err === "object" && "kind" in err) {
    const typed = err as { kind: string; status?: number; message?: string };
    if (typed.kind === "http") {
      if (typed.status === 503) return serviceUnavailableState();
      return errorState(`HTTP_STATUS: ${typed.status ?? "unknown"}`);
    }
    if (typed.kind === "network") {
      return serviceUnavailableState();
    }
    return errorState(`API_ERROR: ${typed.message ?? "unknown error"}`);
  }

  const errMsg = err instanceof Error ? err.message : String(err);
  if (errMsg.includes("toFixed") || errMsg.includes("is not a function")) {
    return errorState("INVALID_RESPONSE: numeric type mismatch in API response");
  }
  return errorState(`UNEXPECTED_ERROR: ${errMsg}`);
}
