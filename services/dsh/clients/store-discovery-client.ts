import type { paths } from "./generated/dsh-api.js";
import { createDshFlexibleHttpClient, type DshMutationAuth } from "../frontend/shared/_kernel/dsh-http-request";

type ListDshStoresParams =
  paths["/dsh/stores"]["get"]["parameters"]["query"];

type ListDshStoresResponse =
  paths["/dsh/stores"]["get"]["responses"]["200"]["content"]["application/json"];

type GetDshStoreResponse =
  paths["/dsh/stores/{storeId}"]["get"]["responses"]["200"]["content"]["application/json"];
export type GetDshStoreContextResponse =
  paths["/dsh/store-context"]["get"]["responses"]["200"]["content"]["application/json"];
export type StoreActionResponse =
  paths["/dsh/partner/stores/{storeId}/settings"]["patch"]["responses"]["200"]["content"]["application/json"];
export type PartnerStoreSettingsRequest =
  paths["/dsh/partner/stores/{storeId}/settings"]["patch"]["requestBody"]["content"]["application/json"];
export type FieldStoreVerificationRequest =
  paths["/dsh/field/stores/{storeId}/verifications"]["post"]["requestBody"]["content"]["application/json"];
export type CaptainPickupReadinessRequest =
  paths["/dsh/captain/stores/{storeId}/pickup-readiness"]["post"]["requestBody"]["content"]["application/json"];
export type OperatorStoreGovernanceRequest =
  paths["/dsh/operator/stores/{storeId}/governance"]["post"]["requestBody"]["content"]["application/json"];
export type StoreAuditResponse =
  paths["/dsh/operator/stores/{storeId}/audit"]["get"]["responses"]["200"]["content"]["application/json"];
export type OperatorStoreListResponse =
  paths["/dsh/operator/stores"]["get"]["responses"]["200"]["content"]["application/json"];
export type OperatorStoreDetailResponse =
  paths["/dsh/operator/stores/{storeId}"]["get"]["responses"]["200"]["content"]["application/json"];

type DshStoreClientError =
  | { readonly kind: "http"; readonly status: number; readonly body: string }
  | { readonly kind: "network"; readonly message: string };

export type DshStoreClient = {
  listStores(
    params?: ListDshStoresParams,
  ): Promise<ListDshStoresResponse>;
  getStore(storeId: string): Promise<GetDshStoreResponse>;
  getStoreContext(accessToken: string): Promise<GetDshStoreContextResponse>;
  updatePartnerSettings(
    storeId: string,
    body: PartnerStoreSettingsRequest,
    auth: MutationAuth,
  ): Promise<StoreActionResponse>;
  submitFieldVerification(
    storeId: string,
    body: FieldStoreVerificationRequest,
    auth: MutationAuth,
  ): Promise<StoreActionResponse>;
  reportCaptainReadiness(
    storeId: string,
    body: CaptainPickupReadinessRequest,
    auth: MutationAuth,
  ): Promise<StoreActionResponse>;
  governStore(
    storeId: string,
    body: OperatorStoreGovernanceRequest,
    auth: MutationAuth,
  ): Promise<StoreActionResponse>;
  listStoreAudit(storeId: string, accessToken: string): Promise<StoreAuditResponse>;
  listOperatorStores(accessToken: string): Promise<OperatorStoreListResponse>;
  getOperatorStore(storeId: string, accessToken: string): Promise<OperatorStoreDetailResponse>;
};

export type MutationAuth = DshMutationAuth;

export function createDshStoreClient(baseUrl: string): DshStoreClient {
  const httpClient = createDshFlexibleHttpClient(baseUrl);
  function request<T>(
    path: string,
    input?: {
      readonly method?: "GET" | "POST" | "PATCH";
      readonly query?: Record<string, string>;
      readonly token?: string;
      readonly auth?: MutationAuth;
      readonly body?: unknown;
    },
  ): Promise<T> {
    return httpClient.request<T>(path, input);
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
      return request<ListDshStoresResponse>("/dsh/stores", { query });
    },

    getStore(storeId) {
      return request<GetDshStoreResponse>(`/dsh/stores/${encodeURIComponent(storeId)}`);
    },
    getStoreContext(accessToken) {
      return request<GetDshStoreContextResponse>("/dsh/store-context", { token: accessToken });
    },
    updatePartnerSettings(storeId, body, auth) {
      return request<StoreActionResponse>(
        `/dsh/partner/stores/${encodeURIComponent(storeId)}/settings`,
        { method: "PATCH", body, auth },
      );
    },
    submitFieldVerification(storeId, body, auth) {
      return request<StoreActionResponse>(
        `/dsh/field/stores/${encodeURIComponent(storeId)}/verifications`,
        { method: "POST", body, auth },
      );
    },
    reportCaptainReadiness(storeId, body, auth) {
      return request<StoreActionResponse>(
        `/dsh/captain/stores/${encodeURIComponent(storeId)}/pickup-readiness`,
        { method: "POST", body, auth },
      );
    },
    governStore(storeId, body, auth) {
      return request<StoreActionResponse>(
        `/dsh/operator/stores/${encodeURIComponent(storeId)}/governance`,
        { method: "POST", body, auth },
      );
    },
    listStoreAudit(storeId, accessToken) {
      return request<StoreAuditResponse>(
        `/dsh/operator/stores/${encodeURIComponent(storeId)}/audit`,
        { token: accessToken },
      );
    },
    listOperatorStores(accessToken) {
      return request<OperatorStoreListResponse>("/dsh/operator/stores", { token: accessToken });
    },
    getOperatorStore(storeId, accessToken) {
      return request<OperatorStoreDetailResponse>(
        `/dsh/operator/stores/${encodeURIComponent(storeId)}`,
        { token: accessToken },
      );
    },
  };
}
