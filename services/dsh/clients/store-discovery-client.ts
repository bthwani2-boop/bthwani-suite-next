import type { paths } from "./generated/dsh-api.js";

type ListDshStoresParams =
  paths["/dsh/stores"]["get"]["parameters"]["query"];

type ListDshStoresResponse =
  paths["/dsh/stores"]["get"]["responses"]["200"]["content"]["application/json"];

type GetDshStoreResponse =
  paths["/dsh/stores/{storeId}"]["get"]["responses"]["200"]["content"]["application/json"];

export type DshStoreClientError =
  | { readonly kind: "http"; readonly status: number; readonly body: string }
  | { readonly kind: "network"; readonly message: string };

export type DshStoreClient = {
  listStores(
    params?: ListDshStoresParams,
  ): Promise<ListDshStoresResponse>;
  getStore(storeId: string): Promise<GetDshStoreResponse>;
};

export function createDshStoreClient(baseUrl: string): DshStoreClient {
  async function request<T>(path: string, query?: Record<string, string>): Promise<T> {
    const url = new URL(path, baseUrl);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) url.searchParams.set(k, v);
      }
    }

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "network error";
      throw { kind: "network", message } satisfies DshStoreClientError;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw { kind: "http", status: res.status, body } satisfies DshStoreClientError;
    }

    return res.json() as Promise<T>;
  }

  return {
    listStores(params) {
      const query: Record<string, string> = {};
      if (params?.cityCode !== undefined) query["cityCode"] = params.cityCode;
      if (params?.serviceAreaCode !== undefined) query["serviceAreaCode"] = params.serviceAreaCode;
      if (params?.status !== undefined) query["status"] = params.status;
      if (params?.isVisible !== undefined) query["isVisible"] = String(params.isVisible);
      if (params?.limit !== undefined) query["limit"] = String(params.limit);
      if (params?.offset !== undefined) query["offset"] = String(params.offset);
      return request<ListDshStoresResponse>("/dsh/stores", query);
    },

    getStore(storeId) {
      return request<GetDshStoreResponse>(`/dsh/stores/${encodeURIComponent(storeId)}`);
    },
  };
}
