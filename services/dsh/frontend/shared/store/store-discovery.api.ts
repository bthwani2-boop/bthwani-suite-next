import type { paths } from "../../../clients/generated/dsh-api";
import { createDshFlexibleHttpClient } from "../_kernel/dsh-http-request";
import { toCardViewModel, toDetailViewModel } from "./store-discovery.view-model";
import type { DshStoreDetailDto } from "./store-discovery.types";
import {
  loadingState,
  errorState,
  serviceUnavailableState,
  successState,
  type DshStoreListState,
  type DshStoreDetailState,
} from "./store-discovery.states";
import { resolveDshApiBaseUrl, validateDshApiBaseUrl } from "../_kernel/dsh-api-base-url";

type ListDshStoresResponse =
  paths["/dsh/stores"]["get"]["responses"]["200"]["content"]["application/json"];
type GetDshStoreResponse =
  paths["/dsh/stores/{storeId}"]["get"]["responses"]["200"]["content"]["application/json"];

const DSH_API_BASE_URL = resolveDshApiBaseUrl();

const httpClient = validateDshApiBaseUrl(DSH_API_BASE_URL)
  ? createDshFlexibleHttpClient(DSH_API_BASE_URL)
  : null;

export { loadingState };

type StoreListResponse = ListDshStoresResponse;

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
    typeof value["isPopular"] === "boolean" &&
    typeof value["publicationEligible"] === "boolean"
  );
}

function hasRuntimeDetailContract(store: unknown): store is DshStoreDetailDto {
  if (!hasRuntimeCardContract(store)) return false;
  const value = store as unknown as Record<string, unknown>;
  return (
    typeof value["createdAt"] === "string" &&
    typeof value["updatedAt"] === "string" &&
    typeof value["addressLine"] === "string" &&
    typeof value["coverageSummary"] === "string" &&
    typeof value["operatingHours"] === "string" &&
    typeof value["deliveryReadiness"] === "string"
  );
}

export async function fetchStoreList(params?: {
  cityCode?: string;
  serviceAreaCode?: string;
  limit?: number;
  offset?: number;
}): Promise<DshStoreListState> {
  if (!httpClient) {
    return errorState(
      `API_CONFIG_ERROR: DSH API base URL is invalid ("${DSH_API_BASE_URL}"). ` +
      `Set EXPO_PUBLIC_DSH_API_BASE_URL (mobile) or NEXT_PUBLIC_DSH_API_BASE_URL (web) in your .env and restart.`,
    );
  }

  try {
    const query: Record<string, string | undefined> = {
      isVisible: String(true),
      limit: String(params?.limit ?? 20),
      offset: String(params?.offset ?? 0),
    };
    if (params?.cityCode !== undefined) query.cityCode = params.cityCode;
    if (params?.serviceAreaCode !== undefined) query.serviceAreaCode = params.serviceAreaCode;

    const response = await httpClient.request<ListDshStoresResponse>("/dsh/stores", { query });

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

export async function fetchStoreDetail(storeId: string): Promise<DshStoreDetailState> {
  if (!httpClient) {
    return {
      kind: "error",
      message: `API_CONFIG_ERROR: DSH API base URL is invalid ("${DSH_API_BASE_URL}").`,
    };
  }

  try {
    const response = await httpClient.request<GetDshStoreResponse>(
      `/dsh/stores/${encodeURIComponent(storeId)}`,
    );
    if (!response || !response.store) {
      return { kind: "error", message: "INVALID_RESPONSE: store detail missing" };
    }
    if (!hasRuntimeDetailContract(response.store)) {
      return {
        kind: "error",
        message: "INVALID_RESPONSE: governed store operational context is incomplete",
      };
    }
    return { kind: "success", store: toDetailViewModel(response.store) };
  } catch (err: unknown) {
    const listErr = classifyStoreDiscoveryError(err);
    if (listErr.kind === "service_unavailable") {
      return { kind: "service_unavailable" };
    }
    return { kind: "error", message: listErr.kind === "error" ? listErr.message : "unknown error" };
  }
}
