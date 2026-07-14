import { createDshHttpClient } from "../_kernel/dsh-http-request";
import { resolveProvidersApiBaseUrl } from "../_kernel/providers-api-base-url";
import type { components } from "@bthwani/core-providers";

export type ExternalProvider = components["schemas"]["ExternalProvider"];
export type ExternalProviderHealthItem = components["schemas"]["ExternalProviderHealthItem"];
export type ExternalProviderHealthResponse = components["schemas"]["ExternalProviderHealthResponse"];

const { request } = createDshHttpClient(resolveProvidersApiBaseUrl(), "providers", 10000);

export function listProviders(): Promise<ExternalProvider[]> {
  return request<ExternalProvider[]>("/providers", { method: "GET" });
}

export function getProviderHealth(): Promise<ExternalProviderHealthResponse> {
  return request<ExternalProviderHealthResponse>("/providers/health", { method: "GET" });
}
