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
  typeof process !== "undefined"
    ? (process.env["DSH_API_BASE_URL"] ?? "http://localhost:58080")
    : "http://localhost:58080";

const client = createDshStoreClient(DSH_API_BASE_URL);

export { loadingState };

export async function fetchStoreList(params?: {
  cityCode?: string;
  serviceAreaCode?: string;
  limit?: number;
  offset?: number;
}): Promise<DshStoreListState> {
  try {
    const listParams: Parameters<typeof client.listStores>[0] = {
      isVisible: true,
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
    };
    if (params?.cityCode !== undefined) listParams.cityCode = params.cityCode;
    if (params?.serviceAreaCode !== undefined) listParams.serviceAreaCode = params.serviceAreaCode;

    const response = await client.listStores(listParams);

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
      const typed = err as { kind: string; status?: number; message?: string };
      if (typed.kind === "http" && typed.status === 503) {
        return serviceUnavailableState();
      }
      if (typed.kind === "network") {
        return serviceUnavailableState();
      }
      return errorState(`Request failed (${typed.status ?? "unknown"})`);
    }
    return errorState("Unexpected error");
  }
}
